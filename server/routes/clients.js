const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { generateId, paginate } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/clients
router.get('/', (req, res) => {
  const { search, plan, page = 1, limit = 50 } = req.query;
  const p = paginate(page, parseInt(limit));
  const params = [];
  const conditions = [];

  if (search) {
    conditions.push('(c.name LIKE ? OR c.username LIKE ? OR c.email LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (plan) { conditions.push('c.plan = ?'); params.push(plan); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as count FROM clients c ${where}`).get(...params).count;
  const clients = db.prepare(`SELECT c.* FROM clients c ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`).all(...params, p.limit, p.offset);

  // Status
  const today = new Date(); today.setHours(0,0,0,0);
  const enriched = clients.map(c => {
    let status = 'active';
    if (!c.active) status = 'inactive';
    else if (c.expiry) {
      const exp = new Date(c.expiry + 'T00:00:00');
      const diff = Math.round((exp - today) / 86400000);
      if (diff < 0) status = 'expired';
      else if (diff <= 7) status = 'expiring';
    }
    return { ...c, status, password_hash: undefined };
  });

  res.json({ clients: enriched, total, page: p.page });
});

// GET /api/clients/stats
router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  const today = new Date().toISOString().slice(0, 10);
  const active = db.prepare('SELECT COUNT(*) as count FROM clients WHERE active = 1 AND expiry >= ?').get(today).count;
  const expiring = db.prepare(`SELECT COUNT(*) as count FROM clients WHERE active = 1 AND expiry >= date('now') AND expiry <= date('now', '+7 days')`).get().count;
  const mrr = db.prepare('SELECT COALESCE(SUM(price), 0) as total FROM clients WHERE active = 1').get().total;

  res.json({ total, active, expiring, mrr });
});

// PUT /api/clients/reset-all-passwords - Reset ALL client passwords (admin only)
router.put('/reset-all-passwords', authenticate, authorize('admin'), (req, res) => {
  const { defaultPassword } = req.body;
  if (!defaultPassword || defaultPassword.length < 6) {
    return res.status(400).json({ error: 'Senha padrao deve ter pelo menos 6 caracteres' });
  }

  const hash = bcrypt.hashSync(defaultPassword, 12);
  db.prepare('UPDATE clients SET password_hash = ?').run(hash);

  const count = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  res.json({ message: `Todas as ${count} senhas foram resetadas` });
});

// POST /api/clients
router.post('/', (req, res) => {
  const { name, email, phone, username, password, plan, price, expiry } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Nome, usuário e senha são obrigatórios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
  }

  const existing = db.prepare('SELECT id FROM clients WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Usuário já existe' });

  const id = generateId();
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO clients (id, name, email, phone, username, password_hash, plan, price, expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, email || null, phone || null, username, hash, plan || 'Starter', price || 0, expiry || null);

  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(generateId(), req.user.id, 'client', id, 'created', JSON.stringify({ name, plan }));

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  res.status(201).json({ client: { ...client, password_hash: undefined } });
});

// PUT /api/clients/:id
router.put('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  const { name, email, phone, username, password, plan, price, expiry, active } = req.body;
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
  if (username !== undefined) { updates.push('username = ?'); params.push(username); }
  if (password && password.length >= 6) { updates.push('password_hash = ?'); params.push(bcrypt.hashSync(password, 12)); }
  if (plan !== undefined) { updates.push('plan = ?'); params.push(plan); }
  if (price !== undefined) { updates.push('price = ?'); params.push(price); }
  if (expiry !== undefined) { updates.push('expiry = ?'); params.push(expiry); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  params.push(req.params.id);
  db.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  res.json({ client: { ...updated, password_hash: undefined } });
});

// DELETE /api/clients/:id
router.delete('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ message: 'Cliente removido' });
});

// GET /api/clients/:id/credentials
router.get('/:id/credentials', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json({ username: client.username, plan: client.plan });
});

// PUT /api/clients/:id/reset-password - Reset client password
router.put('/:id/reset-password', (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE clients SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ message: 'Senha atualizada com sucesso' });
});

module.exports = router;
