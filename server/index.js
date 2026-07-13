const express = require('express');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config');
const { initDatabase, getDb, createWrapper } = require('./database/connection');
const {
  globalLimiter, authLimiter, apiLimiter, miningLimiter,
  securityMiddleware, securityHeaders, suspiciousActivityDetector,
  corsOptions,
} = require('./middleware/security');

async function main() {
  // Initialize database first
  await initDatabase();
  const rawDb = getDb();
  const db = createWrapper(rawDb);

  // Make db available globally for routes
  global.__db = db;

  // Create schema
  const { createSchema } = require('./database/schema');
  createSchema(db);

  // Auto-seed admin user if missing (runs every boot, idempotent)
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    console.log('[SEED] Admin não encontrado — criando...');
    db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), 'Administrador', 'admin@nexusminer.com', 'admin', bcrypt.hashSync('admin123', 12), 'admin');
    db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), 'Gerente Comercial', 'gerente@nexusminer.com', 'gerente', bcrypt.hashSync('manager123', 12), 'manager');
    db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), 'Vendedor', 'vendedor@nexusminer.com', 'vendedor', bcrypt.hashSync('seller123', 12), 'seller');
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('company_name', 'Nexus Miner');
    console.log('[SEED] Usuários criados com sucesso');
  }

  const app = express();

  // ============================================================
  // SECURITY LAYER 1: Headers & CORS
  // ============================================================
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(securityHeaders);
  app.use(require('cors')(corsOptions));

  // ============================================================
  // SECURITY LAYER 2: Suspicious Activity Detection
  // ============================================================
  app.use(suspiciousActivityDetector);

  // ============================================================
  // SECURITY LAYER 3: Body Parsing with limits
  // ============================================================
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ============================================================
  // SECURITY LAYER 4: Global Rate Limiting
  // ============================================================
  app.use(globalLimiter);

  // ============================================================
  // SECURITY LAYER 5: Input Sanitization
  // ============================================================
  app.use(securityMiddleware);

  // ============================================================
  // SECURITY LAYER 6: Static Files (no directory listing)
  // ============================================================
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    dotfiles: 'deny',
    index: false,
  }));

  // ============================================================
  // WEBHOOK ENDPOINT — sales & commissions notifications
  // ============================================================
  const { sendPush } = require('./services/pushService');
  const { db: getDbForPush } = require('./db');

  app.post('/api/webhook/sale', async (req, res) => {
    const { leadId, clientName, value, seller } = req.body;
    const notification = {
      type: 'sale',
      title: 'Nova Venda!',
      message: `${clientName || 'Cliente'} — R$ ${(value || 0).toLocaleString('pt-BR')}`,
      seller: seller || 'Sistema',
      timestamp: new Date().toISOString(),
      data: req.body
    };
    if (global.__io) global.__io.emit('notification', notification);

    // Push notification
    try {
      const allTokens = getDbForPush.prepare('SELECT player_id FROM device_tokens').all();
      if (allTokens.length > 0) {
        await sendPush({
          title: '💰 Nova Venda!',
          message: notification.message,
          url: '/#/financial',
          includePlayerIds: allTokens.map(t => t.player_id)
        });
      }
    } catch (e) { console.error('[PUSH] Erro sale:', e.message); }

    res.json({ ok: true, notification });
  });

  app.post('/api/webhook/commission', async (req, res) => {
    const { sellerName, amount, leadId } = req.body;
    const notification = {
      type: 'commission',
      title: 'Comissão Recebida!',
      message: `${sellerName || 'Vendedor'} — R$ ${(amount || 0).toLocaleString('pt-BR')}`,
      timestamp: new Date().toISOString(),
      data: req.body
    };
    if (global.__io) global.__io.emit('notification', notification);

    // Push notification
    try {
      const allTokens = getDbForPush.prepare('SELECT player_id FROM device_tokens').all();
      if (allTokens.length > 0) {
        await sendPush({
          title: '🏆 Comissão Recebida!',
          message: notification.message,
          url: '/#/financial',
          includePlayerIds: allTokens.map(t => t.player_id)
        });
      }
    } catch (e) { console.error('[PUSH] Erro commission:', e.message); }

    res.json({ ok: true, notification });
  });

  app.post('/api/webhook/lead', async (req, res) => {
    const { leadName, source, score } = req.body;
    const notification = {
      type: 'lead',
      title: 'Novo Lead!',
      message: `${leadName || 'Lead'} — Score: ${score || 0} (${source || 'mineração'})`,
      timestamp: new Date().toISOString(),
      data: req.body
    };
    if (global.__io) global.__io.emit('notification', notification);

    // Push notification
    try {
      const allTokens = getDbForPush.prepare('SELECT player_id FROM device_tokens').all();
      if (allTokens.length > 0) {
        await sendPush({
          title: '🎯 Novo Lead!',
          message: notification.message,
          url: '/#/leads',
          includePlayerIds: allTokens.map(t => t.player_id)
        });
      }
    } catch (e) { console.error('[PUSH] Erro lead:', e.message); }

    res.json({ ok: true, notification });
  });

  // Internal helper — call from any route to push real-time notification
  global.__notify = (type, title, message, data = {}) => {
    const notification = { type, title, message, timestamp: new Date().toISOString(), data };
    if (global.__io) global.__io.emit('notification', notification);
    return notification;
  };

  // Public config endpoint (App ID for OneSignal frontend)
  app.get('/api/config', (req, res) => {
    res.json({
      onesignalAppId: process.env.ONESIGNAL_APP_ID || ''
    });
  });

  // Debug endpoint - check if users exist
  app.get('/api/debug', (req, res) => {
    const users = db.prepare('SELECT id, username, role FROM users').all();
    res.json({ users, count: users.length, dbPath: config.dbPath });
  });

  // ============================================================
  // API Routes with specific rate limiters
  // ============================================================
  app.use('/api/auth', authLimiter, require('./routes/auth'));
  app.use('/api/leads', apiLimiter, require('./routes/leads'));
  app.use('/api/pipeline', apiLimiter, require('./routes/pipeline'));
  app.use('/api/clients', apiLimiter, require('./routes/clients'));
  app.use('/api/users', apiLimiter, require('./routes/users'));
  app.use('/api/dashboard', apiLimiter, require('./routes/dashboard'));
  app.use('/api/financial', apiLimiter, require('./routes/financial'));
  app.use('/api/templates', apiLimiter, require('./routes/templates'));
  app.use('/api/messages', apiLimiter, require('./routes/messages'));
  app.use('/api/apikeys', apiLimiter, require('./routes/apikeys'));
  app.use('/api/activities', apiLimiter, require('./routes/activities'));
  app.use('/api/rfsearch', apiLimiter, require('./routes/rfsearch'));
  app.use('/api/export', apiLimiter, require('./routes/export'));
  app.use('/api/scoring', apiLimiter, require('./routes/scoring'));
  app.use('/api/automation', apiLimiter, require('./routes/automation'));
  app.use('/api/reports', apiLimiter, require('./routes/reports'));
  app.use('/api/plans', apiLimiter, require('./routes/plans'));
  app.use('/api/integrations', apiLimiter, require('./routes/integrations'));
  app.use('/api/referrals', apiLimiter, require('./routes/referrals'));
  app.use('/api/push', apiLimiter, require('./routes/push'));

  // Mining endpoints get stricter rate limiting
  app.use('/api/leads/mine', miningLimiter);
  app.use('/api/leads/mine-people', miningLimiter);

  // ============================================================
  // SECURITY: Block unauthorized API access
  // ============================================================
  app.use('/api', (req, res, next) => {
    const blockedPaths = [
      '/admin', '/wp-admin', '/phpmyadmin', '/.env',
      '/.git', '/config', '/backup', '/debug',
    ];
    if (blockedPaths.some(p => req.path.toLowerCase().startsWith(p))) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  });

  // ============================================================
  // SPA Fallback
  // ============================================================
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
  });

  // ============================================================
  // Global Error Handler (no stack trace exposure)
  // ============================================================
  app.use((err, req, res, next) => {
    console.error('[ERROR]', new Date().toISOString(), err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  });

  // ============================================================
  // 404 Handler
  // ============================================================
  app.use((req, res) => {
    res.status(404).json({ error: 'Rota nao encontrada' });
  });

  // ============================================================
  // Start Server with Socket.IO
  // ============================================================
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });
  global.__io = io;

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Cliente conectado: ${socket.id}`);
    socket.on('disconnect', () => console.log(`[SOCKET] Desconectado: ${socket.id}`));
  });

  server.listen(config.port, '0.0.0.0', () => {
    console.log('\n  ╔══════════════════════════════════════╗');
    console.log('  ║     NEXUS MINER ERP v2.0             ║');
    console.log('  ║     Seguranca: ATIVADA               ║');
    console.log('  ╚══════════════════════════════════════╝');
    console.log(`\n  Rodando em http://localhost:${config.port}`);
    console.log(`  Ambiente: ${config.nodeEnv}`);
    console.log(`  Seguranca: 6 camadas ativas`);
    console.log(`  Socket.IO: ATIVADO`);

    // Start auto backup
    const { startAutoBackup } = require('./services/backupService');
    startAutoBackup();
    console.log(`  Backup: automatico (24h)`);
    console.log('');
  });
}

main().catch(err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
