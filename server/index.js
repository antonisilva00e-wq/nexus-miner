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
      console.log('[SEED] Usuários criados');
    }
  } catch (e) {
    console.error('[SEED] Erro:', e.message);
  }

  // 4. Express app
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(require('cors')({ origin: '*' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public'), { dotfiles: 'deny', index: false }));

  // 5. Push notification helper
  global.__notify = (type, title, message, data = {}) => {
    const notification = { type, title, message, timestamp: new Date().toISOString(), data };
    if (global.__io) global.__io.emit('notification', notification);
    return notification;
  };

  // 6. Config endpoint
  app.get('/api/config', (req, res) => {
    res.json({ onesignalAppId: process.env.ONESIGNAL_APP_ID || '' });
  });

  // 7. Debug endpoint
  app.get('/api/debug', (req, res) => {
    const users = db.prepare('SELECT id, username, role FROM users').all();
    res.json({ users, count: users.length });
  });

  // 8. API routes (try/catch each to prevent crash)
  const routes = [
    ['/api/auth', './routes/auth'],
    ['/api/leads', './routes/leads'],
    ['/api/pipeline', './routes/pipeline'],
    ['/api/clients', './routes/clients'],
    ['/api/users', './routes/users'],
    ['/api/dashboard', './routes/dashboard'],
    ['/api/financial', './routes/financial'],
    ['/api/templates', './routes/templates'],
    ['/api/messages', './routes/messages'],
    ['/api/apikeys', './routes/apikeys'],
    ['/api/activities', './routes/activities'],
    ['/api/rfsearch', './routes/rfsearch'],
    ['/api/export', './routes/export'],
    ['/api/scoring', './routes/scoring'],
    ['/api/automation', './routes/automation'],
    ['/api/reports', './routes/reports'],
    ['/api/plans', './routes/plans'],
    ['/api/integrations', './routes/integrations'],
    ['/api/referrals', './routes/referrals'],
    ['/api/push', './routes/push'],
  ];

  for (const [mount, routePath] of routes) {
    try {
      app.use(mount, require(routePath));
    } catch (e) {
      console.error(`[ROUTE] Erro ao carregar ${mount}:`, e.message);
    }
  }

  // 9. SPA fallback
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
  });

  // 10. 404
  app.use((req, res) => {
    res.status(404).json({ error: 'Rota nao encontrada' });
  });

  // 11. Error handler
  app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  });

  // 12. Socket.IO
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  global.__io = io;
  io.on('connection', (socket) => {
    console.log('[SOCKET] Conectado:', socket.id);
    socket.on('disconnect', () => {});
  });

  // 13. Start
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[OK] Nexus Miner rodando na porta ${config.port}`);
  });
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
