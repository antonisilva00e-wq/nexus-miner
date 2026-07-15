const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { generateId } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// GET /api/financial/dashboard
router.get('/dashboard', (req, res) => {
  const mrr = db.prepare('SELECT COALESCE(SUM(price), 0) as total FROM clients WHERE active = 1').get().total;
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = \'paid\'').get().total;
  const totalClients = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  const activeClients = db.prepare('SELECT COUNT(*) as count FROM clients WHERE active = 1').get().count;
  const cancelledClients = db.prepare(`SELECT COUNT(*) as count FROM clients WHERE active = 0`).get().count;
  const churnRate = totalClients > 0 ? ((cancelledClients / totalClients) * 100).toFixed(1) : 0;

  // MRR by plan
  const mrrByPlan = db.prepare('SELECT plan, SUM(price) as total, COUNT(*) as count FROM clients WHERE active = 1 GROUP BY plan').all();

  // Monthly revenue (last 12 months)
  const monthlyRevenue = db.prepare(`
    SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as total
    FROM payments WHERE status = 'paid' AND payment_date >= date('now', '-12 months')
    GROUP BY month ORDER BY month
  `).all();

  // Upcoming expirations
  const expiringClients = db.prepare(`
    SELECT name, plan, expiry, price FROM clients
    WHERE active = 1 AND expiry IS NOT NULL AND expiry >= date('now') AND expiry <= date('now', '+30 days')
    ORDER BY expiry LIMIT 10
  `).all();

  // Forecast (next 3 months based on current MRR)
  const forecast = [];
  for (let i = 1; i <= 3; i++) {
    forecast.push({
      month: new Date(Date.now() + i * 30 * 86400000).toISOString().slice(0, 7),
      estimated: mrr
    });
  }

  res.json({ mrr, totalRevenue, totalClients, activeClients, cancelledClients, churnRate: parseFloat(churnRate), mrrByPlan, monthlyRevenue, expiringClients, forecast });
});

// GET /api/financial/payments
router.get('/payments', (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (Math.max(1, page) - 1) * limit;
  const total = db.prepare('SELECT COUNT(*) as count FROM payments').get().count;
  const payments = db.prepare(`
    SELECT p.*, c.name as client_name FROM payments p
    LEFT JOIN clients c ON p.client_id = c.id
    ORDER BY p.payment_date DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ payments, total });
});

// POST /api/financial/payments
router.post('/payments', (req, res) => {
  const { client_id, subscription_id, amount, payment_date, payment_method, notes } = req.body;
  if (!client_id || !amount || !payment_date) {
    return res.status(400).json({ error: 'Cliente, valor e data são obrigatórios' });
  }

  const id = generateId();
  db.prepare('INSERT INTO payments (id, subscription_id, client_id, amount, payment_date, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, subscription_id || null, client_id, amount, payment_date, payment_method || null, notes || null);

  // Real-time notification for sale
  const client = db.prepare('SELECT name FROM clients WHERE id = ?').get(client_id);
  if (global.__notify) {
    global.__notify('sale', 'Nova Venda!', `${client?.name || 'Cliente'} — R$ ${parseFloat(amount).toLocaleString('pt-BR')}`, { paymentId: id, clientId: client_id });
  }

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  res.status(201).json({ payment });
});

// GET /api/financial/subscriptions
router.get('/subscriptions', (req, res) => {
  const subs = db.prepare(`
    SELECT s.*, c.name as client_name FROM subscriptions s
    LEFT JOIN clients c ON s.client_id = c.id
    ORDER BY s.created_at DESC
  `).all();
  res.json({ subscriptions: subs });
});

// POST /api/financial/subscriptions
router.post('/subscriptions', (req, res) => {
  const { client_id, plan, amount, start_date, end_date, payment_method, notes } = req.body;
  if (!client_id || !plan || !amount || !start_date || !end_date) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  const id = generateId();
  db.prepare('INSERT INTO subscriptions (id, client_id, plan, amount, start_date, end_date, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, client_id, plan, amount, start_date, end_date, payment_method || null, notes || null);

  // Update client plan
  db.prepare('UPDATE clients SET plan = ?, price = ?, expiry = ? WHERE id = ?')
    .run(plan, amount, end_date, client_id);

  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  res.status(201).json({ subscription: sub });
});

module.exports = router;
