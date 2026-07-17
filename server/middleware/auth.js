const jwt = require('jsonwebtoken');
const config = require('../config');
const { db } = require('../db');

// Token blacklist (in-memory for restart resilience; persists via activities log)
const tokenBlacklist = new Set();

function blacklistToken(jti) {
  tokenBlacklist.add(jti);
  // Auto-cleanup after 24h
  setTimeout(() => tokenBlacklist.delete(jti), 24 * 60 * 60 * 1000);
}

function isTokenBlacklisted(jti) {
  return tokenBlacklist.has(jti);
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token.length < 10) {
    return res.status(401).json({ error: 'Token invalido' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      maxAge: '15m',
    });

    // Check blacklist
    if (decoded.jti && isTokenBlacklisted(decoded.jti)) {
      return res.status(401).json({ error: 'Token revogado' });
    }

    let user = null;

    if (decoded.userType === 'client') {
      user = db.prepare('SELECT id, name, email, username, plan, active FROM clients WHERE id = ?').get(decoded.userId);
      if (user && user.active) {
        user.role = 'client';
        user.userType = 'client';
      }
    } else {
      user = db.prepare('SELECT id, name, email, username, role, active FROM users WHERE id = ?').get(decoded.userId);
      if (user) user.userType = 'user';
    }

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuario invalido ou desativado' });
    }

    // Attach token metadata for audit
    req.tokenJti = decoded.jti;
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', expired: true });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalido' });
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
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
    });

    if (decoded.jti && isTokenBlacklisted(decoded.jti)) {
      return next();
    }

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

module.exports = { authenticate, optionalAuth, blacklistToken };
