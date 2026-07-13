/**
 * RF Search Routes - Search CNPJs from Receita Federal open data
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { searchByCity, getStats } = require('../services/rfSearch');
const { lookupCNPJ } = require('../services/leadService');

const router = express.Router();
router.use(authenticate);

// GET /api/rfsearch/status - Check if RF index is available
router.get('/status', (req, res) => {
  const stats = getStats();
  res.json(stats);
});

// GET /api/rfsearch/search?city=X&cnae=Y&limit=Z - Search CNPJs from RF index
router.get('/search', (req, res) => {
  const { city, cnae, limit = 50 } = req.query;
  
  if (!city) {
    return res.status(400).json({ error: 'Parametro "city" obrigatorio' });
  }
  
  const result = searchByCity(city, cnae, parseInt(limit));
  res.json(result);
});

// POST /api/rfsearch/enrich - Look up full CNPJ data from BrasilAPI
router.post('/enrich', async (req, res) => {
  const { cnpjs } = req.body;
  
  if (!cnpjs || !Array.isArray(cnpjs)) {
    return res.status(400).json({ error: 'Lista de CNPJs obrigatoria' });
  }
  
  const results = [];
  const errors = [];
  
  for (const cnpj of cnpjs.slice(0, 10)) {
    try {
      const data = await lookupCNPJ(cnpj);
      if (data) {
        results.push(data);
      } else {
        errors.push({ cnpj, error: 'Nao encontrado' });
      }
    } catch (err) {
      errors.push({ cnpj, error: err.message });
    }
  }
  
  res.json({ results, errors, total: results.length });
});

module.exports = router;
