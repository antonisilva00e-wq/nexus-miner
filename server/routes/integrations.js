/**
 * Integrations Routes - Google Sheets, API access, webhooks
 */

const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// ============================================================
// GET /api/integrations/status - Available integrations
// ============================================================
router.get('/status', (req, res) => {
  res.json({
    integrations: [
      {
        id: 'google_sheets',
        name: 'Google Sheets',
        description: 'Exportar leads diretamente para uma planilha Google',
        status: 'available',
        icon: 'table',
      },
      {
        id: 'api_access',
        name: 'API Access',
        description: 'Acesso programatico via API key',
        status: 'available',
        icon: 'code',
      },
      {
        id: 'webhooks',
        name: 'Webhooks',
        description: 'Receber notificacoes em tempo real',
        status: 'available',
        icon: 'webhook',
      },
      {
        id: 'zapier',
        name: 'Zapier',
        description: 'Conectar com 5000+ apps via Zapier',
        status: 'coming_soon',
        icon: 'zap',
      },
    ],
  });
});

// ============================================================
// GET /api/integrations/sheets/export - Generate Google Sheets format
// ============================================================
router.get('/sheets/export', (req, res) => {
  const leads = db.prepare(`
    SELECT l.name, l.cnpj, l.activity, l.phone, l.email, l.site,
           l.address, l.city, l.state, l.owner, l.source, l.status,
           l.pipeline_stage, l.rating, l.created_at
    FROM leads l ORDER BY l.created_at DESC
  `).all();

  // Return as JSON array for Google Sheets import
  const headers = ['Nome', 'CNPJ', 'Atividade', 'Telefone', 'Email', 'Site', 'Endereco', 'Cidade', 'Estado', 'Proprietario', 'Fonte', 'Status', 'Estagio', 'Rating', 'Criado em'];
  const rows = leads.map(l => [
    l.name, l.cnpj, l.activity, l.phone, l.email, l.site,
    l.address, l.city, l.state, l.owner, l.source, l.status,
    l.pipeline_stage, l.rating, l.created_at,
  ]);

  res.json({ headers, rows, total: leads.length });
});

// ============================================================
// GET /api/integrations/api-docs - API documentation
// ============================================================
router.get('/api-docs', (req, res) => {
  res.json({
    title: 'Nexus Miner API',
    version: '2.0',
    baseUrl: '/api',
    endpoints: [
      { method: 'GET', path: '/leads', description: 'Listar leads com filtros' },
      { method: 'POST', path: '/leads', description: 'Criar novo lead' },
      { method: 'PUT', path: '/leads/:id', description: 'Atualizar lead' },
      { method: 'DELETE', path: '/leads/:id', description: 'Remover lead' },
      { method: 'POST', path: '/leads/mine', description: 'Minerar leads por keyword/cidade' },
      { method: 'GET', path: '/leads/cnpj/:cnpj', description: 'Consultar CNPJ na Receita Federal' },
      { method: 'GET', path: '/leads/cpf/:cpf', description: 'Validar CPF' },
      { method: 'POST', path: '/leads/mine-people', description: 'Extrair socios via CNPJ' },
      { method: 'GET', path: '/pipeline', description: 'Pipeline Kanban' },
      { method: 'POST', path: '/pipeline/:id/move', description: 'Mover lead no pipeline' },
      { method: 'GET', path: '/clients', description: 'Listar clientes' },
      { method: 'POST', path: '/clients', description: 'Criar cliente' },
      { method: 'GET', path: '/dashboard/overview', description: 'Dados do dashboard' },
      { method: 'GET', path: '/export/leads', description: 'Exportar leads CSV' },
      { method: 'GET', path: '/export/socios', description: 'Exportar socios CSV' },
      { method: 'GET', path: '/scoring/stats', description: 'Estatisticas de scoring' },
      { method: 'GET', path: '/reports/overview', description: 'Relatorio completo' },
      { method: 'GET', path: '/rfsearch/search?city=X', description: 'Buscar na base RF' },
    ],
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>',
      login: 'POST /api/auth/login with { username, password }',
      tokenExpiry: '15 minutes',
      refreshToken: '7 days',
    },
  });
});

// ============================================================
// POST /api/integrations/webhooks - Register a webhook
// ============================================================
router.post('/webhooks', (req, res) => {
  const { url, events } = req.body;
  if (!url) return res.status(400).json({ error: 'URL do webhook obrigatoria' });

  // Store webhook (simplified - in production would use a webhooks table)
  const id = generateId();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(`webhook_${id}`, JSON.stringify({ id, url, events: events || ['lead.created', 'lead.updated'], active: true }));

  res.status(201).json({ webhook: { id, url, events: events || ['lead.created', 'lead.updated'], active: true } });
});

// ============================================================
// GET /api/integrations/webhooks - List webhooks
// ============================================================
router.get('/webhooks', (req, res) => {
  const settings = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'webhook_%'").all();
  const webhooks = settings.map(s => JSON.parse(s.value));
  res.json({ webhooks });
});

module.exports = router;
