/**
 * Intelligence Routes - Market intelligence and competitor analysis
 */

const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/intelligence/dashboard - Market intelligence dashboard
router.get('/dashboard', (req, res) => {
  // Get market data
  const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  const totalClients = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  const activeClients = db.prepare('SELECT COUNT(*) as count FROM clients WHERE active = 1').get().count;

  // Leads by city (top 10)
  const leadsByCity = db.prepare(`
    SELECT city, COUNT(*) as count FROM leads 
    WHERE city IS NOT NULL AND city != '' 
    GROUP BY city ORDER BY count DESC LIMIT 10
  `).all();

  // Leads by activity (top 10)
  const leadsByActivity = db.prepare(`
    SELECT activity, COUNT(*) as count FROM leads 
    WHERE activity IS NOT NULL AND activity != '' 
    GROUP BY activity ORDER BY count DESC LIMIT 10
  `).all();

  // Leads by source
  const leadsBySource = db.prepare(`
    SELECT source, COUNT(*) as count FROM leads 
    WHERE source IS NOT NULL 
    GROUP BY source ORDER BY count DESC
  `).all();

  // Pipeline conversion rates
  const pipeline = db.prepare(`
    SELECT pipeline_stage, COUNT(*) as count FROM leads GROUP BY pipeline_stage
  `).all();

  const pipelineData = {};
  pipeline.forEach(p => { pipelineData[p.pipeline_stage] = p.count; });
  const totalPipeline = Object.values(pipelineData).reduce((a, b) => a + b, 0);
  const conversionRate = totalPipeline > 0 ? ((pipelineData.fechado || 0) / totalPipeline * 100).toFixed(1) : 0;

  // Revenue metrics
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid'").get().total;
  const mrr = db.prepare('SELECT COALESCE(SUM(price), 0) as total FROM clients WHERE active = 1').get().total;

  // Competitor analysis (leads in same niches)
  const competitorData = db.prepare(`
    SELECT activity, COUNT(*) as count, 
      AVG(CASE WHEN pipeline_stage = 'fechado' THEN 100 ELSE 0 END) as winRate
    FROM leads 
    WHERE activity IS NOT NULL AND activity != ''
    GROUP BY activity 
    HAVING count > 5
    ORDER BY count DESC
    LIMIT 10
  `).all();

  // Growth trends (last 6 months)
  const growthTrend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM leads 
    WHERE created_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month
  `).all();

  // Top performing niches
  const topNiches = db.prepare(`
    SELECT activity, 
      COUNT(*) as total,
      SUM(CASE WHEN pipeline_stage = 'fechado' THEN 1 ELSE 0 END) as closed,
      ROUND(SUM(CASE WHEN pipeline_stage = 'fechado' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as conversionRate
    FROM leads 
    WHERE activity IS NOT NULL AND activity != ''
    GROUP BY activity 
    HAVING total >= 3
    ORDER BY conversionRate DESC
    LIMIT 5
  `).all();

  res.json({
    overview: {
      totalLeads,
      totalClients,
      activeClients,
      totalRevenue,
      mrr,
      conversionRate: parseFloat(conversionRate),
    },
    leadsByCity,
    leadsByActivity,
    leadsBySource,
    pipeline: pipelineData,
    competitorData,
    growthTrend,
    topNiches,
    insights: generateInsights(totalLeads, activeClients, conversionRate, mrr),
  });
});

// GET /api/intelligence/insights - AI-generated insights
router.get('/insights', (req, res) => {
  const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  const activeClients = db.prepare('SELECT COUNT(*) as count FROM clients WHERE active = 1').get().count;
  const mrr = db.prepare('SELECT COALESCE(SUM(price), 0) as total FROM clients WHERE active = 1').get().total;

  const insights = generateInsights(totalLeads, activeClients, 0, mrr);
  res.json({ insights });
});

// GET /api/intelligence/niches - Niche analysis
router.get('/niches', (req, res) => {
  const niches = db.prepare(`
    SELECT activity,
      COUNT(*) as totalLeads,
      SUM(CASE WHEN pipeline_stage = 'fechado' THEN 1 ELSE 0 END) as closedLeads,
      SUM(CASE WHEN pipeline_stage = 'perdido' THEN 1 ELSE 0 END) as lostLeads,
      ROUND(AVG(CASE WHEN pipeline_stage = 'fechado' THEN 100.0 ELSE 0 END), 1) as conversionRate,
      COUNT(DISTINCT city) as citiesPresence
    FROM leads 
    WHERE activity IS NOT NULL AND activity != ''
    GROUP BY activity
    HAVING totalLeads >= 2
    ORDER BY totalLeads DESC
  `).all();

  res.json({ niches });
});

// Helper: Generate AI insights
function generateInsights(totalLeads, activeClients, conversionRate, mrr) {
  const insights = [];

  if (totalLeads === 0) {
    insights.push({
      type: 'action',
      priority: 'high',
      icon: 'alert-triangle',
      title: 'Comece a minerar leads',
      description: 'Voce ainda nao tem leads. Use a pagina de Mineracao para encontrar prospects.',
    });
  } else if (totalLeads < 50) {
    insights.push({
      type: 'growth',
      priority: 'medium',
      icon: 'trending-up',
      title: 'Aumente sua base de leads',
      description: `Voce tem ${totalLeads} leads. Meta recomendada: 50+ leads por nicho.`,
    });
  }

  if (activeClients === 0 && totalLeads > 20) {
    insights.push({
      type: 'conversion',
      priority: 'high',
      icon: 'users',
      title: 'Foque em converter leads',
      description: `Voce tem ${totalLeads} leads mas nenhum cliente. Use o Kanban para acompanhar o pipeline.`,
    });
  }

  if (mrr === 0 && activeClients > 0) {
    insights.push({
      type: 'revenue',
      priority: 'high',
      icon: 'dollar-sign',
      title: 'Configure os planos',
      description: 'Voce tem clientes mas nenhum MRR. Configure os planos de assinatura.',
    });
  }

  if (conversionRate > 20) {
    insights.push({
      type: 'success',
      priority: 'low',
      icon: 'check-circle',
      title: 'Excelente taxa de conversao!',
      description: `Sua taxa de conversao de ${conversionRate}% esta acima da media do mercado.`,
    });
  }

  insights.push({
    type: 'tip',
    priority: 'low',
    icon: 'lightbulb',
    title: 'Dica: Enriquecimento IA',
    description: 'Use o Enriquecimento IA para automaticamente enriquecer seus leads com dados da Receita Federal e redes sociais.',
  });

  return insights;
}

module.exports = router;
