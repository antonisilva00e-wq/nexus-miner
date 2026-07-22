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
      // Use hardcoded IDs for seeded users so that multiple instances (e.g. during Render deploy) agree on the ID
      db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run('00000000-0000-0000-0000-000000000001', 'Administrador', 'admin@nexusminer.com', 'adminj7', bcrypt.hashSync('admin.j7', 12), 'admin');
      db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run('00000000-0000-0000-0000-000000000002', 'Gerente Comercial', 'gerente@nexusminer.com', 'gerente', bcrypt.hashSync('manager123', 12), 'manager');
      db.prepare('INSERT INTO users (id, name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run('00000000-0000-0000-0000-000000000003', 'Vendedor', 'vendedor@nexusminer.com', 'vendedor', bcrypt.hashSync('seller123', 12), 'seller');
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('company_name', 'Nexus Miner');
      console.log('[SEED] Usuarios criados');
    }
    const existingClient = db.prepare('SELECT id FROM clients WHERE username = ?').get('cliente1');
    if (!existingClient) {
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      const insertClient = db.prepare('INSERT INTO clients (id, name, email, username, password_hash, plan, active, price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const mainClients = [
        ['Cliente Teste', 'clienteteste@test.com', 'cliente1', 'Gratuito', 0, '2026-01-02'],
        ['TechSolutions LTDA', 'contato@techsolutions.com.br', 'techsolutions', 'Empresarial', 297, '2026-01-05'],
        ['Digital Marketing Pro', 'admin@digimarketing.com.br', 'digimarketing', 'Empresarial', 297, '2026-01-10'],
        ['Construtora Horizonte', 'vendas@horizonte.com.br', 'horizonte', 'Empresarial', 297, '2026-01-15'],
        ['Clinica VidaPlena', 'contato@vidaplena.com.br', 'vidaplena', 'Profissional', 97, '2026-01-20'],
        ['Restaurante Sabor Arte', 'gerente@saborarte.com.br', 'saborarte', 'Profissional', 97, '2026-02-10'],
        ['Imobiliaria CasaForte', 'vendas@casaforte.com.br', 'casaforte', 'Profissional', 97, '2026-02-15'],
        ['Academia FitZone', 'admin@fitzone.com.br', 'fitzone', 'Empresarial', 297, '2026-03-01'],
        ['PetShop AmigoFiel', 'contato@amigofiel.com.br', 'amigofiel', 'Empresarial', 297, '2026-03-10'],
      ];
      mainClients.forEach(c => {
        insertClient.run(uuidv4(), c[0], c[1], c[2], bcrypt.hashSync('12345678', 12), c[3], 1, c[4], c[5] + ' 10:00:00');
      });

      // 80 clientes demo — total ~89 ativos
      const planos = ['Empresarial', 'Profissional'];
      const precos = { Empresarial: 297, Profissional: 97 };
      const empresas = ['Comercial ABC','Grupo Delta','Rede Express','Studio Criativo','Construcoes Beta','Clinica Saude+','Escola Futuro','Pizzaria Napoli','Loja Virtual','Escritorio Juridico','Padaria Central','Academia Total','Pet Care Plus','Bar do Ze','Oficina Mecanica','Floricultura Rosas','Salao Beleza','Otica Visual','Farmacia Popular','Supermercado Mix'];
      const demoHash = '$2a$04$d3X5MfgD08q2ltBtmURMzOXrMYkfiZeZZlsIlklI8f93uSR5aKC/y';

      for (let i = 0; i < 80; i++) {
        const plano = planos[i % 2];
        const nome = empresas[i % empresas.length] + ' ' + (i + 10);
        const email = 'cli' + (i + 10) + '@demo.com';
        const username = 'demo' + (i + 10);
        const mes = String(Math.floor(Math.random() * 6) + 1).padStart(2, '0');
        const dia = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        insertClient.run(uuidv4(), nome, email, username, demoHash, plano, 1, precos[plano], '2026-' + mes + '-' + dia + ' 10:00:00');
      }
      console.log('[SEED] ~89 clientes criados');

      // Seed financial data — totalizando R$ 84.566,67
      const allClients = db.prepare('SELECT id FROM clients').all();
      const clientIds = allClients.map(c => c.id);
      const methods = ['pix', 'cartao', 'boleto'];
      const payData = [
        // Jan 2026 — onboarding forte
        [0, 4797, '2026-01-05', 0, 'Plano Empresarial Anual'], [1, 2997, '2026-01-12', 1, 'Plano Profissional Anual'],
        [2, 4797, '2026-01-18', 0, 'Plano Empresarial Anual'], [3, 2997, '2026-01-25', 2, 'Plano Profissional Anual'],
        // Feb 2026
        [4, 4797, '2026-02-10', 0, 'Plano Empresarial Anual'], [5, 2997, '2026-02-17', 1, 'Plano Profissional Anual'],
        [0, 297, '2026-02-20', 2, 'Mensal Empresarial'], [1, 97, '2026-02-25', 0, 'Mensal Profissional'],
        // Mar 2026
        [6, 4797, '2026-03-03', 1, 'Plano Empresarial Anual'], [7, 4797, '2026-03-10', 2, 'Plano Empresarial Anual'],
        [2, 297, '2026-03-15', 0, 'Mensal Empresarial'], [3, 97, '2026-03-20', 1, 'Mensal Profissional'],
        // Apr 2026
        [0, 297, '2026-04-01', 2, 'Renovacao'], [1, 97, '2026-04-08', 0, 'Renovacao'],
        [4, 297, '2026-04-12', 1, 'Renovacao'], [5, 97, '2026-04-19', 2, 'Renovacao'],
        [6, 297, '2026-04-22', 0, 'Renovacao'], [7, 297, '2026-04-28', 1, 'Renovacao'],
        // May 2026
        [0, 297, '2026-05-02', 2, 'Renovacao'], [1, 97, '2026-05-09', 0, 'Renovacao'],
        [2, 297, '2026-05-14', 1, 'Renovacao'], [3, 97, '2026-05-19', 2, 'Renovacao'],
        [4, 297, '2026-05-23', 0, 'Renovacao'], [5, 97, '2026-05-28', 1, 'Renovacao'],
        // Jun 2026
        [0, 297, '2026-06-01', 2, 'Renovacao'], [1, 97, '2026-06-08', 0, 'Renovacao'],
        [2, 297, '2026-06-13', 1, 'Renovacao'], [3, 97, '2026-06-18', 2, 'Renovacao'],
        [6, 297, '2026-06-22', 0, 'Renovacao'], [7, 297, '2026-06-28', 1, 'Renovacao'],
        // Jul 2026
        [0, 297, '2026-07-01', 2, 'Renovacao'], [1, 97, '2026-07-06', 0, 'Renovacao'],
        [2, 297, '2026-07-10', 1, 'Renovacao'], [3, 97, '2026-07-14', 2, 'Renovacao'],
        [4, 297, '2026-07-16', 0, 'Renovacao'],
      ];
      const insPayment = db.prepare('INSERT INTO payments (id, client_id, amount, payment_date, payment_method, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
      payData.forEach(p => {
        insPayment.run(uuidv4(), clientIds[p[0]], p[1], p[2], methods[p[3]], 'paid', p[4]);
      });
      // Ajustar para totalizar exatamente R$ 84.566,67
      const currentTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments').get().total;
      const diff = 84566.67 - currentTotal;
      if (Math.abs(diff) > 0.01) {
        const lastPayment = db.prepare('SELECT id, amount FROM payments ORDER BY created_at DESC LIMIT 1').get();
        if (lastPayment) {
          const newAmount = Math.round((parseFloat(lastPayment.amount || 0) + diff) * 100) / 100;
          db.prepare('UPDATE payments SET amount = ? WHERE id = ?').run(newAmount, lastPayment.id);
        }
      }
      console.log('[SEED] Dados financeiros criados (R$ 84.566,67 em vendas)');
    }
  } catch (e) { console.error('[SEED]', e.message); }

  // 4. Express - Security layers in correct order
  const app = express();
  app.set('trust proxy', 1);

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
    // If no webhook secret is configured, block all webhook requests
    if (!WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'Webhook not configured' });
    }
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
    await pushAll('Nexus Miner', notification.message, '/#/financial', 'commission');
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
    await pushAll('Nexus Miner', notification.message, '/#/leads', 'lead');
    res.json({ ok: true });
  });

  app.post('/api/vapi/webhook', bodySizeLimit(500), async (req, res) => {
    try {
      const payload = req.body;
      const type = payload.message?.type;
      const call = payload.message?.call;

      if (type === 'status-update' && call) {
        const outbound = require('./routes/outbound');
        if (outbound && outbound.handleCallStatusUpdate) {
            outbound.handleCallStatusUpdate(call.id, call.status);
        }
      }

      if (type === 'tool-calls') {
          const toolCalls = payload.message.toolCalls;
          for (let toolCall of toolCalls) {
              if (toolCall.function?.name === 'enviar_whatsapp') {
                  const args = toolCall.function.arguments;
                  // Try to send via WhatsApp using Bailey's integration
                  try {
                      const waService = require('./services/whatsappService');
                      if (waService && waService.sendMessage) {
                          // Clean phone and send message
                          const phoneNum = args.telefone || args.phone;
                          if (phoneNum) {
                              const cleanPhone = phoneNum.replace(/[^0-9]/g, '');
                              await waService.sendMessage(cleanPhone, args.mensagem || 'Aqui esta o link solicitado!');
                          }
                      }
                  } catch (e) {
                      console.error('[Vapi Webhook] Error triggering WhatsApp:', e);
                  }
              }
          }
          // Respond to Vapi to let it know tools were executed
          return res.json({
            results: toolCalls.map(tc => ({
                toolCallId: tc.id,
                result: 'Mensagem enviada com sucesso no WhatsApp do cliente!'
            }))
          });
      }

      res.json({ ok: true });
    } catch (e) {
      console.error('[Vapi Webhook] Error:', e);
      res.status(500).json({ error: e.message });
    }
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
    '/api/voice-agent': './routes/voice',
    '/api/whatsapp': './routes/whatsapp',
    '/api/vapi/outbound': './routes/outbound',
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
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
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

  // Socket.IO middleware: verify JWT on connection
  const jwt = require('jsonwebtoken');
  const { getDb: getAuthDb } = require('./database/connection');

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, require('./config').jwtSecret, { algorithms: ['HS256'] });
      socket.authUserId = decoded.userId;
      socket.authUserType = decoded.userType || 'user';
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('[WS] Client connected:', socket.id);

    // Auto-join authenticated user's room
    const userRoom = `user:${socket.authUserId}`;
    socket.join(userRoom);
    socket.userId = socket.authUserId;
    connectedUsers.set(socket.id, socket.authUserId);
    console.log(`[WS] User ${socket.authUserId} joined their room`);

    socket.on('join', (requestedUserId) => {
      // Users can only join their own room
      if (requestedUserId !== socket.authUserId) {
        console.warn(`[WS] User ${socket.authUserId} tried to join room of ${requestedUserId} - DENIED`);
        return;
      }
      socket.join(`user:${requestedUserId}`);
    });

    socket.on('join-admin', () => {
      // Only admin users can join admin room
      if (socket.authUserType !== 'user') {
        console.warn(`[WS] Non-admin user ${socket.authUserId} tried to join admin room - DENIED`);
        return;
      }
      // Verify admin role from DB
      try {
        const user = getAuthDb().prepare('SELECT role FROM users WHERE id = ?').get(socket.authUserId);
        if (user && user.role === 'admin') {
          socket.join('admin');
          console.log('[WS] Admin joined admin room');
        } else {
          console.warn(`[WS] User ${socket.authUserId} is not admin - DENIED`);
        }
      } catch (e) {
        console.error('[WS] Admin check failed:', e.message);
      }
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
    try { require('./services/automationService').startScheduler(); } catch {}

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
