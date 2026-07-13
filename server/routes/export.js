/**
 * Export Routes - CSV/Excel export for leads, socios, and reports
 */

const express = require('express');
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ============================================================
// CSV HELPER
// ============================================================
function toCSV(rows, headers) {
  if (!rows.length) return '';
  const esc = (v) => {
    const s = String(v ?? '');
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.map(esc).join(';')];
  for (const row of rows) {
    lines.push(headers.map(h => esc(row[h])).join(';'));
  }
  return '\uFEFF' + lines.join('\r\n'); // BOM for Excel UTF-8
}

// ============================================================
// GET /api/export/leads - Export all leads as CSV
// ============================================================
router.get('/leads', (req, res) => {
  const { status, pipeline_stage, city, state, source, assigned_to } = req.query;
  const params = [];
  const conditions = [];

  if (req.user.role === 'seller') {
    conditions.push('l.assigned_to = ?');
    params.push(req.user.id);
  }
  if (status) { conditions.push('l.status = ?'); params.push(status); }
  if (pipeline_stage) { conditions.push('l.pipeline_stage = ?'); params.push(pipeline_stage); }
  if (city) { conditions.push('l.city LIKE ?'); params.push(`%${city}%`); }
  if (state) { conditions.push('l.state LIKE ?'); params.push(`%${state}%`); }
  if (source) { conditions.push('l.source = ?'); params.push(source); }
  if (assigned_to) { conditions.push('l.assigned_to = ?'); params.push(assigned_to); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const leads = db.prepare(`SELECT l.*, u.name as assigned_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id ${where} ORDER BY l.created_at DESC`).all(...params);

  const headers = ['name', 'cnpj', 'activity', 'phone', 'email', 'site', 'address', 'city', 'state', 'owner', 'bank_name', 'rating', 'source', 'status', 'pipeline_stage', 'assigned_name', 'created_at'];
  const csv = toCSV(leads, headers);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="leads_nexusminer_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

// ============================================================
// GET /api/export/socios - Export socios from lead CNPJs
// ============================================================
router.get('/socios', async (req, res) => {
  const leads = db.prepare('SELECT DISTINCT cnpj FROM leads WHERE cnpj IS NOT NULL AND cnpj != ""').all();
  const cnpjs = leads.map(l => l.cnpj.replace(/\D/g, '')).filter(c => c.length === 14);

  const { lookupCNPJ } = require('../services/leadService');
  const rows = [];

  for (const cnpj of cnpjs.slice(0, 100)) {
    try {
      const data = await lookupCNPJ(cnpj);
      if (data && data.socios) {
        for (const s of data.socios) {
          rows.push({
            socio_nome: s.nome,
            qualificacao: s.qualificacao,
            empresa: data.nomeFantasia || data.razaoSocial,
            cnpj: data.cnpj,
            atividade: data.cnaePrincipal || '',
            capital_social: data.capitalSocial || 0,
            endereco: data.endereco ? `${data.endereco.logradouro || ''}, ${data.endereco.numero || ''} - ${data.endereco.bairro || ''}` : '',
            cidade: data.endereco?.municipio || '',
            uf: data.endereco?.uf || '',
            telefone: data.telefone1 || '',
            email: data.email || '',
            situacao: data.situacaoCadastral || '',
          });
        }
      }
    } catch { /* skip */ }
  }

  const headers = ['socio_nome', 'qualificacao', 'empresa', 'cnpj', 'atividade', 'capital_social', 'endereco', 'cidade', 'uf', 'telefone', 'email', 'situacao'];
  const csv = toCSV(rows, headers);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="socios_nexusminer_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

// ============================================================
// GET /api/export/pipeline - Export pipeline as CSV
// ============================================================
router.get('/pipeline', (req, res) => {
  const leads = db.prepare(`
    SELECT l.name, l.cnpj, l.activity, l.phone, l.email, l.pipeline_stage, l.status,
           l.rating, l.source, l.city, l.state, l.owner, l.created_at, l.updated_at,
           u.name as assigned_name
    FROM leads l LEFT JOIN users u ON l.assigned_to = u.id
    ORDER BY 
      CASE l.pipeline_stage 
        WHEN 'leads' THEN 1 WHEN 'contato' THEN 2 WHEN 'proposta' THEN 3 
        WHEN 'fechado' THEN 4 WHEN 'perdido' THEN 5 ELSE 6 
      END, l.created_at DESC
  `).all();

  const headers = ['name', 'cnpj', 'activity', 'pipeline_stage', 'status', 'phone', 'email', 'city', 'state', 'owner', 'assigned_name', 'rating', 'source', 'created_at', 'updated_at'];
  const csv = toCSV(leads, headers);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="pipeline_nexusminer_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

// ============================================================
// GET /api/export/clients - Export clients as CSV
// ============================================================
router.get('/clients', (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
  const headers = ['name', 'cnpj', 'email', 'phone', 'address', 'city', 'state', 'price', 'plan_name', 'status', 'expiry', 'created_at'];
  const csv = toCSV(clients, headers);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="clientes_nexusminer_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

// ============================================================
// GET /api/export/financial - Export financial data as CSV
// ============================================================
router.get('/financial', (req, res) => {
  const transactions = db.prepare(`
    SELECT p.*, c.name as client_name
    FROM payments p
    LEFT JOIN clients c ON p.client_id = c.id
    ORDER BY p.payment_date DESC
  `).all();

  const headers = ['client_name', 'amount', 'payment_date', 'payment_method', 'status', 'notes', 'created_at'];
  const csv = toCSV(transactions, headers);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="financeiro_nexusminer_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

module.exports = router;
