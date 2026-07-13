const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { generateId } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/users
router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, name, email, username, role, active, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

// POST /api/users
router.post('/', (req, res) => {
  const { name, email, username, password, role } = req.body;
  if (!name || !email || !username || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) return res.status(409).json({ error: 'Usuário ou email já existe' });

  const id = generateId();
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, email, username, hash, role || 'seller');

  const user = db.prepare('SELECT id, name, email, username, role, active FROM users WHERE id = ?').get(id);
  res.status(201).json({ user });
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const { name, email, role, active, password } = req.body;
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (role !== undefined) { updates.push('role = ?'); params.push(role); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
  if (password && password.length >= 6) { updates.push('password_hash = ?'); params.push(bcrypt.hashSync(password, 12)); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT id, name, email, username, role, active FROM users WHERE id = ?').get(req.params.id);
  res.json({ user: updated });
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Não é possível desativar a si mesmo' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  db.prepare('UPDATE users SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ message: 'Usuário desativado' });
});

module.exports = router;
