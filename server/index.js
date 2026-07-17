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

  // 2. Schema
  const { createSchema } = require('./database/schema');
  createSchema(db);

  // 3. Auto-seed
  try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (!existing) {
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), 'Administrador', 'admin@nexusminer.com', 'admin', bcrypt.hashSync('admin123', 12), 'admin');
      db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), 'Gerente Comercial', 'gerente@nexusminer.com', 'gerente', bcrypt.hashSync('manager123', 12), 'manager');
      db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), 'Vendedor', 'vendedor@nexusminer.com', 'vendedor', bcrypt.hashSync('seller123', 12), 'seller');
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('company_name', 'Nexus Miner');
      console.log('[SEED] UsuÃ¡rios criados');
    }
    // Auto-seed test client
    const existingClient = db.prepare('SELECT id FROM clients WHERE username = ?').get('cliente1');
    if (!existingClient) {
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      db.prepare('INSERT INTO clients (id, name, email, username, password_hash, plan, active) VALUES (?, ?, ?, ?, ?, ?, ?)').run(uuidv4(), 'Cliente Teste', 'clienteteste@test.com', 'cliente1', bcrypt.hashSync('12345678', 12), 'Gratuito', 1);
      console.log('[SEED] Cliente teste criado (cliente1 / 12345678)');
    }
  } catch (e) { console.error('[SEED]', e.message); }

  // 4. Express
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(require('cors')({ origin: '*' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
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

  // 5. Push helper - reads template from DB and sends push notifications
  const { sendPush, broadcast } = require('./services/pushService');

  global.__notify = (type, title, message, data = {}) => {
    // For sale notifications, read custom template from settings
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

    // Send via Socket.IO (real-time in panel)
    if (data.userId && global.__io) {
      global.__io.to(`user:${data.userId}`).emit('notification', notification);
    } else if (global.__io) {
      global.__io.emit('notification', notification);
    }

    // Send push notification to devices (arrives on phone/desktop)
    try {
      const urlMap = { sale: '/#/financial', commission: '/#/financial', lead: '/#/leads', info: '/#/dashboard' };
      const pushUrl = data.url || urlMap[type] || '/#/dashboard';
      const subs = db.prepare('SELECT * FROM push_subscriptions').all();
      if (subs.length) {
        const subscriptions = subs.map(s => ({ endpoint: s.endpoint, keys: { p256dh: s.keys_p256dh, auth: s.keys_auth } }));
        broadcast(subscriptions, { title: 'Nexus Miner', message, url: pushUrl, type }).catch(() => {});
      }
    } catch {}

    return notification;
  };

  // 6. Health check (for Render)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' });
  });

  // 7. Config
  app.get('/api/config', (req, res) => {
    res.json({ onesignalAppId: process.env.ONESIGNAL_APP_ID || '' });
  });

  // 8. Webhooks

  // Helper: send push to all subscribers
  async function pushAll(title, message, url, type) {
    try {
      const subs = db.prepare('SELECT * FROM push_subscriptions').all();
      const subscriptions = subs.map(s => ({ endpoint: s.endpoint, keys: { p256dh: s.keys_p256dh, auth: s.keys_auth } }));
      if (subscriptions.length) await broadcast(subscriptions, { title, message, url, type });
    } catch {}
  }

  app.post('/api/webhook/sale', async (req, res) => {
    const { leadId, clientName, value, seller } = req.body;
    const formattedVal = parseFloat(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Read custom notification template from settings
    let saleMessage = `Venda concluída: ${formattedVal}`;
    try {
      const template = db.prepare("SELECT value FROM settings WHERE key = 'notification_sale_message'").get();
      if (template && template.value) {
        saleMessage = template.value.replace(/\{valor\}/g, formattedVal);
      }
    } catch {}

    const notification = {
      type: 'sale',
      title: 'Nexus Miner',
      message: saleMessage,
      timestamp: new Date().toISOString()
    };
    if (global.__io) global.__io.emit('notification', notification);
    await pushAll('Nexus Miner', notification.message, '/#/financial', 'sale');
    res.json({ ok: true, notification });
  });
  app.post('/api/webhook/commission', async (req, res) => {
    const { sellerName, amount } = req.body;
    const formattedVal = parseFloat(amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const notification = { 
      type: 'commission', 
      title: 'Nexus Miner', 
      message: `Comissão recebida: ${formattedVal} — Indicação de ${sellerName || 'Parceiro'}`, 
      timestamp: new Date().toISOString() 
    };
    if (global.__io) global.__io.emit('notification', notification);
    await pushAll('Nexus Miner', notification.message, '/#/financial', 'commission');
    res.json({ ok: true, notification });
  });
  app.post('/api/webhook/lead', async (req, res) => {
    const { leadName, source, score } = req.body;
    const notification = { 
      type: 'lead', 
      title: 'Nexus Miner', 
      message: `Lead capturado: ${leadName || 'Lead'} — Origem: ${source || 'Mineração'}`, 
      timestamp: new Date().toISOString() 
    };
    if (global.__io) global.__io.emit('notification', notification);
    await pushAll('Nexus Miner', notification.message, '/#/leads', 'lead');
    res.json({ ok: true, notification });
  });

  // 9. Routes â€” load all routes with auth but NO global security middleware
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

  // 10. Send notification to specific user
  app.post('/api/notifications/send', (req, res) => {
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

    // Send via Socket.IO to specific user room
    if (global.__io) {
      global.__io.to(`user:${userId}`).emit('notification', notification);
    }

    // Also send push notification if user has subscription
    try {
      const sub = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').get(userId);
      if (sub) {
        const subscription = { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } };
        sendPush(subscription, { title: 'Nexus Miner', message, url: '/#/dashboard', type });
      }
    } catch {}

    res.json({ ok: true, notification, sentTo: userId });
  });

  // 11. Get all online users
  app.get('/api/notifications/users', (req, res) => {
    try {
      const users = db.prepare('SELECT id, name, username, role FROM users WHERE active = 1').all();
      const clients = db.prepare('SELECT id, name, username FROM clients WHERE active = 1').all();
      res.json({ users: [...users, ...clients.map(c => ({ ...c, role: 'client' }))] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 12. SPA - only serve index.html for non-API GET requests
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  // 11. Error
  app.use((req, res) => res.status(404).json({ error: 'Rota nao encontrada' }));
  app.use((err, req, res, next) => { console.error('[ERR]', err.message); res.status(500).json({ error: 'Erro interno' }); });

  // 12. Socket.IO + Start
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  global.__io = io;

  // Socket.IO events
  io.on('connection', (socket) => {
    console.log('[WS] Client connected:', socket.id);

    // Join user-specific room
    socket.on('join', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`[WS] User ${userId} joined their room`);
    });

    // Join admin room
    socket.on('join-admin', () => {
      socket.join('admin');
      console.log('[WS] Admin joined admin room');
    });

    socket.on('disconnect', () => {
      console.log('[WS] Client disconnected:', socket.id);
    });
  });

  // Helper: notify specific user
  global.__notifyUser = (userId, type, data) => {
    if (global.__io) global.__io.to(`user:${userId}`).emit(type, data);
  };

  // Helper: notify all admins
  global.__notifyAdmins = (type, data) => {
    if (global.__io) global.__io.to('admin').emit(type, data);
  };

  // Helper: broadcast to all clients
  global.__broadcast = (type, data) => {
    if (global.__io) global.__io.emit(type, data);
  };

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[OK] Nexus Miner rodando na porta ${config.port}`);
    try { require('./services/backupService').startAutoBackup(); } catch {}

    // Auto-ping: mantém o servidor sempre acordado no Render (evita hibernação)
    const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos
    const selfUrl = process.env.RENDER_EXTERNAL_URL
      ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
      : `http://localhost:${config.port}/api/health`;

    setInterval(async () => {
      try {
        const https = selfUrl.startsWith('https') ? require('https') : require('http');
        https.get(selfUrl, (res) => {
          console.log(`[PING] Auto-ping OK — status ${res.statusCode}`);
        }).on('error', (err) => {
          console.warn('[PING] Falha no auto-ping:', err.message);
        });
      } catch (e) {
        console.warn('[PING] Erro:', e.message);
      }
    }, PING_INTERVAL_MS);

    console.log(`[PING] Auto-ping ativado → ${selfUrl} (a cada 10 min)`);
  });
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });

// Last deploy: 2026-07-16 20:02:00
