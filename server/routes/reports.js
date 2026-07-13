/**
 * Reports Routes - Advanced metrics and analytics
 */

const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { getScoringStats } = require('../services/scoringService');

const router = express.Router();
router.use(authenticate);

// GET /api/reports/overview - Full business overview
router.get('/overview', (req, res) => {
  const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  const totalClients = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  const activeClients = db.prepare('SELECT COUNT(*) as count FROM clients WHERE active = 1').get().count;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid'").get().total;
  const totalExpenses = 0;

  // Pipeline breakdown
  const pipeline = db.prepare('SELECT pipeline_stage, COUNT(*) as count FROM leads GROUP BY pipeline_stage').all();

  // Leads by source
  const bySource = db.prepare('SELECT source, COUNT(*) as count FROM leads GROUP BY source ORDER BY count DESC').all();

  // Leads by city
  const byCity = db.prepare('SELECT city, COUNT(*) as count FROM leads WHERE city IS NOT NULL AND city != "" GROUP BY city ORDER BY count DESC LIMIT 10').all();

  // Conversion funnel
  const funnel = {
    total: totalLeads,
    contacted: db.prepare("SELECT COUNT(*) as count FROM leads WHERE pipeline_stage IN ('contato','proposta','fechado')").get().count,
    proposal: db.prepare("SELECT COUNT(*) as count FROM leads WHERE pipeline_stage IN ('proposta','fechado')").get().count,
    closed: db.prepare("SELECT COUNT(*) as count FROM leads WHERE pipeline_stage = 'fechado'").get().count,
    lost: db.prepare("SELECT COUNT(*) as count FROM leads WHERE pipeline_stage = 'perdido'").get().count,
  };
  funnel.conversionRate = funnel.total > 0 ? ((funnel.closed / funnel.total) * 100).toFixed(1) : 0;

  // Monthly trend (last 6 months)
  const monthlyTrend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM leads WHERE created_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month
  `).all();

  // Seller performance
  const sellerPerf = db.prepare(`
    SELECT u.name, u.username,
      COUNT(l.id) as total_leads,
      SUM(CASE WHEN l.pipeline_stage = 'fechado' THEN 1 ELSE 0 END) as closed,
      SUM(CASE WHEN l.pipeline_stage = 'perdido' THEN 1 ELSE 0 END) as lost
    FROM users u LEFT JOIN leads l ON u.id = l.assigned_to
    WHERE u.role = 'seller' AND u.active = 1
    GROUP BY u.id ORDER BY closed DESC
  `).all();

  const scoring = getScoringStats();

  res.json({
    totalLeads, totalClients, activeClients,
    totalRevenue, totalExpenses, profit: totalRevenue - totalExpenses,
    pipeline, bySource, byCity, funnel, monthlyTrend, sellerPerf, scoring,
  });
});

// GET /api/reports/seller/:id - Individual seller report
router.get('/seller/:id', (req, res) => {
  const seller = db.prepare('SELECT id, name, username, role FROM users WHERE id = ?').get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Vendedor nao encontrado' });

  const leads = db.prepare('SELECT * FROM leads WHERE assigned_to = ?').all(req.params.id);
  const byStage = db.prepare('SELECT pipeline_stage, COUNT(*) as count FROM leads WHERE assigned_to = ? GROUP BY pipeline_stage').all(req.params.id);
  const byMonth = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM leads WHERE assigned_to = ? AND created_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month
  `).all(req.params.id);

  const closed = leads.filter(l => l.pipeline_stage === 'fechado').length;
  const total = leads.length;

  res.json({
    seller,
    totalLeads: total,
    closedLeads: closed,
    conversionRate: total > 0 ? ((closed / total) * 100).toFixed(1) : 0,
    byStage, byMonth,
  });
});

module.exports = router;
