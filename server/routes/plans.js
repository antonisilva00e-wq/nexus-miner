/**
 * Plans & Subscriptions - Multi-tenant with usage limits
 */

const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// ============================================================
// PLAN DEFINITIONS
// ============================================================
const PLANS = {
  free: {
    name: 'Gratuito',
    price: 0,
    maxLeads: 50,
    maxUsers: 1,
    maxExports: 5,
    maxAutomations: 0,
    features: ['leads_basic', 'cnpj_lookup', 'kanban'],
  },
  pro: {
    name: 'Profissional',
    price: 97,
    maxLeads: 500,
    maxUsers: 5,
    maxExports: 50,
    maxAutomations: 5,
    features: ['leads_basic', 'cnpj_lookup', 'kanban', 'export', 'scoring', 'automation', 'reports', 'rf_search', 'whatsapp'],
  },
  enterprise: {
    name: 'Empresarial',
    price: 297,
    maxLeads: -1, // unlimited
    maxUsers: -1,
    maxExports: -1,
    maxAutomations: -1,
    features: ['all'],
  },
};

// GET /api/plans - List all plans
router.get('/', (req, res) => {
  const plans = Object.entries(PLANS).map(([id, p]) => ({
    id, ...p,
    features: undefined, // don't expose raw feature keys
    featureList: getFeatureLabels(p.features),
  }));
  res.json({ plans });
});

// GET /api/plans/current - Get current user's plan
router.get('/current', (req, res) => {
  // Ensure columns exist (migration)
  try { db.prepare("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'"); } catch {}
  try { db.prepare('ALTER TABLE users ADD COLUMN plan_expiry DATETIME'); } catch {}

  let user;
  try {
    user = db.prepare('SELECT plan, plan_expiry FROM users WHERE id = ?').get(req.user.id);
  } catch {
    user = { plan: 'free', plan_expiry: null };
  }
  if (!user) user = { plan: 'free', plan_expiry: null };

  const plan = PLANS[user.plan || 'free'] || PLANS.free;
  const usage = getUsage(req.user.id, user.plan || 'free');

  res.json({
    plan: { id: user.plan || 'free', ...plan },
    expiry: user.plan_expiry,
    usage,
    limits: {
      maxLeads: plan.maxLeads,
      maxUsers: plan.maxUsers,
      maxExports: plan.maxExports,
      maxAutomations: plan.maxAutomations,
    },
  });
});

// POST /api/plans/upgrade - Upgrade plan (simulated)
router.post('/upgrade', (req, res) => {
  // Ensure columns exist
  try { db.prepare("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'"); } catch {}
  try { db.prepare('ALTER TABLE users ADD COLUMN plan_expiry DATETIME'); } catch {}

  const { planId } = req.body;
  if (!PLANS[planId]) return res.status(400).json({ error: 'Plano invalido' });

  // In production, this would integrate with Stripe/PagSeguro
  // For now, we just update the user's plan
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 1);

  db.prepare('UPDATE users SET plan = ?, plan_expiry = ? WHERE id = ?')
    .run(planId, expiry.toISOString(), req.user.id);

  res.json({ message: `Plano atualizado para ${PLANS[planId].name}`, expiry: expiry.toISOString() });
});

// GET /api/plans/check/:feature - Check if user has access to a feature
router.get('/check/:feature', (req, res) => {
  const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id);
  const plan = PLANS[user.plan || 'free'] || PLANS.free;
  const hasAccess = plan.features.includes('all') || plan.features.includes(req.params.feature);
  const usage = getUsage(req.user.id, user.plan || 'free');

  res.json({ hasAccess, plan: user.plan || 'free', usage });
});

// ============================================================
// HELPERS
// ============================================================
function getUsage(userId, planId) {
  const plan = PLANS[planId] || PLANS.free;
  let leadCount = 0, exportCount = 0, automationCount = 0;
  try { leadCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE created_by = ?').get(userId).count; } catch {}
  try { exportCount = db.prepare("SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND action = 'export' AND created_at >= date('now', 'start of month')").get(userId).count; } catch {}
  try { automationCount = db.prepare('SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND entity_type = ?').get(userId, 'automation').count; } catch {}

  return {
    leads: { used: leadCount, max: plan.maxLeads },
    exports: { used: exportCount, max: plan.maxExports },
    automations: { used: automationCount, max: plan.maxAutomations },
  };
}

function getFeatureLabels(features) {
  const labels = {
    leads_basic: 'Consulta de Leads',
    cnpj_lookup: 'Consulta CNPJ Real',
    kanban: 'Pipeline Kanban',
    export: 'Exportacao CSV/Excel',
    scoring: 'Scoring Inteligente',
    automation: 'Automacao de Mineracao',
    reports: 'Relatorios Avancados',
    rf_search: 'Busca Dados RF',
    whatsapp: 'WhatsApp Integrado',
  };
  if (features.includes('all')) return Object.values(labels);
  return features.map(f => labels[f]).filter(Boolean);
}

module.exports = router;
