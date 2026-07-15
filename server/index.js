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
      console.log('[SEED] Usuários criados');
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

  // 5. Push helper
  global.__notify = (type, title, message, data = {}) => {
    const notification = { type, title, message, timestamp: new Date().toISOString(), data };
    if (global.__io) global.__io.emit('notification', notification);
    return notification;
  };

  // 6. Config
  app.get('/api/config', (req, res) => {
    res.json({ onesignalAppId: process.env.ONESIGNAL_APP_ID || '' });
  });

  // 7. Webhooks
  const { sendPush, broadcast } = require('./services/pushService');

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
    const notification = { type: 'sale', title: 'Nova Venda!', message: `${clientName || 'Cliente'} — R$ ${(value || 0).toLocaleString('pt-BR')}`, timestamp: new Date().toISOString() };
    if (global.__io) global.__io.emit('notification', notification);
    await pushAll('💰 Nova Venda!', notification.message, '/#/financial', 'sale');
    res.json({ ok: true, notification });
  });
  app.post('/api/webhook/commission', async (req, res) => {
    const { sellerName, amount } = req.body;
    const notification = { type: 'commission', title: 'Comissão Recebida!', message: `${sellerName || 'Vendedor'} — R$ ${(amount || 0).toLocaleString('pt-BR')}`, timestamp: new Date().toISOString() };
    if (global.__io) global.__io.emit('notification', notification);
    await pushAll('🏆 Comissão!', notification.message, '/#/financial', 'commission');
    res.json({ ok: true, notification });
  });
  app.post('/api/webhook/lead', async (req, res) => {
    const { leadName, source, score } = req.body;
    const notification = { type: 'lead', title: 'Novo Lead!', message: `${leadName || 'Lead'} — Score: ${score || 0}`, timestamp: new Date().toISOString() };
    if (global.__io) global.__io.emit('notification', notification);
    await pushAll('🎯 Novo Lead!', notification.message, '/#/leads', 'lead');
    res.json({ ok: true, notification });
  });

  // 8. Routes — load all routes with auth but NO global security middleware
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
  };
  for (const [mount, file] of Object.entries(routeMap)) {
    try { app.use(mount, require(file)); } catch (e) { console.error(`[ROUTE] ${mount}:`, e.message); }
  }

  // 9. SPA
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  // 10. Error
  app.use((req, res) => res.status(404).json({ error: 'Rota nao encontrada' }));
  app.use((err, req, res, next) => { console.error('[ERR]', err.message); res.status(500).json({ error: 'Erro interno' }); });

  // 11. Socket.IO + Start
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  global.__io = io;
  io.on('connection', (socket) => { socket.on('disconnect', () => {}); });

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[OK] Nexus Miner rodando na porta ${config.port}`);
    try { require('./services/backupService').startAutoBackup(); } catch {}
  });
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
