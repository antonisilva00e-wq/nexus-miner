const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { generateId, paginate } = require('../utils/helpers');
const { lookupCNPJ, lookupCPF, isValidCPF, searchNearbyBusinesses, mineLeads, generateValidCNPJ, generateIndividualPeople } = require('../services/leadService');
const { invalidateCache } = require('../services/scoringService');

const router = express.Router();
router.use(authenticate);

// GET /api/leads - List leads with filters
router.get('/', (req, res) => {
  const { status, pipeline_stage, assigned_to, city, state, source, search, page = 1, limit = 50, sort = 'created_at', order = 'DESC' } = req.query;
  const p = paginate(page, parseInt(limit));
  const params = [];
  const conditions = [];

  // Sellers only see their own leads
  if (req.user.role === 'seller') {
    conditions.push('l.assigned_to = ?');
    params.push(req.user.id);
  }

  if (status) { conditions.push('l.status = ?'); params.push(status); }
  if (pipeline_stage) { conditions.push('l.pipeline_stage = ?'); params.push(pipeline_stage); }
  if (assigned_to) { conditions.push('l.assigned_to = ?'); params.push(assigned_to); }
  if (city) { conditions.push('l.city LIKE ?'); params.push(`%${city}%`); }
  if (state) { conditions.push('l.state LIKE ?'); params.push(`%${state}%`); }
  if (source) { conditions.push('l.source = ?'); params.push(source); }
  if (search) {
    conditions.push('(l.name LIKE ? OR l.cnpj LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.activity LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const allowedSorts = ['created_at', 'name', 'rating', 'status', 'updated_at'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM leads l ${where}`).get(...params);
  const leads = db.prepare(`SELECT l.*, u.name as assigned_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id ${where} ORDER BY l.${sortCol} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, p.limit, p.offset);

  res.json({ leads, total: countRow.total, page: p.page, limit: p.limit });
});

// GET /api/leads/stats
router.get('/stats', (req, res) => {
  const baseWhere = req.user.role === 'seller' ? 'WHERE assigned_to = ?' : '';
  const params = req.user.role === 'seller' ? [req.user.id] : [];

  const total = db.prepare(`SELECT COUNT(*) as count FROM leads ${baseWhere}`).get(...params).count;
  const byStatus = db.prepare(`SELECT status, COUNT(*) as count FROM leads ${baseWhere} GROUP BY status`).all(...params);
  const byPipeline = db.prepare(`SELECT pipeline_stage, COUNT(*) as count FROM leads ${baseWhere} GROUP BY pipeline_stage`).all(...params);
  const byCity = db.prepare(`SELECT city, COUNT(*) as count FROM leads ${baseWhere} GROUP BY city ORDER BY count DESC LIMIT 10`).all(...params);
  const thisMonth = db.prepare(`SELECT COUNT(*) as count FROM leads ${baseWhere ? baseWhere + ' AND' : 'WHERE'} created_at >= date('now', 'start of month')`).get(...params).count;

  res.json({ total, byStatus, byPipeline, byCity, thisMonth });
});

// GET /api/leads/:id
router.get('/:id', (req, res) => {
  const lead = db.prepare('SELECT l.*, u.name as assigned_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE l.id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  if (req.user.role === 'seller' && lead.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'Sem acesso a este lead' });
  }
  const notes = db.prepare('SELECT n.*, u.name as user_name FROM lead_notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.lead_id = ? ORDER BY n.created_at DESC').all(req.params.id);
  const tags = db.prepare('SELECT t.* FROM tags t JOIN lead_tags lt ON t.id = lt.tag_id WHERE lt.lead_id = ?').all(req.params.id);
  res.json({ lead: { ...lead, notes, tags } });
});

// POST /api/leads
router.post('/', (req, res) => {
  const { name, cnpj, activity, phone, email, site, address, city, state, ddd, owner, bank_code, bank_name, rating, source, assigned_to, tags } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  const id = generateId();
  db.prepare(`INSERT INTO leads (id, name, cnpj, activity, phone, email, site, address, city, state, ddd, owner, bank_code, bank_name, rating, source, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, name, cnpj || null, activity || null, phone || null, email || null, site || null, address || null, city || null, state || null, ddd || null, owner || null, bank_code || null, bank_name || null, rating || null, source || 'manual', assigned_to || req.user.id, req.user.id);

  if (tags && Array.isArray(tags)) {
    const insertTag = db.prepare('INSERT OR IGNORE INTO lead_tags (lead_id, tag_id) VALUES (?, ?)');
    tags.forEach(tagId => insertTag.run(id, tagId));
  }

  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(generateId(), req.user.id, 'lead', id, 'created', JSON.stringify({ name }));

  // Real-time notification
  if (global.__notify) {
    global.__notify('lead', 'Novo Lead Capturado! 🎯', `${name} — ${activity || 'Mineração'}`, { leadId: id });
  }

  // Broadcast lead created event
  if (global.__broadcast) {
    global.__broadcast('lead:created', { leadId: id, name, activity, source, city, state });
    invalidateCache();
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  res.status(201).json({ lead });
});

// PUT /api/leads/:id
router.put('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  const fields = ['name', 'cnpj', 'activity', 'phone', 'email', 'site', 'address', 'city', 'state', 'ddd', 'owner', 'bank_code', 'bank_name', 'rating', 'status', 'pipeline_stage', 'assigned_to'];
  const updates = [];
  const params = [];

  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });

  if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);

  db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  if (req.body.tags && Array.isArray(req.body.tags)) {
    db.prepare('DELETE FROM lead_tags WHERE lead_id = ?').run(req.params.id);
    const insertTag = db.prepare('INSERT OR IGNORE INTO lead_tags (lead_id, tag_id) VALUES (?, ?)');
    req.body.tags.forEach(tagId => insertTag.run(req.params.id, tagId));
  }

  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(generateId(), req.user.id, 'lead', req.params.id, 'updated', JSON.stringify(req.body));

  // Broadcast lead updated event
  if (global.__broadcast) {
    global.__broadcast('lead:updated', { leadId: req.params.id, changes: req.body });
    invalidateCache();
  }

  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json({ lead: updated });
});

// DELETE /api/leads/:id
router.delete('/:id', authorize('admin', 'manager'), (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(generateId(), req.user.id, 'lead', req.params.id, 'deleted', JSON.stringify({ name: lead.name }));

  // Broadcast lead deleted event
  if (global.__broadcast) {
    global.__broadcast('lead:deleted', { leadId: req.params.id, name: lead.name });
    invalidateCache();
  }

  res.json({ message: 'Lead removido' });
});

// POST /api/leads/mine - Power mining with real APIs
router.post('/mine', async (req, res) => {
  const { keyword, city, maxResults = 500 } = req.body;
  if (!keyword || !city) return res.status(400).json({ error: 'Palavra-chave e cidade são obrigatórios' });

  try {
    const leads = await mineLeads(keyword, city, { maxResults: parseInt(maxResults) });

    // Save leads to database
    const savedLeads = [];
    for (const lead of leads) {
      const id = generateId();
      try {
        db.prepare(`INSERT INTO leads (id, name, cnpj, activity, phone, email, site, address, city, state, owner, bank_code, bank_name, rating, source, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id, lead.name, lead.cnpj || null, lead.activity || lead.classificacao || keyword, lead.phone || null, lead.email || null, lead.site || null, lead.address || null, lead.city || city.split(',')[0], lead.state || city.split(',')[1]?.trim() || '', lead.owner || null, lead.bank?.code || null, lead.bank?.name || null, parseFloat(lead.rating) || null, lead.fonte || 'power_mine', req.user.id, req.user.id);
        savedLeads.push({ ...lead, id });
      } catch { /* skip duplicates */ }
    }

    res.json({
      total: savedLeads.length,
      leads: savedLeads,
      sources: [...new Set(savedLeads.map(l => l.fonte))],
    });
  } catch (err) {
    console.error('Mining error:', err);
    res.status(500).json({ error: 'Erro na mineração: ' + err.message });
  }
});

// POST /api/leads/mine-people - Mine real people via CNPJ lookup (Receita Federal)
router.post('/mine-people', async (req, res) => {
  const { cnpjs } = req.body;
  if (!cnpjs || !Array.isArray(cnpjs) || cnpjs.length === 0) {
    return res.status(400).json({ error: 'Lista de CNPJs obrigatoria' });
  }

  const { lookupCNPJ } = require('../services/leadService');
  const results = [];

  for (const cnpj of cnpjs.slice(0, 20)) {
    try {
      const data = await lookupCNPJ(cnpj);
      if (data && data.socios && data.socios.length > 0) {
        for (const socio of data.socios) {
          results.push({
            id: `socio-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            nome: socio.nome,
            qualificacao: socio.qualificacao,
            empresa: data.nomeFantasia || data.razaoSocial,
            razaoSocial: data.razaoSocial,
            cnpj: data.cnpj,
            atividade: data.cnaePrincipal,
            capitalSocial: data.capitalSocial,
            endereco: data.endereco ? `${data.endereco.logradouro || ''}, ${data.endereco.numero || ''} - ${data.endereco.bairro || ''}, ${data.endereco.municipio || ''} - ${data.endereco.uf || ''}` : '',
            telefone: data.telefone1 || '',
            email: data.email || '',
            city: data.endereco?.municipio || '',
            state: data.endereco?.uf || '',
            situacao: data.situacaoCadastral,
            porte: data.porte,
            dataAbertura: data.dataAbertura,
            fonte: 'Receita Federal via BrasilAPI',
            score: 95,
          });
        }
      }
    } catch { /* skip failed lookups */ }
  }

  res.json({ total: results.length, people: results });
});

// GET /api/leads/cnpj/:cnpj - Real CNPJ lookup (Receita Federal)
router.get('/cnpj/:cnpj', async (req, res) => {
  try {
    const data = await lookupCNPJ(req.params.cnpj);
    if (!data) return res.status(404).json({ error: 'CNPJ não encontrado' });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Erro na consulta: ' + err.message });
  }
});

// GET /api/leads/cpf/:cpf - CPF lookup with data
router.get('/cpf/:cpf', async (req, res) => {
  const cpf = req.params.cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return res.status(400).json({ error: 'CPF invalido - deve ter 11 digitos' });

  // Validate CPF check digits
  if (!isValidCPF(cpf)) return res.status(400).json({ error: 'CPF invalido - digito verificador incorreto' });

  try {
    // Try real APIs first
    const data = await lookupCPF(cpf);
    res.json({ data, fonte: data.fonte || 'Consulta CPF' });
  } catch (err) {
    res.status(500).json({ error: 'Erro na consulta: ' + err.message });
  }
});

// POST /api/leads/mine-individuals - Mine individual people (Pessoa Física)
router.post('/mine-individuals', async (req, res) => {
  try {
    const { category, city, count = 50 } = req.body;
    if (!city) return res.status(400).json({ error: 'Cidade obrigatoria' });

    const people = generateIndividualPeople(category, city, Math.min(parseInt(count) || 50, 200));

    let saved = 0;
    for (const p of people) {
      try {
        const id = `lead-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        db.prepare(`INSERT INTO leads (id, name, activity, phone, email, address, city, state, owner, source, score, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id, p.name, p.activity, p.phone, p.email, p.address, p.city, p.state, p.owner, p.source, p.score, req.user.id);
        saved++;
      } catch {}
    }

    if (saved > 0 && global.__notify) {
      global.__notify('lead', 'PF Mineradas!', `${saved} pessoas geradas para ${city}`, { count: saved });
    }

    res.json({ total: people.length, saved, people });
  } catch (err) {
    res.status(500).json({ error: 'Erro na mineração de PF: ' + err.message });
  }
});

// POST /api/leads/:id/assign
router.post('/:id/assign', authorize('admin', 'manager'), (req, res) => {
  const { assigned_to } = req.body;
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  db.prepare('UPDATE leads SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(assigned_to || null, req.params.id);
  res.json({ message: 'Lead atribuído' });
});

module.exports = router;
