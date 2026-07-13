const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');
const { sendPush, sendToUser, broadcast } = require('../services/pushService');

const router = express.Router();

// Ensure device_tokens table exists
try {
  db.prepare(`CREATE TABLE IF NOT EXISTS device_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    platform TEXT DEFAULT 'web',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, player_id)
  )`).run();
} catch {}

// POST /api/push/register — save device token
router.post('/register', authenticate, (req, res) => {
  const { playerId, platform } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId obrigatório' });

  const id = generateId();
  try {
    db.prepare('INSERT OR REPLACE INTO device_tokens (id, user_id, player_id, platform) VALUES (?, ?, ?, ?)')
      .run(id, req.user.id, playerId, platform || 'web');
    console.log(`[PUSH] Token registrado: user=${req.user.id} player=${playerId}`);
    res.json({ ok: true, message: 'Notificações ativadas!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar token' });
  }
});

// DELETE /api/push/unregister — remove device token
router.delete('/unregister', authenticate, (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId obrigatório' });

  db.prepare('DELETE FROM device_tokens WHERE user_id = ? AND player_id = ?')
    .run(req.user.id, playerId);
  res.json({ ok: true, message: 'Notificações desativadas' });
});

// GET /api/push/status — check if user has notifications enabled
router.get('/status', authenticate, (req, res) => {
  const tokens = db.prepare('SELECT * FROM device_tokens WHERE user_id = ?').all(req.user.id);
  res.json({ enabled: tokens.length > 0, devices: tokens.length });
});

// POST /api/push/test — send test notification to current user
router.post('/test', authenticate, async (req, res) => {
  const tokens = db.prepare('SELECT player_id FROM device_tokens WHERE user_id = ?').all(req.user.id);
  if (tokens.length === 0) {
    return res.status(400).json({ error: 'Nenhum dispositivo registrado' });
  }

  try {
    const playerIds = tokens.map(t => t.player_id);
    await sendPush({
      title: '🔔 Nexus Miner',
      message: 'Notificações funcionando! Você receberá alertas em tempo real.',
      url: '/',
      includePlayerIds: playerIds
    });
    res.json({ ok: true, message: 'Notificação de teste enviada!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar notificação' });
  }
});

// POST /api/push/broadcast — admin only: send to all users
router.post('/broadcast', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas admin' });
  }

  const { title, message, url } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Título e mensagem obrigatórios' });
  }

  try {
    const result = await broadcast({ title, message, url });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar broadcast' });
  }
});

module.exports = router;
