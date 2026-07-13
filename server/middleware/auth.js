const jwt = require('jsonwebtoken');
const config = require('../config');
const { db } = require('../db');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    let user = null;

    // Check if this is a client token
    if (decoded.userType === 'client') {
      user = db.prepare('SELECT id, name, email, username, plan, active FROM clients WHERE id = ?').get(decoded.userId);
      if (user && user.active) {
        user.role = 'client';
      }
    } else {
      user = db.prepare('SELECT id, name, email, username, role, active FROM users WHERE id = ?').get(decoded.userId);
    }

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuario invalido ou desativado' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', expired: true });
    }
    return res.status(401).json({ error: 'Token invalido' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    let user = null;

    if (decoded.userType === 'client') {
      user = db.prepare('SELECT id, name, email, username, plan, active FROM clients WHERE id = ?').get(decoded.userId);
      if (user && user.active) user.role = 'client';
    } else {
      user = db.prepare('SELECT id, name, email, username, role, active FROM users WHERE id = ?').get(decoded.userId);
    }

    if (user && user.active) req.user = user;
  } catch { /* ignore */ }
  next();
}

module.exports = { authenticate, optionalAuth };
