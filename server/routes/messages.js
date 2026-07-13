const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// POST /api/messages/send
router.post('/send', (req, res) => {
  const { lead_id, client_id, template_id, channel, content } = req.body;
  if (!channel || !content) return res.status(400).json({ error: 'Canal e conteúdo são obrigatórios' });

  const id = generateId();
  db.prepare('INSERT INTO messages_sent (id, lead_id, client_id, template_id, channel, content, sent_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, lead_id || null, client_id || null, template_id || null, channel, content, req.user.id);

  const msg = db.prepare('SELECT * FROM messages_sent WHERE id = ?').get(id);
  res.status(201).json({ message: msg });
});

// GET /api/messages/history
router.get('/history', (req, res) => {
  const { lead_id, client_id, channel, page = 1, limit = 50 } = req.query;
  const offset = (Math.max(1, page) - 1) * limit;
  const params = [];
  const conditions = [];

  if (lead_id) { conditions.push('m.lead_id = ?'); params.push(lead_id); }
  if (client_id) { conditions.push('m.client_id = ?'); params.push(client_id); }
  if (channel) { conditions.push('m.channel = ?'); params.push(channel); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const messages = db.prepare(`
    SELECT m.*, l.name as lead_name, c.name as client_name, u.name as sender_name
    FROM messages_sent m
    LEFT JOIN leads l ON m.lead_id = l.id
    LEFT JOIN clients c ON m.client_id = c.id
    LEFT JOIN users u ON m.sent_by = u.id
    ${where} ORDER BY m.sent_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ messages });
});

module.exports = router;
