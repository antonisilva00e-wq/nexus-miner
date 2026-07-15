const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { generateId } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// Role hierarchy: admin > manager > seller
const ROLE_HIERARCHY = { admin: 3, manager: 2, seller: 1 };

function canManage(managerRole, targetRole) {
  return (ROLE_HIERARCHY[managerRole] || 0) > (ROLE_HIERARCHY[targetRole] || 0);
}

// GET /api/users - Admin sees all, Manager sees sellers only
router.get('/', authorize('admin', 'manager'), (req, res) => {
  let users;
  if (req.user.role === 'admin') {
    users = db.prepare('SELECT id, name, email, username, role, active, created_at FROM users ORDER BY created_at DESC').all();
  } else {
    // Manager can only see sellers
    users = db.prepare('SELECT id, name, email, username, role, active, created_at FROM users WHERE role = ? ORDER BY created_at DESC').all('seller');
  }
  res.json({ users });
});

// POST /api/users - Create user with role restrictions
router.post('/', authorize('admin', 'manager'), (req, res) => {
  const { name, email, username, password, role } = req.body;
  if (!name || !email || !username || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  const requestedRole = role || 'seller';

  // Managers can only create sellers
  if (req.user.role === 'manager' && requestedRole !== 'seller') {
    return res.status(403).json({ error: 'Gerentes só podem criar vendedores' });
  }

  // Sellers cannot create users at all (already blocked by authorize middleware)

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) return res.status(409).json({ error: 'Usuário ou email já existe' });

  const id = generateId();
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, email, username, hash, requestedRole);

  const user = db.prepare('SELECT id, name, email, username, role, active FROM users WHERE id = ?').get(id);
  res.status(201).json({ user });
});

// PUT /api/users/:id - Edit user with role restrictions
router.put('/:id', authorize('admin', 'manager'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  // Managers cannot edit admins
  if (req.user.role === 'manager' && user.role === 'admin') {
    return res.status(403).json({ error: 'Gerentes não podem editar administradores' });
  }

  const { name, email, role, active, password } = req.body;

  // Managers can only set role to seller
  if (req.user.role === 'manager' && role && role !== 'seller') {
    return res.status(403).json({ error: 'Gerentes só podem definir role de vendedor' });
  }

  // Nobody can promote themselves to admin via edit
  if (role === 'admin' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem definir role de admin' });
  }

  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (role !== undefined && req.user.role === 'admin') { updates.push('role = ?'); params.push(role); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
  if (password && password.length >= 6) { updates.push('password_hash = ?'); params.push(bcrypt.hashSync(password, 12)); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT id, name, email, username, role, active FROM users WHERE id = ?').get(req.params.id);
  res.json({ user: updated });
});

// DELETE /api/users/:id - Deactivate user
router.delete('/:id', authorize('admin'), (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Não é possível desativar a si mesmo' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  // Only admin can deactivate other admins
  if (user.role === 'admin' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas admin pode desativar outro admin' });
  }

  db.prepare('UPDATE users SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ message: 'Usuário desativado' });
});

module.exports = router;
