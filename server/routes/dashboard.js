const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Period filter helper
function getPeriodFilter(period) {
  switch (period) {
    case '7d': return "date('now', '-7 days')";
    case '30d': return "date('now', '-30 days')";
    case '90d': return "date('now', '-90 days')";
    case '12m': return "date('now', '-12 months')";
    default: return "date('now', '-30 days')";
  }
}

function getPrevPeriodFilter(period) {
  switch (period) {
    case '7d': return { current: "date('now', '-7 days')", prev: "date('now', '-14 days')", label: 'semana anterior' };
    case '30d': return { current: "date('now', '-30 days')", prev: "date('now', '-60 days')", label: 'mes anterior' };
    case '90d': return { current: "date('now', '-90 days')", prev: "date('now', '-180 days')", label: 'trimestre anterior' };
    case '12m': return { current: "date('now', '-12 months')", prev: "date('now', '-24 months')", label: 'ano anterior' };
    default: return { current: "date('now', '-30 days')", prev: "date('now', '-60 days')", label: 'mes anterior' };
  }
}

// GET /api/dashboard/overview
router.get('/overview', (req, res) => {
  try {
    const period = req.query.period || '30d';
    const isSeller = req.user.role === 'seller';
    const sellerFilter = isSeller ? 'AND assigned_to = ?' : '';
    const sellerParam = isSeller ? [req.user.id] : [];
    const periodDate = getPeriodFilter(period);
    const prev = getPrevPeriodFilter(period);

    const totalLeads = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE 1=1 ${sellerFilter}`).get(...sellerParam).count;
    const newLeadsPeriod = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE created_at >= ${periodDate} ${sellerFilter}`).get(...sellerParam).count;
    const newLeadsPrev = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE created_at >= ${prev.prev} AND created_at < ${prev.current} ${sellerFilter}`).get(...sellerParam).count;
    const closedLeads = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE pipeline_stage = 'fechado' ${sellerFilter}`).get(...sellerParam).count;
    const closedLeadsPrev = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE pipeline_stage = 'fechado' AND created_at >= ${prev.prev} AND created_at < ${prev.current} ${sellerFilter}`).get(...sellerParam).count;
    const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : 0;

    const totalClients = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
    const activeClients = db.prepare(`SELECT COUNT(*) as count FROM clients WHERE active = 1 AND expiry >= date('now')`).get().count;
    const mrr = db.prepare('SELECT COALESCE(SUM(price), 0) as total FROM clients WHERE active = 1').get().total;

    let recentActivities = [];
    try {
      recentActivities = db.prepare(`
        SELECT a.*, u.name as user_name
        FROM activities a LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC LIMIT 10
      `).all();
    } catch {}

    // Calculate trends
    const leadsTrend = newLeadsPrev > 0 ? (((newLeadsPeriod - newLeadsPrev) / newLeadsPrev) * 100).toFixed(0) : 0;
    const closedTrend = closedLeadsPrev > 0 ? (((closedLeads - closedLeadsPrev) / closedLeadsPrev) * 100).toFixed(0) : 0;

    res.json({
      totalLeads,
      newLeadsPeriod,
      newLeadsPrev,
      closedLeads,
      closedLeadsPrev,
      conversionRate: parseFloat(conversionRate),
      totalClients,
      activeClients,
      mrr,
      recentActivities,
      trends: { leads: parseInt(leadsTrend), closed: parseInt(closedTrend) },
      period,
      periodLabel: prev.label,
    });
  } catch (err) {
    console.error('[DASHBOARD] Overview error:', err.message);
    res.json({
      totalLeads: 0, newLeadsPeriod: 0, newLeadsPrev: 0,
      closedLeads: 0, closedLeadsPrev: 0, conversionRate: 0,
      totalClients: 0, activeClients: 0, mrr: 0,
      recentActivities: [], trends: { leads: 0, closed: 0 },
      period: req.query.period || '30d', periodLabel: 'mes anterior',
    });
  }
});

// GET /api/dashboard/leads-chart - Leads by month
router.get('/leads-chart', (req, res) => {
  try {
    const period = req.query.period || '30d';
    const isSeller = req.user.role === 'seller';
    const sellerFilter = isSeller ? 'AND assigned_to = ?' : '';
    const sellerParam = isSeller ? [req.user.id] : [];

    let groupBy;
    if (period === '7d' || period === '30d') {
      groupBy = "strftime('%Y-%m-%d', created_at)";
    } else if (period === '90d') {
      groupBy = "strftime('%Y-W%W', created_at)";
    } else {
      groupBy = "strftime('%Y-%m', created_at)";
    }

    const periodDate = getPeriodFilter(period);
    const data = db.prepare(`
      SELECT ${groupBy} as period, COUNT(*) as count
      FROM leads WHERE created_at >= ${periodDate} ${sellerFilter}
      GROUP BY 1 ORDER BY 1
    `).all(...sellerParam);

    res.json({ data });
  } catch (err) {
    console.error('[DASHBOARD] Leads chart error:', err.message);
    res.json({ data: [] });
  }
});

// GET /api/dashboard/pipeline-chart
router.get('/pipeline-chart', (req, res) => {
  try {
    const isSeller = req.user.role === 'seller';
    const sellerFilter = isSeller ? 'AND assigned_to = ?' : '';
    const sellerParam = isSeller ? [req.user.id] : [];

    const data = db.prepare(`
      SELECT pipeline_stage, COUNT(*) as count
      FROM leads WHERE 1=1 ${sellerFilter}
      GROUP BY pipeline_stage
    `).all(...sellerParam);

    res.json({ data });
  } catch (err) {
    console.error('[DASHBOARD] Pipeline chart error:', err.message);
    res.json({ data: [] });
  }
});

// GET /api/dashboard/top-sellers
router.get('/top-sellers', (req, res) => {
  try {
    if (req.user.role === 'seller') return res.json({ sellers: [] });

    const sellers = db.prepare(`
      SELECT u.name, u.username, COUNT(l.id) as lead_count,
        SUM(CASE WHEN l.pipeline_stage = 'fechado' THEN 1 ELSE 0 END) as closed_count
      FROM users u LEFT JOIN leads l ON u.id = l.assigned_to
      WHERE u.role = 'seller' AND u.active = 1
      GROUP BY u.id ORDER BY closed_count DESC, lead_count DESC LIMIT 5
    `).all();

    res.json({ sellers });
  } catch (err) {
    console.error('[DASHBOARD] Top sellers error:', err.message);
    res.json({ sellers: [] });
  }
});

// GET /api/dashboard/alerts - Smart alerts
router.get('/alerts', (req, res) => {
  try {
    const alerts = [];

  // Leads without contact in 7+ days
  const staleLeads = db.prepare(`
    SELECT COUNT(*) as count FROM leads
    WHERE pipeline_stage = 'leads' AND created_at <= date('now', '-7 days')
  `).get().count;
  if (staleLeads > 0) {
    alerts.push({ type: 'warning', icon: 'clock', message: `${staleLeads} leads sem contato ha 7+ dias`, action: 'leads' });
  }

  // Clients with expiring subscriptions (next 7 days)
  const expiringClients = db.prepare(`
    SELECT COUNT(*) as count FROM clients
    WHERE active = 1 AND expiry BETWEEN date('now') AND date('now', '+7 days')
  `).get().count;
  if (expiringClients > 0) {
    alerts.push({ type: 'danger', icon: 'alert-triangle', message: `${expiringClients} assinatura(s) vencendo em 7 dias`, action: 'clients' });
  }

  // Leads in proposal stage (pending decisions)
  const pendingProposals = db.prepare(`
    SELECT COUNT(*) as count FROM leads WHERE pipeline_stage = 'proposta'
  `).get().count;
  if (pendingProposals > 0) {
    alerts.push({ type: 'info', icon: 'file-text', message: `${pendingProposals} propostas pendentes de resposta`, action: 'kanban' });
  }

  // Leads won today
  const wonToday = db.prepare(`
    SELECT COUNT(*) as count FROM leads
    WHERE pipeline_stage = 'fechado' AND date(created_at) = date('now')
  `).get().count;
  if (wonToday > 0) {
    alerts.push({ type: 'success', icon: 'check-circle', message: `${wonToday} lead(s) fechado(s) hoje!`, action: 'dashboard' });
  }

  // Leads lost this week
  const lostWeek = db.prepare(`
    SELECT COUNT(*) as count FROM leads
    WHERE pipeline_stage = 'perdido' AND created_at >= date('now', '-7 days')
  `).get().count;
  if (lostWeek > 0) {
    alerts.push({ type: 'warning', icon: 'x-circle', message: `${lostWeek} lead(s) perdido(s) esta semana`, action: 'kanban' });
  }

    res.json({ alerts });
  } catch (err) {
    console.error('[DASHBOARD] Alerts error:', err.message);
    res.json({ alerts: [] });
  }
});

// GET /api/dashboard/geo - Geographic distribution
router.get('/geo', (req, res) => {
  try {
    const byState = db.prepare(`
      SELECT state, COUNT(*) as count FROM leads
      WHERE state IS NOT NULL AND state != ''
      GROUP BY state ORDER BY count DESC
    `).all();

    const byCity = db.prepare(`
      SELECT city, state, COUNT(*) as count FROM leads
      WHERE city IS NOT NULL AND city != ''
      GROUP BY city, state ORDER BY count DESC LIMIT 10
    `).all();

    res.json({ byState, byCity });
  } catch (err) {
    console.error('[DASHBOARD] Geo error:', err.message);
    res.json({ byState: [], byCity: [] });
  }
});

// GET /api/dashboard/funnel - Conversion funnel
router.get('/funnel', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
    const contacted = db.prepare("SELECT COUNT(*) as count FROM leads WHERE pipeline_stage IN ('contato','proposta','fechado')").get().count;
    const proposal = db.prepare("SELECT COUNT(*) as count FROM leads WHERE pipeline_stage IN ('proposta','fechado')").get().count;
    const closed = db.prepare("SELECT COUNT(*) as count FROM leads WHERE pipeline_stage = 'fechado'").get().count;

    res.json({
      stages: [
        { name: 'Leads', count: total, pct: 100 },
        { name: 'Contato', count: contacted, pct: total > 0 ? ((contacted / total) * 100).toFixed(1) : 0 },
        { name: 'Proposta', count: proposal, pct: total > 0 ? ((proposal / total) * 100).toFixed(1) : 0 },
        { name: 'Fechado', count: closed, pct: total > 0 ? ((closed / total) * 100).toFixed(1) : 0 },
      ]
    });
  } catch (err) {
    console.error('[DASHBOARD] Funnel error:', err.message);
    res.json({ stages: [] });
  }
});

// GET /api/dashboard/score-dist - Score distribution
router.get('/score-dist', (req, res) => {
  try {
    const ranges = [
      { label: '0-25', min: 0, max: 25 },
      { label: '25-50', min: 25, max: 50 },
      { label: '50-75', min: 50, max: 75 },
      { label: '75-100', min: 75, max: 101 },
    ];

    const data = ranges.map(r => {
      const count = db.prepare('SELECT COUNT(*) as count FROM leads WHERE rating >= ? AND rating < ?').get(r.min, r.max).count;
      return { label: r.label, count };
    });

    res.json({ data });
  } catch (err) {
    console.error('[DASHBOARD] Score dist error:', err.message);
    res.json({ data: [] });
  }
});

// GET /api/dashboard/export - Export dashboard as CSV
router.get('/export', (req, res) => {
  try {
    const leads = db.prepare('SELECT name, cnpj, activity, phone, email, city, state, pipeline_stage, source, rating, created_at FROM leads ORDER BY created_at DESC').all();

    const BOM = '\uFEFF';
    const header = 'Nome;CNPJ;Atividade;Telefone;Email;Cidade;Estado;Estagio;Fonte;Score;Criado em\n';
    const rows = leads.map(l =>
      `${l.name || ''};${l.cnpj || ''};${l.activity || ''};${l.phone || ''};${l.email || ''};${l.city || ''};${l.state || ''};${l.pipeline_stage || ''};${l.source || ''};${l.rating || 0};${l.created_at || ''}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dashboard_export_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(BOM + header + rows);
  } catch (err) {
    console.error('[DASHBOARD] Export error:', err.message);
    res.status(500).json({ error: 'Erro ao exportar' });
  }
});

module.exports = router;
