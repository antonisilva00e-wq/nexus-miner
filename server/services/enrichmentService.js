/**
 * AI-Powered Lead Enrichment Service
 * Automatically enriches leads with social media, Google Maps, and business data
 */

const { db } = require('../db');

// Enrichment sources
const ENRICHMENT_SOURCES = {
  googleMaps: { name: 'Google Maps', icon: 'map-pin', color: '#4285f4' },
  linkedin: { name: 'LinkedIn', icon: 'linkedin', color: '#0077b5' },
  instagram: { name: 'Instagram', icon: 'instagram', color: '#e4405f' },
  facebook: { name: 'Facebook', icon: 'facebook', color: '#1877f2' },
  website: { name: 'Website', icon: 'globe', color: '#10b981' },
  receitaFederal: { name: 'Receita Federal', icon: 'building-2', color: '#f59e0b' },
};

// ============================================================
// ENRICH LEAD WITH Google Maps DATA
// ============================================================
async function enrichWithGoogleMaps(lead) {
  try {
    if (!lead.city && !lead.address) return null;

    const query = encodeURIComponent(`${lead.name} ${lead.city || ''} ${lead.state || ''}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'NexusMiner/2.0' }
    });

    if (!response.ok) return null;
    const data = await response.json();

    if (data.length === 0) return null;

    const place = data[0];
    return {
      source: 'googleMaps',
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      address: place.display_name,
      city: place.address?.city || place.address?.town || place.address?.village,
      state: place.address?.state,
      country: place.address?.country,
      importance: place.importance,
    };
  } catch (err) {
    console.error('[Enrichment] Google Maps error:', err.message);
    return null;
  }
}

// ============================================================
// ENRICH LEAD WITH BUSINESS DATA
// ============================================================
async function enrichWithBusinessData(lead) {
  try {
    if (!lead.cnpj) return null;

    // Use BrasilAPI for CNPJ data
    const cnpj = lead.cnpj.replace(/\D/g, '');
    const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();

    return {
      source: 'receitaFederal',
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia,
      cnaePrincipal: data.cnae_fiscal_descricao,
      porte: data.porte,
      capitalSocial: data.capital_social,
      situacaoCadastral: data.situacao_cadastral,
      dataAbertura: data.data_abertura,
      telefone: data.ddd_telefone_1,
      email: data.email,
      endereco: {
        logradouro: data.logradouro,
        numero: data.numero,
        bairro: data.bairro,
        cidade: data.municipio,
        uf: data.uf,
        cep: data.cep,
      },
      socios: data.qsa?.map(s => ({
        nome: s.nome_socio,
        qualificacao: s.qualificacao_socio,
      })) || [],
    };
  } catch (err) {
    console.error('[Enrichment] Business data error:', err.message);
    return null;
  }
}

// ============================================================
// ENRICH LEAD WITH SOCIAL MEDIA (simulated)
// ============================================================
async function enrichWithSocialMedia(lead) {
  // In production, this would use social media APIs
  // For now, generate likely social profiles based on business name
  const slug = lead.name?.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/[^a-z0-9]/g, '') || '';

  return {
    source: 'socialMedia',
    instagram: lead.activity?.includes('restaurante') || lead.activity?.includes('loja') 
      ? `@${slug}` : null,
    facebook: lead.activity?.includes('clinica') || lead.activity?.includes('escritorio')
      ? null : `facebook.com/${slug}`,
    website: lead.site || null,
  };
}

// ============================================================
// ENRICH LEAD WITH COMPETITOR ANALYSIS
// ============================================================
async function analyzeCompetitors(lead) {
  if (!lead.city || !lead.activity) return null;

  try {
    // Count similar businesses in the same city
    const similarCount = db.prepare(`
      SELECT COUNT(*) as count FROM leads 
      WHERE city = ? AND activity LIKE ? AND id != ?
    `).get(lead.city, `%${lead.activity}%`, lead.id)?.count || 0;

    // Calculate competition level
    let competitionLevel = 'low';
    let competitionColor = '#10b981';
    if (similarCount > 10) {
      competitionLevel = 'high';
      competitionColor = '#ef4444';
    } else if (similarCount > 5) {
      competitionLevel = 'medium';
      competitionColor = '#f59e0b';
    }

    return {
      source: 'competitorAnalysis',
      similarBusinesses: similarCount,
      competitionLevel,
      competitionColor,
      opportunity: similarCount < 5 ? 'Alta' : similarCount < 10 ? 'Media' : 'Baixa',
    };
  } catch (err) {
    console.error('[Enrichment] Competitor analysis error:', err.message);
    return null;
  }
}

// ============================================================
// ENRICH LEAD WITH AI SCORING
// ============================================================
async function enrichWithAIScore(lead) {
  const factors = [];
  let score = 0;

  // Factor 1: Data completeness (0-25 points)
  const dataFields = ['name', 'cnpj', 'phone', 'email', 'site', 'address', 'city', 'owner'];
  const filledFields = dataFields.filter(f => lead[f] && lead[f].trim() !== '').length;
  const dataScore = Math.round((filledFields / dataFields.length) * 25);
  score += dataScore;
  factors.push({ name: 'Completude dos Dados', score: dataScore, max: 25 });

  // Factor 2: Source quality (0-25 points)
  const source = (lead.source || '').toLowerCase();
  let sourceScore = 5;
  if (source.includes('receita_federal') || source.includes('brasilapi')) sourceScore = 25;
  else if (source.includes('rf_')) sourceScore = 20;
  else if (source.includes('power_mine')) sourceScore = 15;
  score += sourceScore;
  factors.push({ name: 'Qualidade da Fonte', score: sourceScore, max: 25 });

  // Factor 3: Business signals (0-25 points)
  let businessScore = 0;
  if (lead.cnpj) businessScore += 10;
  if (lead.owner) businessScore += 8;
  if (lead.site) businessScore += 7;
  score += businessScore;
  factors.push({ name: 'Sinais de Negocio', score: businessScore, max: 25 });

  // Factor 4: Engagement potential (0-25 points)
  let engagementScore = 0;
  if (lead.phone) engagementScore += 10;
  if (lead.email) engagementScore += 8;
  if (lead.city) engagementScore += 7;
  score += engagementScore;
  factors.push({ name: 'Potencial de Engajamento', score: engagementScore, max: 25 });

  // AI recommendation
  let recommendation = '';
  let priority = 'normal';
  if (score >= 80) {
    recommendation = 'Lead de alto potencial. Recomenda-se contato imediato.';
    priority = 'urgent';
  } else if (score >= 60) {
    recommendation = 'Lead com bom potencial. Agende uma demonstracao.';
    priority = 'high';
  } else if (score >= 40) {
    recommendation = 'Lead medio. Envie material informativo primeiro.';
    priority = 'normal';
  } else {
    recommendation = 'Lead frio. Adicione a campanha de email marketing.';
    priority = 'low';
  }

  return {
    source: 'aiScore',
    score: Math.min(score, 100),
    factors,
    recommendation,
    priority,
    estimatedValue: score >= 80 ? 'Alto' : score >= 60 ? 'Medio' : 'Baixo',
  };
}

// ============================================================
// MAIN ENRICHMENT FUNCTION
// ============================================================
async function enrichLead(leadId) {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!lead) throw new Error('Lead nao encontrado');

  console.log(`[Enrichment] Enriching lead: ${lead.name}`);

  // Run all enrichments in parallel
  const [googleMaps, businessData, socialMedia, competitors, aiScore] = await Promise.allSettled([
    enrichWithGoogleMaps(lead),
    enrichWithBusinessData(lead),
    enrichWithSocialMedia(lead),
    analyzeCompetitors(lead),
    enrichWithAIScore(lead),
  ]);

  const enrichment = {
    leadId,
    timestamp: new Date().toISOString(),
    sources: {},
  };

  if (googleMaps.status === 'fulfilled' && googleMaps.value) {
    enrichment.sources.googleMaps = googleMaps.value;
    // Update lead with map data
    if (googleMaps.value.lat && googleMaps.value.lng) {
      db.prepare('UPDATE leads SET lat = ?, lng = ? WHERE id = ?')
        .run(googleMaps.value.lat, googleMaps.value.lng, leadId);
    }
  }

  if (businessData.status === 'fulfilled' && businessData.value) {
    enrichment.sources.receitaFederal = businessData.value;
  }

  if (socialMedia.status === 'fulfilled' && socialMedia.value) {
    enrichment.sources.socialMedia = socialMedia.value;
  }

  if (competitors.status === 'fulfilled' && competitors.value) {
    enrichment.sources.competitorAnalysis = competitors.value;
  }

  if (aiScore.status === 'fulfilled' && aiScore.value) {
    enrichment.sources.aiScore = aiScore.value;
    // Update lead score
    db.prepare('UPDATE leads SET score = ? WHERE id = ?')
      .run(aiScore.value.score, leadId);
  }

  // Save enrichment data
  db.prepare('UPDATE leads SET enrichment = ? WHERE id = ?')
    .run(JSON.stringify(enrichment), leadId);

  // Log activity
  db.prepare('INSERT INTO activities (id, user_id, entity_type, entity_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(require('../utils/helpers').generateId(), lead.created_by || 'system', 'lead', leadId, 'enriched', JSON.stringify({ sources: Object.keys(enrichment.sources) }));

  console.log(`[Enrichment] Completed for ${lead.name}: ${Object.keys(enrichment.sources).length} sources`);

  return enrichment;
}

// ============================================================
// BATCH ENRICHMENT
// ============================================================
async function enrichAllLeads(limit = 50) {
  const leads = db.prepare('SELECT id, name FROM leads WHERE enrichment IS NULL LIMIT ?').all(limit);
  const results = [];

  for (const lead of leads) {
    try {
      const enrichment = await enrichLead(lead.id);
      results.push({ id: lead.id, name: lead.name, status: 'enriched', sources: Object.keys(enrichment.sources).length });
    } catch (err) {
      results.push({ id: lead.id, name: lead.name, status: 'error', error: err.message });
    }
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

// ============================================================
// GET ENRICHMENT STATS
// ============================================================
function getEnrichmentStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  const enriched = db.prepare('SELECT COUNT(*) as count FROM leads WHERE enrichment IS NOT NULL').get().count;
  const withScore = db.prepare('SELECT COUNT(*) as count FROM leads WHERE score IS NOT NULL').get().count;
  const avgScore = db.prepare('SELECT AVG(score) as avg FROM leads WHERE score IS NOT NULL').get().avg || 0;

  return {
    totalLeads: total,
    enrichedLeads: enriched,
    pendingEnrichment: total - enriched,
    withScore,
    averageScore: Math.round(avgScore),
    enrichmentRate: total > 0 ? Math.round((enriched / total) * 100) : 0,
  };
}

module.exports = {
  enrichLead,
  enrichAllLeads,
  getEnrichmentStats,
  ENRICHMENT_SOURCES,
};
