const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');
const {
  checkAccountLockout, recordLoginAttempt, checkPasswordStrength,
  VALIDATORS, validateInput,
} = require('../middleware/security');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario e senha sao obrigatorios' });
  }

  // Check account lockout
  if (checkAccountLockout(username)) {
    return res.status(423).json({ error: 'Conta bloqueada. Aguarde 30 minutos.' });
  }

  // Try users table first
  let user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
  let userType = 'user';

  // If not found in users, try clients table
  if (!user) {
    const client = db.prepare('SELECT * FROM clients WHERE username = ? AND active = 1').get(username);
    if (client) {
      const passwordValid = bcrypt.compareSync(password, client.password_hash || '');
      if (passwordValid) {
        user = {
          id: client.id,
          name: client.name,
          email: client.email,
          username: client.username,
          role: 'client',
          plan: client.plan,
          password_hash: client.password_hash,
        };
        userType = 'client';
      }
    }
  }

  if (!user || !bcrypt.compareSync(password, user.password_hash || '')) {
    recordLoginAttempt(username, false);
    return res.status(401).json({ error: 'Credenciais invalidas' });
  }

  // Login successful - reset attempts
  recordLoginAttempt(username, true);

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role, userType },
    config.jwtSecret,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id, userType },
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );

  // Log activity with IP
  const entityType = userType === 'client' ? 'client' : 'user';
  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(generateId(), user.id, entityType, user.id, 'login', JSON.stringify({
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    }));

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role, userType }
  });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token necessario' });

  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    let user = null;
    let role = 'user';

    if (decoded.userType === 'client') {
      const client = db.prepare('SELECT id, name, email, username, plan, active FROM clients WHERE id = ?').get(decoded.userId);
      if (client && client.active) {
        user = client;
        role = 'client';
      }
    } else {
      user = db.prepare('SELECT id, role, active FROM users WHERE id = ?').get(decoded.userId);
    }

    if (!user || !user.active) return res.status(401).json({ error: 'Usuario invalido' });

    const accessToken = jwt.sign(
      { userId: user.id, role, userType: decoded.userType || 'user' },
      config.jwtSecret,
      { expiresIn: '15m' }
    );
    res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: 'Refresh token invalido ou expirado' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/password
router.put('/password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Senha atual e nova senha sao obrigatorias' });
  }

  // Password strength check
  const strength = checkPasswordStrength(newPassword);
  if (newPassword.length < 8) {
    return res.status(400).json({
      error: 'Nova senha deve ter pelo menos 8 caracteres',
      strength: strength,
    });
  }
  if (strength.strength === 'fraca') {
    return res.status(400).json({
      error: 'Senha muito fraca. Use maiusculas, numeros e caracteres especiais.',
      strength: strength,
    });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Senha atual incorreta' });
  }

  // Prevent password reuse
  if (bcrypt.compareSync(newPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Nova senha deve ser diferente da atual' });
  }

  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(hash, req.user.id);

  // Log password change
  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action) VALUES (?, ?, ?, ?, ?)')
    .run(generateId(), req.user.id, 'user', req.user.id, 'password_changed');

  res.json({ message: 'Senha atualizada com sucesso' });
});

// POST /api/auth/logout - Invalidate session
router.post('/logout', authenticate, (req, res) => {
  // Log logout
  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action) VALUES (?, ?, ?, ?, ?)')
    .run(generateId(), req.user.id, 'user', req.user.id, 'logout');

  res.json({ message: 'Logout realizado' });
});

// POST /api/auth/register - Public registration
router.post('/register', (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !username || !password) {
    return res.status(400).json({ error: 'Todos os campos sao obrigatorios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
  }

  // Check if username exists in either table
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  const existingClient = db.prepare('SELECT id FROM clients WHERE username = ?').get(username);
  if (existingUser || existingClient) {
    return res.status(409).json({ error: 'Usuario ja existe' });
  }

  const id = generateId();
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO clients (id, name, email, username, password_hash, plan, active) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, email, username, hash, 'Gratuito', 1);

  res.status(201).json({ message: 'Conta criada com sucesso' });
});

module.exports = router;
