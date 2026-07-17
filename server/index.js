const express = require('express');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config');
const { initDatabase, getDb, createWrapper } = require('./database/connection');

async function main() {
  // 1. Database
  await initDatabase();
  const rawDb = getDb();
  const db = createWrapper(rawDb);
  global.__db = db;

  // Load auth middleware AFTER db is ready
  const { authenticate } = require('./middleware/auth');
  const { authorize } = require('./middleware/roles');
  const {
    globalLimiter, securityMiddleware, securityHeaders,
    suspiciousActivityDetector, corsOptions, ipBlocker,
    requestID, auditLogger, bodySizeLimit, verifyWebhookHMAC,
  } = require('./middleware/security');

  // 2. Schema
  const { createSchema } = require('./database/schema');
  createSchema(db);

  // 3. Auto-seed
  try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('adminj7');
    if (!existing) {
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), 'Administrador', 'admin@nexusminer.com', 'adminj7', bcrypt.hashSync('admin.j7', 12), 'admin');
      db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), 'Gerente Comercial', 'gerente@nexusminer.com', 'gerente', bcrypt.hashSync('manager123', 12), 'manager');
      db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), 'Vendedor', 'vendedor@nexusminer.com', 'vendedor', bcrypt.hashSync('seller123', 12), 'seller');
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('company_name', 'Nexus Miner');
      console.log('[SEED] Usuarios criados');
    }
    const existingClient = db.prepare('SELECT id FROM clients WHERE username = ?').get('cliente1');
    if (!existingClient) {
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      db.prepare('INSERT INTO clients (id, name, email, username, password_hash, plan, active) VALUES (?, ?, ?, ?, ?, ?, ?)').run(uuidv4(), 'Cliente Teste', 'clienteteste@test.com', 'cliente1', bcrypt.hashSync('12345678', 12), 'Gratuito', 1);
      console.log('[SEED] Cliente teste criado (cliente1 / 12345678)');
    }
  } catch (e) { console.error('[SEED]', e.message); }

  // 4. Express - Security layers in correct order
  const app = express();

  // Layer 1: Request ID (every request gets a unique ID for audit trail)
  app.use(requestID);

  // Layer 2: IP blocking (check before anything else)
  app.use(ipBlocker);

  // Layer 3: Helmet with hardened config
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }));

  // Layer 4: CORS (strict in production)
  app.use(require('cors')(corsOptions));

  // Layer 5: Body parsing with size limits
  app.use(express.json({ limit: '500kb' }));
  app.use(express.urlencoded({ extended: true, limit: '500kb' }));
  app.use(bodySizeLimit(500));

  // Layer 6: Security headers (CSP, X-Frame-Options, etc.)
  app.use(securityHeaders);

  // Layer 7: Suspicious activity detection (URL patterns, methods, user-agents)
  app.use(suspiciousActivityDetector);

  // Layer 8: SQL injection + XSS detection in body and query params
  app.use(securityMiddleware);

  // Layer 9: Global rate limiter
  app.use(globalLimiter);

  // Layer 10: Audit logger (tracks all state-changing operations)
  app.use(auditLogger);

  // Static files - hardened
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    dotfiles: 'deny',
    index: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Surrogate-Control', 'no-store');
      }
    }
  }));

  // 5. Push helper
  const { sendPush, broadcast } = require('./services/pushService');

  global.__notify = (type, title, message, data = {}) => {
    if (type === 'sale') {
      try {
        const template = db.prepare("SELECT value FROM settings WHERE key = 'notification_sale_message'").get();
        if (template && template.value && message) {
          const currencyMatch = message.match(/R\$\s*[\d.,]+/);
          if (currencyMatch) {
            message = template.value.replace(/\{valor\}/g, currencyMatch[0]);
          }
        }
      } catch {}
    }

    const notification = { type, title, message, timestamp: new Date().toISOString(), data };

    if (data.userId && global.__io) {
      global.__io.to(`user:${data.userId}`).emit('notification', notification);
    } else if (global.__io) {
      global.__io.emit('notification', notification);
    }

    try {
      const urlMap = { sale: '/#/financial', commission: '/#/financial', lead: '/#/leads', info: '/#/dashboard' };
      const pushUrl = data.url || urlMap[type] || '/#/dashboard';
      const subs = db.prepare('SELECT * FROM push_subscriptions').all();
      if (subs.length) {
        const subscriptions = subs.map(s => ({ endpoint: s.endpoint, keys: { p256dh: s.keys_p256dh, auth: s.keys_auth } }));
        broadcast(subscriptions, { title, message, url: pushUrl, type }).catch(() => {});
      }
    } catch {}

    return notification;
  };

  // 6. Health check (no auth, no logging)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.1.0' });
  });

  // 7. Config (minimal info exposure)
  app.get('/api/config', (req, res) => {
    res.json({ onesignalAppId: process.env.ONESIGNAL_APP_ID || '' });
  });

  // 8. Webhooks - protected by HMAC signature verification
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

  function webhookAuth(req, res, next) {
    // HMAC verification if secret is set
    if (WEBHOOK_SECRET && req.headers['x-webhook-signature']) {
      return verifyWebhookHMAC(req, res, next);
    }
    // Fallback to header-based auth
    if (!WEBHOOK_SECRET) return next();
    const provided = req.headers['x-webhook-secret'] || req.body?.secret;
    if (provided !== WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  }

  async function pushAll(title, message, url, type) {
    try {
      const subs = db.prepare('SELECT * FROM push_subscriptions').all();
      const subscriptions = subs.map(s => ({ endpoint: s.endpoint, keys: { p256dh: s.keys_p256dh, auth: s.keys_auth } }));
      if (subscriptions.length) await broadcast(subscriptions, { title, message, url, type });
    } catch {}
  }

  app.post('/api/webhook/sale', webhookAuth, bodySizeLimit(100), async (req, res) => {
    const payload = req.body || {};
    let rawValue = 0;

    if (payload.amount !== undefined && payload.order_status) {
      rawValue = parseFloat(payload.amount) / 100;
    } else if (payload.data && payload.data.purchase && payload.data.purchase.price) {
      rawValue = parseFloat(payload.data.purchase.price.value || 0);
    } else if (payload.venda && payload.venda.valor) {
      rawValue = parseFloat(payload.venda.valor);
    } else if (payload.resource && payload.resource.total_price) {
      rawValue = parseFloat(payload.resource.total_price);
    } else if (payload.total_price !== undefined) {
      rawValue = parseFloat(payload.total_price);
    } else {
      rawValue = parseFloat(payload.value || payload.amount || payload.price || payload.total || 0);
      if (Number.isInteger(rawValue) && rawValue > 1000) {
        rawValue = rawValue / 100;
      }
    }

    const formattedVal = rawValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    let saleHeading = 'Venda concluida';
    try {
      const template = db.prepare("SELECT value FROM settings WHERE key = 'notification_sale_message'").get();
      if (template && template.value) {
        saleHeading = template.value.replace(/\{valor\}/g, formattedVal);
      }
    } catch {}

    const notification = { type: 'sale', title: saleHeading, message: formattedVal, timestamp: new Date().toISOString() };
    if (global.__io) global.__io.emit('notification', notification);
    await pushAll(saleHeading, formattedVal, '/#/financial', 'sale');
    res.json({ ok: true, parsedValue: rawValue });
  });

  app.post('/api/webhook/commission', webhookAuth, bodySizeLimit(100), async (req, res) => {
    const { sellerName, amount } = req.body;
    const formattedVal = parseFloat(amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const notification = {
      type: 'commission',
      title: 'Nexus Miner',
      message: `Comissao recebida: ${formattedVal} - Indicacao de ${sellerName || 'Parceiro'}`,
      timestamp: new Date().toISOString()
    };
    if (global.__io) global.__io.emit('notification', notification);
    await pushAll(notification.message, '/#/financial', 'commission');
    res.json({ ok: true });
  });

  app.post('/api/webhook/lead', webhookAuth, bodySizeLimit(100), async (req, res) => {
    const { leadName, source, score } = req.body;
    const notification = {
      type: 'lead',
      title: 'Nexus Miner',
      message: `Lead capturado: ${leadName || 'Lead'} - Origem: ${source || 'Mineracao'}`,
      timestamp: new Date().toISOString()
    };
    if (global.__io) global.__io.emit('notification', notification);
    await pushAll(notification.message, '/#/leads', 'lead');
    res.json({ ok: true });
  });

  // 9. Routes
  const routeMap = {
    '/api/auth': './routes/auth',
    '/api/leads': './routes/leads',
    '/api/pipeline': './routes/pipeline',
    '/api/clients': './routes/clients',
    '/api/users': './routes/users',
    '/api/dashboard': './routes/dashboard',
    '/api/financial': './routes/financial',
    '/api/templates': './routes/templates',
    '/api/messages': './routes/messages',
    '/api/apikeys': './routes/apikeys',
    '/api/activities': './routes/activities',
    '/api/rfsearch': './routes/rfsearch',
    '/api/export': './routes/export',
    '/api/scoring': './routes/scoring',
    '/api/automation': './routes/automation',
    '/api/reports': './routes/reports',
    '/api/plans': './routes/plans',
    '/api/integrations': './routes/integrations',
    '/api/referrals': './routes/referrals',
    '/api/push': './routes/push',
    '/api/telegram': './routes/telegram',
    '/api/scripts': './routes/scripts',
    '/api/settings': './routes/settings',
    '/api/enrichment': './routes/enrichment',
    '/api/booking': './routes/booking',
    '/api/intelligence': './routes/intelligence',
  };
  for (const [mount, file] of Object.entries(routeMap)) {
    try { app.use(mount, require(file)); } catch (e) { console.error(`[ROUTE] ${mount}:`, e.message); }
  }

  // 10. Notification routes (protected)
  app.post('/api/notifications/send', authenticate, authorize('admin', 'manager'), (req, res) => {
    const { userId, type, title, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId e message sao obrigatorios' });
    }

    const notification = {
      type: type || 'info',
      title: title || 'Notificacao',
      message,
      timestamp: new Date().toISOString()
    };

    if (global.__io) {
      global.__io.to(`user:${userId}`).emit('notification', notification);
    }

    try {
      const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
      if (subs.length) {
        const subscriptions = subs.map(s => ({ endpoint: s.endpoint, keys: { p256dh: s.keys_p256dh, auth: s.keys_auth } }));
        broadcast(subscriptions, { message, url: '/#/dashboard', type });
      }
    } catch {}

    res.json({ ok: true, sentTo: userId });
  });

  app.get('/api/notifications/users', authenticate, authorize('admin', 'manager'), (req, res) => {
    try {
      const users = db.prepare('SELECT id, name, username, role FROM users WHERE active = 1').all();
      const clients = db.prepare('SELECT id, name, username FROM clients WHERE active = 1').all();
      res.json({ users: [...users, ...clients.map(c => ({ ...c, role: 'client' }))] });
    } catch (err) {
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // 11. SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  // 12. 404 handler
  app.use((req, res) => res.status(404).json({ error: 'Rota nao encontrada' }));

  // 13. Global error handler - NEVER leak internals
  app.use((err, req, res, next) => {
    console.error(`[ERR] reqId=${req.id || '-'} ${err.message}`);
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Erro interno do servidor' });
    } else {
      res.status(500).json({ error: err.message });
    }
  });

  // 14. Socket.IO - restricted CORS
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? ['https://nexus-miner.onrender.com', process.env.APP_URL].filter(Boolean)
        : '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });
  global.__io = io;

  // Track connected sockets per user
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('[WS] Client connected:', socket.id);

    socket.on('join', (userId) => {
      socket.join(`user:${userId}`);
      socket.userId = userId;
      connectedUsers.set(socket.id, userId);
      console.log(`[WS] User ${userId} joined their room`);
    });

    socket.on('join-admin', () => {
      socket.join('admin');
      console.log('[WS] Admin joined admin room');
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
      console.log('[WS] Client disconnected:', socket.id);
    });
  });

  // Helpers
  global.__notifyUser = (userId, type, data) => {
    if (global.__io) global.__io.to(`user:${userId}`).emit(type, data);
  };

  global.__notifyAdmins = (type, data) => {
    if (global.__io) global.__io.to('admin').emit(type, data);
  };

  global.__broadcast = (type, data) => {
    if (global.__io) global.__io.emit(type, data);
  };

  // 15. Start server
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[OK] Nexus Miner rodando na porta ${config.port}`);
    console.log(`[SECURITY] Modo: ${process.env.NODE_ENV || 'development'}`);
    try { require('./services/backupService').startAutoBackup(); } catch {}

    // Auto-ping to keep Render awake
    const PING_INTERVAL_MS = 10 * 60 * 1000;
    const selfUrl = process.env.RENDER_EXTERNAL_URL
      ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
      : `http://localhost:${config.port}/api/health`;

    setInterval(async () => {
      try {
        const https = selfUrl.startsWith('https') ? require('https') : require('http');
        https.get(selfUrl, (res) => {
          console.log(`[PING] Auto-ping OK - status ${res.statusCode}`);
        }).on('error', (err) => {
          console.warn('[PING] Falha no auto-ping:', err.message);
        });
      } catch (e) {
        console.warn('[PING] Erro:', e.message);
      }
    }, PING_INTERVAL_MS);

    console.log(`[PING] Auto-ping ativado - ${selfUrl} (a cada 10 min)`);
  });
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
