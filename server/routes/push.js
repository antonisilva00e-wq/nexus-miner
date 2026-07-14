const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');
const { sendPush, broadcast, vapidPublicKey } = require('../services/pushService');

const router = express.Router();

// Ensure subscriptions table exists
try {
  db.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run();
} catch {}

// GET /api/push/vapid-public-key — public key for frontend
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

// POST /api/push/subscribe — save push subscription
router.post('/subscribe', authenticate, (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: 'Dados de subscription inválidos' });
  }

  const id = generateId();
  try {
    // Remove existing subscription for this user+endpoint
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').run(req.user.id, endpoint);
    db.prepare('INSERT INTO push_subscriptions (id, user_id, endpoint, keys_p256dh, keys_auth) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.user.id, endpoint, keys.p256dh, keys.auth);
    res.json({ ok: true, message: 'Notificações ativadas!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar subscription' });
  }
});

// DELETE /api/push/unsubscribe — remove push subscription
router.post('/unsubscribe', authenticate, (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').run(req.user.id, endpoint);
  } else {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(req.user.id);
  }
  res.json({ ok: true, message: 'Notificações desativadas' });
});

// GET /api/push/status — check subscription status
router.get('/status', authenticate, (req, res) => {
  const subs = db.prepare('SELECT id FROM push_subscriptions WHERE user_id = ?').all(req.user.id);
  res.json({ enabled: subs.length > 0, devices: subs.length });
});

// POST /api/push/test — send test notification
router.post('/test', authenticate, async (req, res) => {
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(req.user.id);
  if (subs.length === 0) {
    return res.status(400).json({ error: 'Nenhum dispositivo registrado' });
  }

  const subscription = { endpoint: subs[0].endpoint, keys: { p256dh: subs[0].keys_p256dh, auth: subs[0].keys_auth } };
  try {
    await sendPush(subscription, { title: '🔔 Nexus Miner', message: 'Notificações funcionando!', url: '/' });
    res.json({ ok: true, message: 'Notificação de teste enviada!' });
  } catch (err) {
    // If subscription is expired/invalid, remove it
    if (err.statusCode === 404 || err.statusCode === 410) {
      db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(subs[0].id);
    }
    res.status(500).json({ error: 'Erro ao enviar: ' + (err.message || 'desconhecido') });
  }
});

module.exports = router;
