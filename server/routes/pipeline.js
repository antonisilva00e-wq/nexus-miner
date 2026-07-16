const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

const STAGES = ['leads', 'contato', 'proposta', 'fechado', 'perdido'];

// GET /api/pipeline - Kanban board state
router.get('/', (req, res) => {
  const baseWhere = req.user.role === 'seller' ? 'WHERE l.assigned_to = ?' : '';
  const params = req.user.role === 'seller' ? [req.user.id] : [];

  const stages = STAGES.map(stage => {
    const leads = db.prepare(`
      SELECT l.*, u.name as assigned_name
      FROM leads l LEFT JOIN users u ON l.assigned_to = u.id
      ${baseWhere ? baseWhere + ' AND' : 'WHERE'} l.pipeline_stage = ?
      ORDER BY l.updated_at DESC
    `).all(...params, stage);
    const totalValue = leads.reduce((sum, l) => sum + (l.rating || 0), 0);
    return { stage, leads, count: leads.length, totalValue };
  });

  res.json({ stages, stageOrder: STAGES });
});

// POST /api/pipeline - Create pipeline item (alias for creating lead in pipeline)
router.post('/', (req, res) => {
  const { name, cnpj, activity, phone, email, city, state, pipeline_stage, rating, assigned_to } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome e obrigatorio' });

  const id = generateId();
  db.prepare(`INSERT INTO leads (id, name, cnpj, activity, phone, email, city, state, pipeline_stage, rating, assigned_to, source, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, name, cnpj || null, activity || null, phone || null, email || null, city || null, state || null, pipeline_stage || 'leads', rating || null, assigned_to || req.user.id, 'pipeline', req.user.id);

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  res.status(201).json({ lead });
});

// PUT /api/pipeline/:leadId/mover - Move lead between stages
router.put('/:leadId/mover', (req, res) => {
  const { to_stage } = req.body;
  if (!STAGES.includes(to_stage)) {
    return res.status(400).json({ error: 'Estágio inválido' });
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.leadId);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  const from_stage = lead.pipeline_stage;
  if (from_stage === to_stage) return res.json({ message: 'Lead já está neste estágio' });

  db.prepare('UPDATE leads SET pipeline_stage = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(to_stage, to_stage === 'fechado' ? 'fechado' : to_stage === 'perdido' ? 'perdido' : lead.status, req.params.leadId);

  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(generateId(), req.user.id, 'lead', req.params.leadId, 'stage_changed', JSON.stringify({ from: from_stage, to: to_stage, lead_name: lead.name }));

  // Broadcast pipeline change event
  if (global.__broadcast) {
    global.__broadcast('pipeline:changed', { leadId: req.params.leadId, from: from_stage, to: to_stage, leadName: lead.name });
  }

  res.json({ message: `Lead movido de "${from_stage}" para "${to_stage}"` });
});

// GET /api/pipeline/stats
router.get('/stats', (req, res) => {
  const baseWhere = req.user.role === 'seller' ? 'WHERE assigned_to = ?' : '';
  const params = req.user.role === 'seller' ? [req.user.id] : [];

  const stats = STAGES.map(stage => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM leads ${baseWhere ? baseWhere + ' AND' : 'WHERE'} pipeline_stage = ?`).get(...params, stage).count;
    return { stage, count };
  });

  const conversionRate = stats[0].count > 0 ? ((stats[3].count / stats[0].count) * 100).toFixed(1) : 0;
  const lossRate = stats[0].count > 0 ? ((stats[4].count / stats[0].count) * 100).toFixed(1) : 0;

  res.json({ stats, conversionRate: parseFloat(conversionRate), lossRate: parseFloat(lossRate) });
});

module.exports = router;
