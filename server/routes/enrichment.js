/**
 * Enrichment Routes - AI-powered lead enrichment
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { enrichLead, enrichAllLeads, getEnrichmentStats } = require('../services/enrichmentService');

const router = express.Router();
router.use(authenticate);

// GET /api/enrichment/stats - Get enrichment statistics
router.get('/stats', (req, res) => {
  const stats = getEnrichmentStats();
  res.json(stats);
});

// POST /api/enrichment/enrich/:id - Enrich a specific lead
router.post('/enrich/:id', authorize('admin', 'manager', 'seller'), async (req, res) => {
  try {
    const enrichment = await enrichLead(req.params.id);
    res.json({ message: 'Lead enriquecido com sucesso', enrichment });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enriquecer lead: ' + err.message });
  }
});

// POST /api/enrichment/enrich-all - Batch enrich leads
router.post('/enrich-all', authorize('admin'), async (req, res) => {
  const { limit = 50 } = req.body;

  try {
    const results = await enrichAllLeads(limit);
    const enriched = results.filter(r => r.status === 'enriched').length;
    const errors = results.filter(r => r.status === 'error').length;

    res.json({
      message: `${enriched} leads enriquecidos, ${errors} erros`,
      results,
      summary: { enriched, errors, total: results.length },
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro na enriquecao em lote: ' + err.message });
  }
});

// GET /api/enrichment/lead/:id - Get enrichment data for a lead
router.get('/lead/:id', (req, res) => {
  const { db } = require('../db');
  const lead = db.prepare('SELECT enrichment, score FROM leads WHERE id = ?').get(req.params.id);

  if (!lead) return res.status(404).json({ error: 'Lead nao encontrado' });

  let enrichment = null;
  try {
    enrichment = lead.enrichment ? JSON.parse(lead.enrichment) : null;
  } catch {}

  res.json({
    leadId: req.params.id,
    score: lead.score,
    enrichment,
  });
});

module.exports = router;
