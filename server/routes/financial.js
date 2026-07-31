const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { generateId } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// Função auxiliar para multi-tenant: Admin vê tudo (1=1), Gerente vê apenas o que criou
const getWhere = (req, prefix = '') => {
  return req.user.role === 'admin' ? '1=1' : `${prefix}created_by = '${req.user.id}'`;
};

// GET /api/financial/dashboard
router.get('/dashboard', (req, res) => {
  const whereC = getWhere(req);
  const whereP = getWhere(req);

  const mrr = db.prepare(`SELECT COALESCE(SUM(price), 0) as total FROM clients WHERE active = 1 AND ${whereC}`).get().total;
  const totalRevenue = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid' AND ${whereP}`).get().total;
  const totalClients = db.prepare(`SELECT COUNT(*) as count FROM clients WHERE ${whereC}`).get().count;
  const activeClients = db.prepare(`SELECT COUNT(*) as count FROM clients WHERE active = 1 AND ${whereC}`).get().count;
  const cancelledClients = db.prepare(`SELECT COUNT(*) as count FROM clients WHERE active = 0 AND ${whereC}`).get().count;
  const churnRate = totalClients > 0 ? ((cancelledClients / totalClients) * 100).toFixed(1) : 0;

  // MRR by plan
  const mrrByPlan = db.prepare(`SELECT plan, SUM(price) as total, COUNT(*) as count FROM clients WHERE active = 1 AND ${whereC} GROUP BY plan`).all();

  // Monthly revenue (last 12 months)
  const monthlyRevenue = db.prepare(`
    SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as total
    FROM payments WHERE status = 'paid' AND payment_date >= date('now', '-12 months') AND ${whereP}
    GROUP BY month ORDER BY month
  `).all();

  // Upcoming expirations
  const expiringClients = db.prepare(`
    SELECT name, plan, expiry, price FROM clients
    WHERE active = 1 AND expiry IS NOT NULL AND expiry >= date('now') AND expiry <= date('now', '+30 days') AND ${whereC}
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
  const whereP = getWhere(req, 'p.');
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM payments p WHERE ${whereP}`).get().count;
  const payments = db.prepare(`
    SELECT p.*, c.name as client_name FROM payments p
    LEFT JOIN clients c ON p.client_id = c.id
    WHERE ${whereP}
    ORDER BY p.payment_date DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ payments, total });
});

// POST /api/financial/payments
router.post('/payments', (req, res) => {
  const { client_id, subscription_id, amount, payment_date, payment_method, notes } = req.body;
  
  const id = generateId();
  db.prepare('INSERT INTO payments (id, subscription_id, client_id, amount, payment_date, payment_method, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, subscription_id || null, client_id || null, amount, payment_date, payment_method || null, notes || null, req.user.id);

  if (global.__notify) {
    const formattedVal = parseFloat(amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    global.__notify('sale', 'Nexus Miner', `Nova venda registrada (${req.user.name}): ${formattedVal}`, { paymentId: id });
  }

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  res.status(201).json({ payment });
});

// GET /api/financial/subscriptions
router.get('/subscriptions', (req, res) => {
  res.json({ subscriptions: [] });
});

module.exports = router;
