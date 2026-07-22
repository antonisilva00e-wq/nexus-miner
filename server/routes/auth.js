const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { db } = require('../db');
const { authenticate, blacklistToken } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');
const {
  checkAccountLockout, recordLoginAttempt, checkPasswordStrength,
  VALIDATORS, validateInput, authLimiter, registerLimiter, refreshLimiter,
} = require('../middleware/security');

const router = express.Router();

// POST /api/auth/login
router.post('/login', authLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario e senha sao obrigatorios' });
  }

  // Enforce string length limits to prevent abuse
  if (username.length > 30 || password.length > 128) {
    return res.status(400).json({ error: 'Credenciais invalidas' });
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

  recordLoginAttempt(username, true);

  const jti = crypto.randomUUID();
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role, userType, jti },
    config.jwtSecret,
    { algorithm: 'HS256', expiresIn: '8h' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id, userType, jti: crypto.randomUUID() },
    config.jwtRefreshSecret,
    { algorithm: 'HS256', expiresIn: '7d' }
  );

  // Log activity with IP and user agent
  const entityType = userType === 'client' ? 'client' : 'user';
  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(generateId(), user.id, entityType, user.id, 'login', JSON.stringify({
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      jti,
    }));

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role, userType }
  });
});

// POST /api/auth/refresh
router.post('/refresh', refreshLimiter, (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token necessario' });

  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret, {
      algorithms: ['HS256'],
    });

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

    const jti = crypto.randomUUID();
    const accessToken = jwt.sign(
      { userId: user.id, role, userType: decoded.userType || 'user', jti },
      config.jwtSecret,
      { algorithm: 'HS256', expiresIn: '15m' }
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

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' });
  }

  if (newPassword.length > 128) {
    return res.status(400).json({ error: 'Senha muito longa (max: 128 caracteres)' });
  }

  const strength = checkPasswordStrength(newPassword);
  if (strength.strength === 'fraca') {
    return res.status(400).json({
      error: 'Senha muito fraca. Use maiusculas, numeros e caracteres especiais.',
      strength: strength,
    });
  }

  // Check both users and clients tables
  let user = null;
  let isClient = false;
  try {
    user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  } catch {}
  if (!user) {
    try {
      user = db.prepare('SELECT password_hash FROM clients WHERE id = ?').get(req.user.id);
      isClient = true;
    } catch {}
  }

  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Senha atual incorreta' });
  }

  if (bcrypt.compareSync(newPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Nova senha deve ser diferente da atual' });
  }

  const hash = bcrypt.hashSync(newPassword, 12);
  const table = isClient ? 'clients' : 'users';
  db.prepare(`UPDATE ${table} SET password_hash = ? WHERE id = ?`)
    .run(hash, req.user.id);

  // Revoke current token - force re-login after password change
  if (req.tokenJti) blacklistToken(req.tokenJti);

  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(generateId(), req.user.id, 'user', req.user.id, 'password_changed', JSON.stringify({
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    }));

  res.json({ message: 'Senha atualizada com sucesso. Faca login novamente.' });
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  // Revoke current token
  if (req.tokenJti) blacklistToken(req.tokenJti);

  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(generateId(), req.user.id, 'user', req.user.id, 'logout', JSON.stringify({
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    }));

  res.json({ message: 'Logout realizado' });
});

// POST /api/auth/register
router.post('/register', registerLimiter, (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !username || !password) {
    return res.status(400).json({ error: 'Todos os campos sao obrigatorios' });
  }

  // Validate inputs
  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: 'Username deve ter entre 3 e 30 caracteres' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username deve conter apenas letras, numeros e underscore' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
  }
  if (password.length > 128) {
    return res.status(400).json({ error: 'Senha muito longa (max: 128 caracteres)' });
  }
  if (name.length < 2 || name.length > 200) {
    return res.status(400).json({ error: 'Nome invalido' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalido' });
  }

  const strength = checkPasswordStrength(password);
  if (strength.strength === 'fraca') {
    return res.status(400).json({
      error: 'Senha muito fraca. Use maiusculas, numeros e caracteres especiais.',
      strength,
    });
  }

  // Check if username exists in either table
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  const existingClient = db.prepare('SELECT id FROM clients WHERE username = ?').get(username);
  if (existingUser || existingClient) {
    return res.status(409).json({ error: 'Usuario ja existe' });
  }

  // Check if email is already used
  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email) ||
    db.prepare('SELECT id FROM clients WHERE email = ?').get(email);
  if (existingEmail) {
    return res.status(409).json({ error: 'Email ja esta em uso' });
  }

  const id = generateId();
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO clients (id, name, email, username, password_hash, plan, active) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, email, username, hash, 'Gratuito', 1);

  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(generateId(), id, 'client', id, 'registered', JSON.stringify({
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    }));

  res.status(201).json({ message: 'Conta criada com sucesso' });
});

module.exports = router;
