/**
 * Scoring Routes - Lead scoring and qualification
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { scoreLead, scoreAllLeads, getScoringStats } = require('../services/scoringService');

const router = express.Router();
router.use(authenticate);

// GET /api/scoring/stats - Get scoring statistics
router.get('/stats', (req, res) => {
  const stats = getScoringStats();
  res.json(stats);
});

// GET /api/scoring/leads - Get all leads with scores
router.get('/leads', (req, res) => {
  const { level, limit = 50 } = req.query;
  let leads = scoreAllLeads();

  if (level === 'hot') leads = leads.filter(l => l.score >= 80);
  else if (level === 'warm') leads = leads.filter(l => l.score >= 60 && l.score < 80);
  else if (level === 'cool') leads = leads.filter(l => l.score >= 40 && l.score < 60);
  else if (level === 'cold') leads = leads.filter(l => l.score < 40);

  leads.sort((a, b) => b.score - a.score);
  res.json({ leads: leads.slice(0, parseInt(limit)), total: leads.length });
});

// GET /api/scoring/:id - Score a specific lead
router.get('/:id', (req, res) => {
  const { db } = require('../db');
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead nao encontrado' });
  res.json(scoreLead(lead));
});

module.exports = router;
