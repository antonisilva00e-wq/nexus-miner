const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');
const telegramService = require('../services/telegramService');

const router = express.Router();
router.use(authenticate);

// Ensure telegram_connections table exists
try {
  db.prepare(`CREATE TABLE IF NOT EXISTS telegram_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    bot_token TEXT NOT NULL,
    bot_username TEXT,
    bot_name TEXT,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
  )`).run();
} catch {}

try {
  db.prepare(`CREATE TABLE IF NOT EXISTS telegram_groups (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    telegram_chat_id TEXT NOT NULL,
    name TEXT,
    member_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run();
} catch {}

try {
  db.prepare(`CREATE TABLE IF NOT EXISTS telegram_extractions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    group_name TEXT,
    member_count INTEGER,
    exported_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run();
} catch {}

// POST /api/telegram/connect — connect bot
router.post('/connect', async (req, res) => {
  const { botToken } = req.body;
  if (!botToken) return res.status(400).json({ error: 'Token do bot obrigatório' });

  const result = await telegramService.getBotInfo(botToken);
  if (!result.ok) return res.status(400).json({ error: result.error || 'Token inválido' });

  // Save connection
  const id = generateId();
  try {
    db.prepare('DELETE FROM telegram_connections WHERE user_id = ?').run(req.user.id);
    db.prepare('INSERT INTO telegram_connections (id, user_id, bot_token, bot_username, bot_name) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.user.id, botToken, result.result.username, result.result.first_name);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar conexão' });
  }

  res.json({
    ok: true,
    bot: {
      username: result.result.username,
      name: result.result.first_name,
      id: result.result.id
    }
  });
});

// GET /api/telegram/status — check connection status
router.get('/status', (req, res) => {
  const conn = db.prepare('SELECT * FROM telegram_connections WHERE user_id = ?').get(req.user.id);
  if (!conn) return res.json({ connected: false });

  res.json({
    connected: true,
    bot: {
      username: conn.bot_username,
      name: conn.bot_name
    }
  });
});

// DELETE /api/telegram/disconnect — disconnect bot
router.delete('/disconnect', (req, res) => {
  db.prepare('DELETE FROM telegram_connections WHERE user_id = ?').run(req.user.id);
  telegramService.disconnect(req.user.id);
  res.json({ ok: true });
});

// GET /api/telegram/groups — list bot groups
router.get('/groups', async (req, res) => {
  const conn = db.prepare('SELECT bot_token FROM telegram_connections WHERE user_id = ?').get(req.user.id);
  if (!conn) return res.status(400).json({ error: 'Bot não conectado' });

  const result = await telegramService.getBotGroups(conn.bot_token);
  res.json(result);
});

// POST /api/telegram/extract — extract members from a group
router.post('/extract', async (req, res) => {
  const { chatId, groupName, limit } = req.body;
  if (!chatId) return res.status(400).json({ error: 'ID do grupo obrigatório' });

  const conn = db.prepare('SELECT bot_token FROM telegram_connections WHERE user_id = ?').get(req.user.id);
  if (!conn) return res.status(400).json({ error: 'Bot não conectado' });

  const result = await telegramService.getGroupMembers(conn.bot_token, chatId, limit || 200);
  if (!result.ok) return res.status(400).json({ error: result.error });

  // Save extraction record
  const id = generateId();
  db.prepare('INSERT INTO telegram_extractions (id, user_id, group_name, member_count) VALUES (?, ?, ?, ?)')
    .run(id, req.user.id, groupName || 'Grupo Desconhecido', result.members.length);

  res.json({
    ok: true,
    members: result.members,
    totalCount: result.totalCount,
    note: result.note
  });
});

// POST /api/telegram/export-csv — export members as CSV
router.post('/export-csv', (req, res) => {
  const { members, groupName } = req.body;
  if (!members || !members.length) return res.status(400).json({ error: 'Nenhum membro para exportar' });

  const csv = telegramService.exportCSV(members, groupName || 'members');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="telegram-members-${Date.now()}.csv"`);
  res.send('\uFEFF' + csv); // BOM for Excel
});

// GET /api/telegram/extractions — history of extractions
router.get('/extractions', (req, res) => {
  const extractions = db.prepare('SELECT * FROM telegram_extractions WHERE user_id = ? ORDER BY exported_at DESC LIMIT 50')
    .all(req.user.id);
  res.json({ extractions });
});

// GET /api/telegram/niches — get niche suggestions
router.get('/niches', (req, res) => {
  const niches = [
    { id: 'marketing', name: 'Marketing Digital', icon: '📣', keywords: ['marketing', 'tráfego', 'ads', 'funil'] },
    { id: 'vendas', name: 'Vendas & B2B', icon: '💼', keywords: ['vendas', 'b2b', 'prospecção', 'negócios'] },
    { id: 'tecnologia', name: 'Tecnologia & Dev', icon: '💻', keywords: ['programação', 'dev', 'startup', 'tech'] },
    { id: 'financeiro', name: 'Finanças & Investimentos', icon: '💰', keywords: ['investimento', 'cripto', 'renda', 'finanças'] },
    { id: 'educacao', name: 'Educação & Cursos', icon: '📚', keywords: ['curso', 'mentoria', 'coaching', 'ead'] },
    { id: 'ecommerce', name: 'E-commerce & Loja', icon: '🛒', keywords: ['loja', 'drop', 'shopify', 'ecommerce'] },
    { id: 'imobiliario', name: 'Imobiliário', icon: '🏠', keywords: ['imóvel', 'corretor', 'casa', 'apartamento'] },
    { id: 'saude', name: 'Saúde & Fitness', icon: '💪', keywords: ['fitness', 'nutrição', 'academia', 'saúde'] }
  ];
  res.json({ niches });
});

module.exports = router;
