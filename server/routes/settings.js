/**
 * Settings Routes - System configuration and maintenance
 */

const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();
router.use(authenticate);

// GET /api/settings - Get all settings
router.get('/', authorize('admin'), (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.key] = s.value; });
    res.json({ settings: settingsObj });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar configuracoes' });
  }
});

// PUT /api/settings - Update settings (all authenticated users can update notification templates)
router.put('/', (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Configuracoes invalidas' });
  }

  // Only allow notification template settings for non-admin users
  const allowedKeys = ['notification_sale_message'];
  const userRole = req.user?.role;
  if (userRole !== 'admin') {
    const keys = Object.keys(settings);
    const forbidden = keys.filter(k => !allowedKeys.includes(k));
    if (forbidden.length > 0) {
      return res.status(403).json({ error: 'Sem permissao para alterar essas configuracoes' });
    }
  }

  try {
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, String(value));
    }
    res.json({ message: 'Configuracoes atualizadas' });
  } catch (err) {
    console.error('[Settings] Update error:', err);
    res.status(500).json({ error: 'Erro ao atualizar configuracoes: ' + err.message });
  }
});

// POST /api/settings/reset-database - Reset database (admin only, dangerous!)
router.post('/reset-database', authorize('admin'), (req, res) => {
  const { confirm, password } = req.body;

  // Extra security: require confirmation and password
  if (confirm !== 'RESETAR_BANCO') {
    return res.status(400).json({ error: 'Confirmacao invalida. Envie confirm: "RESETAR_BANCO"' });
  }

  // Verify admin password
  const bcrypt = require('bcryptjs');
  const admin = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('admin');
  if (!admin || !bcrypt.compareSync(password || '', admin.password_hash)) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  try {
    // List of tables to clear (keep structure, delete data)
    const tables = [
      'leads', 'lead_notes', 'lead_tags', 'tags',
      'clients', 'subscriptions', 'payments',
      'message_templates', 'messages_sent',
      'activities', 'api_keys',
      'referrals', 'commissions',
      'push_subscriptions', 'device_tokens',
      'upgrade_requests', 'automation_schedules',
    ];

    const transaction = db.transaction(() => {
      for (const table of tables) {
        try { db.prepare(`DELETE FROM ${table}`).run(); } catch {}
      }
      // Reset auto-seed users
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');

      // Check if admin exists
      const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
      if (!existingAdmin) {
        db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
          .run(uuidv4(), 'Administrador', 'admin@nexusminer.com', 'admin', bcrypt.hashSync('admin123', 12), 'admin');
      }

      const existingManager = db.prepare('SELECT id FROM users WHERE username = ?').get('gerente');
      if (!existingManager) {
        db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
          .run(uuidv4(), 'Gerente Comercial', 'gerente@nexusminer.com', 'gerente', bcrypt.hashSync('manager123', 12), 'manager');
      }

      const existingSeller = db.prepare('SELECT id FROM users WHERE username = ?').get('vendedor');
      if (!existingSeller) {
        db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
          .run(uuidv4(), 'Vendedor', 'vendedor@nexusminer.com', 'vendedor', bcrypt.hashSync('seller123', 12), 'seller');
      }

      const existingClient = db.prepare('SELECT id FROM clients WHERE username = ?').get('cliente1');
      if (!existingClient) {
        db.prepare('INSERT INTO clients (id, name, email, username, password_hash, plan, active) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(uuidv4(), 'Cliente Teste', 'clienteteste@test.com', 'cliente1', bcrypt.hashSync('12345678', 12), 'Gratuito', 1);
      }

      // Reset settings
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('company_name', 'Nexus Miner');
    });

    transaction();

    // Log activity
    db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
      .run(require('../utils/helpers').generateId(), req.user.id, 'system', 'database', 'reset', JSON.stringify({ tables: tables.length }));

    res.json({
      message: 'Banco de dados resetado com sucesso!',
      tablesCleared: tables.length,
      usersReset: ['admin', 'gerente', 'vendedor', 'cliente1'],
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao resetar banco: ' + err.message });
  }
});

// GET /api/settings/stats - Get database statistics
router.get('/stats', authorize('admin'), (req, res) => {
  try {
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      clients: db.prepare('SELECT COUNT(*) as count FROM clients').get().count,
      leads: db.prepare('SELECT COUNT(*) as count FROM leads').get().count,
      activities: db.prepare('SELECT COUNT(*) as count FROM activities').get().count,
      payments: db.prepare('SELECT COUNT(*) as count FROM payments').get().count,
      templates: db.prepare('SELECT COUNT(*) as count FROM message_templates').get().count,
      apiKeys: db.prepare('SELECT COUNT(*) as count FROM api_keys').get().count,
    };
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estatisticas' });
  }
});

module.exports = router;
