/**
 * Lead Scoring Service - Intelligent lead qualification
 */

const { db } = require('../db');

// ============================================================
// SCORING RULES
// ============================================================
const RULES = {
  // Data completeness (max 40 points)
  hasCNPJ: 8,
  hasPhone: 8,
  hasEmail: 6,
  hasSite: 4,
  hasAddress: 5,
  hasCity: 3,
  hasOwner: 3,
  hasBankInfo: 3,

  // Data source quality (max 25 points)
  fromReceitaFederal: 15,
  fromRFSearch: 12,
  fromNominatim: 8,
  fromOfflineDB: 3,

  // Business signals (max 20 points)
  hasCapitalSocial: 8, // from CNPJ data
  isAtiva: 7, // situacao cadastral
  hasMultiplePartners: 5, // more partners = more established

  // Engagement (max 15 points)
  hasConversation: 5, // has notes/activities
  recentlyContacted: 5, // activity in last 7 days
  inPipeline: 5, // moved beyond 'leads' stage
};

// ============================================================
// SCORE A SINGLE LEAD
// ============================================================
function scoreLead(lead) {
  let score = 0;
  const breakdown = {};

  // Data completeness
  if (lead.cnpj) { score += RULES.hasCNPJ; breakdown.cnpj = RULES.hasCNPJ; }
  if (lead.phone) { score += RULES.hasPhone; breakdown.phone = RULES.hasPhone; }
  if (lead.email) { score += RULES.hasEmail; breakdown.email = RULES.hasEmail; }
  if (lead.site) { score += RULES.hasSite; breakdown.site = RULES.hasSite; }
  if (lead.address) { score += RULES.hasAddress; breakdown.address = RULES.hasAddress; }
  if (lead.city) { score += RULES.hasCity; breakdown.city = RULES.hasCity; }
  if (lead.owner) { score += RULES.hasOwner; breakdown.owner = RULES.hasOwner; }
  if (lead.bank_code || lead.bank_name) { score += RULES.hasBankInfo; breakdown.bank = RULES.hasBankInfo; }

  // Source quality
  const source = (lead.source || lead.fonte || '').toLowerCase();
  if (source.includes('receita_federal') || source.includes('brasilapi')) {
    score += RULES.fromReceitaFederal; breakdown.source = RULES.fromReceitaFederal;
  } else if (source.includes('rfsearch') || source.includes('rf_')) {
    score += RULES.fromRFSearch; breakdown.source = RULES.fromRFSearch;
  } else if (source.includes('nominatim') || source.includes('openstreetmap')) {
    score += RULES.fromNominatim; breakdown.source = RULES.fromNominatim;
  } else if (source.includes('offline') || source.includes('smart')) {
    score += RULES.fromOfflineDB; breakdown.source = RULES.fromOfflineDB;
  }

  // Business signals
  if (lead.capital_social && lead.capital_social > 100000) {
    score += RULES.hasCapitalSocial; breakdown.capital = RULES.hasCapitalSocial;
  }
  if (lead.situacao === 'ATIVA' || lead.status === 'ativo') {
    score += RULES.isAtiva; breakdown.ativa = RULES.isAtiva;
  }

  // Engagement
  if (lead.pipeline_stage && lead.pipeline_stage !== 'leads') {
    score += RULES.inPipeline; breakdown.pipeline = RULES.inPipeline;
  }

  return {
    score: Math.min(score, 100),
    level: getScoreLevel(score),
    breakdown,
  };
}

function getScoreLevel(score) {
  if (score >= 80) return { label: 'Hot', color: '#f43f5e', emoji: '🔥' };
  if (score >= 60) return { label: 'Warm', color: '#f59e0b', emoji: '🌡️' };
  if (score >= 40) return { label: 'Cool', color: '#22d3ee', emoji: '❄️' };
  return { label: 'Cold', color: '#6b7280', emoji: '🧊' };
}

// ============================================================
// SCORE ALL LEADS (with cache)
// ============================================================
let _scoredCache = null;
let _cacheTime = 0;
const CACHE_TTL = 300000; // 5 minutes

function scoreAllLeads(useCache = true) {
  const now = Date.now();
  if (useCache && _scoredCache && (now - _cacheTime) < CACHE_TTL) {
    return _scoredCache;
  }
  const leads = db.prepare('SELECT * FROM leads').all();
  const scored = leads.map(l => ({
    ...l,
    ...scoreLead(l),
  }));
  _scoredCache = scored;
  _cacheTime = now;
  return scored;
}

function invalidateCache() {
  _scoredCache = null;
  _cacheTime = 0;
}

// ============================================================
// GET SCORING STATS (uses cached scored leads)
// ============================================================
function getScoringStats() {
  const scored = scoreAllLeads();

  const hot = scored.filter(l => l.score >= 80).length;
  const warm = scored.filter(l => l.score >= 60 && l.score < 80).length;
  const cool = scored.filter(l => l.score >= 40 && l.score < 60).length;
  const cold = scored.filter(l => l.score < 40).length;
  const avgScore = scored.length ? Math.round(scored.reduce((s, l) => s + l.score, 0) / scored.length) : 0;

  return { total: scored.length, hot, warm, cool, cold, avgScore };
}

module.exports = { scoreLead, scoreAllLeads, getScoringStats, invalidateCache };
