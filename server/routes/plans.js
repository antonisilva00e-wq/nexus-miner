/**
 * Plans & Subscriptions - Multi-tenant with usage limits
 * Upgrade requires admin approval (or payment gateway integration)
 */

const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
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
    maxLeads: -1,
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
    features: undefined,
    featureList: getFeatureLabels(p.features),
  }));
  res.json({ plans });
});

// GET /api/plans/current - Get current user's plan
router.get('/current', (req, res) => {
  let user = null;
  let expiry = null;
  
  // Try users table first
  try {
    user = db.prepare('SELECT plan, plan_expiry FROM users WHERE id = ?').get(req.user.id);
  } catch {}
  
  // If not found, try clients table
  if (!user) {
    try {
      user = db.prepare('SELECT plan, expiry as plan_expiry FROM clients WHERE id = ?').get(req.user.id);
    } catch {}
  }
  
  if (!user) user = { plan: 'free', plan_expiry: null };

  // Map plan names to IDs
  const planMap = { 'Gratuito': 'free', 'Profissional': 'pro', 'Empresarial': 'enterprise', 'Starter': 'free' };
  const planId = planMap[user.plan] || user.plan || 'free';
  const plan = PLANS[planId] || PLANS.free;
  const usage = getUsage(req.user.id, planId);

  // Check for pending upgrade request
  let pendingRequest = null;
  try {
    pendingRequest = db.prepare("SELECT * FROM upgrade_requests WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(req.user.id);
  } catch {}

  res.json({
    plan: { id: planId, ...plan },
    expiry: user.plan_expiry,
    usage,
    limits: {
      maxLeads: plan.maxLeads,
      maxUsers: plan.maxUsers,
      maxExports: plan.maxExports,
      maxAutomations: plan.maxAutomations,
    },
    pendingRequest: pendingRequest ? {
      id: pendingRequest.id,
      requestedPlan: pendingRequest.requested_plan,
      status: pendingRequest.status,
      createdAt: pendingRequest.created_at,
    } : null,
  });
});

// POST /api/plans/upgrade - DISABLED - requires payment gateway
router.post('/upgrade', (req, res) => {
  return res.status(400).json({
    error: 'Gateway de pagamento nao configurado',
    message: 'A funcionalidade de upgrade estara disponivel em breve. Entre em contato com o suporte para alterar seu plano.',
  });
});

// GET /api/plans/upgrade-requests - DISABLED
router.get('/upgrade-requests', authorize('admin'), (req, res) => {
  return res.status(400).json({
    error: 'Sistema de solicitacao desabilitado',
    message: 'Use a alteracao manual de plano (PUT /api/plans/users/:userId) para alterar planos.',
  });
});

// POST /api/plans/upgrade-requests/:id/approve - DISABLED
router.post('/upgrade-requests/:id/approve', authorize('admin'), (req, res) => {
  return res.status(400).json({
    error: 'Sistema de solicitacao desabilitado',
    message: 'Use a alteracao manual de plano (PUT /api/plans/users/:userId) para alterar planos.',
  });
});

// POST /api/plans/upgrade-requests/:id/reject - DISABLED
router.post('/upgrade-requests/:id/reject', authorize('admin'), (req, res) => {
  return res.status(400).json({
    error: 'Sistema de solicitacao desabilitado',
    message: 'Use a alteracao manual de plano (PUT /api/plans/users/:userId) para alterar planos.',
  });
});

// PUT /api/plans/users/:userId - ONLY main admin can manually change user plan
router.put('/users/:userId', authorize('admin'), (req, res) => {
  // EXTRA SECURITY: Only the main admin account can manually change plans
  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Apenas o administrador principal pode alterar planos' });
  }

  const { planId, expiry } = req.body;
  if (!PLANS[planId]) return res.status(400).json({ error: 'Plano invalido' });

  const { userId } = req.params;

  // Try users table first
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (user) {
    const exp = expiry || new Date(Date.now() + 30 * 86400000).toISOString();
    db.prepare('UPDATE users SET plan = ?, plan_expiry = ? WHERE id = ?').run(planId, exp, userId);
    return res.json({ message: `Plano do usuario atualizado para ${PLANS[planId].name}` });
  }

  // Try clients table
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(userId);
  if (client) {
    const exp = expiry || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    db.prepare('UPDATE clients SET plan = ?, price = ?, expiry = ? WHERE id = ?')
      .run(planId, PLANS[planId]?.price || 0, exp, userId);
    return res.json({ message: `Plano do cliente atualizado para ${PLANS[planId].name}` });
  }

  return res.status(404).json({ error: 'Usuario/cliente nao encontrado' });
});

// GET /api/plans/check/:feature - Check if user has access to a feature
router.get('/check/:feature', (req, res) => {
  let planId = 'free';

  // Check users table first
  try {
    const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id);
    if (user) planId = user.plan || 'free';
  } catch {}

  // If not found, check clients table
  if (planId === 'free') {
    try {
      const client = db.prepare('SELECT plan FROM clients WHERE id = ?').get(req.user.id);
      if (client) planId = client.plan || 'free';
    } catch {}
  }

  const plan = PLANS[planId] || PLANS.free;
  const hasAccess = plan.features.includes('all') || plan.features.includes(req.params.feature);
  const usage = getUsage(req.user.id, planId);

  res.json({ hasAccess, plan: planId, usage });
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
