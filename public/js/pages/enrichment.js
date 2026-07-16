// Enrichment Page - AI-Powered Lead Enrichment
const EnrichmentPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Enriquecimento IA';
    document.getElementById('page-subtitle').textContent = 'Automatique e enriqueca seus leads com dados inteligentes';

    document.getElementById('page-enrichment').innerHTML = `
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#6366f1);display:flex;align-items:center;justify-content:center;"><i data-lucide="sparkles" style="color:white;width:20px;height:20px;"></i></div>
          <div><h3 style="color:white;font-size:1.1rem;">Estatisticas de Enriquecimento</h3><p style="color:var(--text-tertiary);font-size:0.8rem;">Visao geral do enriquecimento dos leads</p></div>
        </div>
        <div id="enrichment-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;"></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
        <div class="card">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;"><i data-lucide="zap" style="color:white;width:18px;height:18px;"></i></div>
            <h3 style="color:white;font-size:1rem;">Enriquecer em Lote</h3>
          </div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">Enriquece todos os leads sem dados automaticamente com IA.</p>
          <div style="display:flex;gap:0.75rem;align-items:end;">
            <div class="form-group" style="flex:1;">
              <label>Limite</label>
              <select id="enrich-limit" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:var(--text-primary);">
                <option value="10">10 leads</option>
                <option value="25">25 leads</option>
                <option value="50" selected>50 leads</option>
                <option value="100">100 leads</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="EnrichmentPage.enrichAll()" id="btn-enrich-all" style="height:42px;"><i data-lucide="sparkles"></i>Enriquecer</button>
          </div>
        </div>

        <div class="card">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;"><i data-lucide="search" style="color:white;width:18px;height:18px;"></i></div>
            <h3 style="color:white;font-size:1rem;">Enriquecer Lead Especifico</h3>
          </div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">Busque e enriqueca um lead especifico por nome ou CNPJ.</p>
          <div style="display:flex;gap:0.75rem;align-items:end;">
            <div class="form-group" style="flex:1;">
              <label>Buscar Lead</label>
              <input type="text" id="enrich-search" placeholder="Nome ou CNPJ..." style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:var(--text-primary);">
            </div>
            <button class="btn btn-secondary" onclick="EnrichmentPage.searchLead()" style="height:42px;"><i data-lucide="search"></i>Buscar</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);display:flex;align-items:center;justify-content:center;"><i data-lucide="layers" style="color:white;width:18px;height:18px;"></i></div>
          <h3 style="color:white;font-size:1rem;">Fontes de Enriquecimento</h3>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(66,133,244,0.06);border:1px solid rgba(66,133,244,0.12);border-radius:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(66,133,244,0.15);display:flex;align-items:center;justify-content:center;"><i data-lucide="map-pin" style="color:#4285f4;width:16px;height:16px;"></i></div>
            <div><p style="color:white;font-size:0.85rem;font-weight:500;margin:0;">Google Maps</p><p style="color:var(--text-tertiary);font-size:0.75rem;margin:0;">Localizacao e endereco</p></div>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.12);border-radius:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(245,158,11,0.15);display:flex;align-items:center;justify-content:center;"><i data-lucide="building-2" style="color:#f59e0b;width:16px;height:16px;"></i></div>
            <div><p style="color:white;font-size:0.85rem;font-weight:500;margin:0;">Receita Federal</p><p style="color:var(--text-tertiary);font-size:0.75rem;margin:0;">Dados do CNPJ</p></div>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(228,64,95,0.06);border:1px solid rgba(228,64,95,0.12);border-radius:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(228,64,95,0.15);display:flex;align-items:center;justify-content:center;"><i data-lucide="instagram" style="color:#e4405f;width:16px;height:16px;"></i></div>
            <div><p style="color:white;font-size:0.85rem;font-weight:500;margin:0;">Redes Sociais</p><p style="color:var(--text-tertiary);font-size:0.75rem;margin:0;">Instagram, Facebook</p></div>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.12);border-radius:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(139,92,246,0.15);display:flex;align-items:center;justify-content:center;"><i data-lucide="brain" style="color:#8b5cf6;width:16px;height:16px;"></i></div>
            <div><p style="color:white;font-size:0.85rem;font-weight:500;margin:0;">IA Scoring</p><p style="color:var(--text-tertiary);font-size:0.75rem;margin:0;">Score inteligente</p></div>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.12);border-radius:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:rgba(239,68,68,0.15);display:flex;align-items:center;justify-content:center;"><i data-lucide="target" style="color:#ef4444;width:16px;height:16px;"></i></div>
            <div><p style="color:white;font-size:0.85rem;font-weight:500;margin:0;">Concorrencia</p><p style="color:var(--text-tertiary);font-size:0.75rem;margin:0;">Analise de mercado</p></div>
          </div>
        </div>
      </div>

      <div id="enrichment-results" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1rem;"></div>
    `;
    lucide.createIcons();

    this.loadStats();
  },

  async loadStats() {
    try {
      const stats = await API.get('/enrichment/stats');
      const el = document.getElementById('enrichment-stats');
      if (!el) return;

      el.innerHTML = `
        <div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.12);border-radius:var(--border-radius-md);padding:1rem;">
          <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">Total de Leads</p>
          <p style="color:white;font-size:1.5rem;font-weight:700;margin:0;">${stats.totalLeads || 0}</p>
        </div>
        <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.12);border-radius:var(--border-radius-md);padding:1rem;">
          <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">Enriquecidos</p>
          <p style="color:#10b981;font-size:1.5rem;font-weight:700;margin:0;">${stats.enrichedLeads || 0}</p>
        </div>
        <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.12);border-radius:var(--border-radius-md);padding:1rem;">
          <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">Pendentes</p>
          <p style="color:#f59e0b;font-size:1.5rem;font-weight:700;margin:0;">${stats.pendingEnrichment || 0}</p>
        </div>
        <div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.12);border-radius:var(--border-radius-md);padding:1rem;">
          <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">Score Medio</p>
          <p style="color:#8b5cf6;font-size:1.5rem;font-weight:700;margin:0;">${stats.averageScore || 0}%</p>
        </div>
        <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.12);border-radius:var(--border-radius-md);padding:1rem;">
          <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">Taxa de Enriquecimento</p>
          <p style="color:#3b82f6;font-size:1.5rem;font-weight:700;margin:0;">${stats.enrichmentRate || 0}%</p>
        </div>
      `;
    } catch (err) {
      console.error('Erro ao carregar stats:', err);
    }
  },

  async enrichAll() {
    const limit = parseInt(document.getElementById('enrich-limit').value) || 50;
    const btn = document.getElementById('btn-enrich-all');
    const resultsEl = document.getElementById('enrichment-results');

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin-animation"></i>Enriquecendo...';
    lucide.createIcons();

    try {
      const result = await API.post('/enrichment/enrich-all', { limit });

      resultsEl.innerHTML = `
        <div class="card" style="grid-column:1/-1;">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;"><i data-lucide="check-circle" style="color:white;width:18px;height:18px;"></i></div>
            <h3 style="color:white;font-size:1rem;">Resultado do Enriquecimento</h3>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1rem;">
            <div style="text-align:center;padding:1rem;background:rgba(16,185,129,0.06);border-radius:8px;">
              <p style="color:#10b981;font-size:1.5rem;font-weight:700;margin:0;">${result.summary.enriched}</p>
              <p style="color:var(--text-tertiary);font-size:0.8rem;margin:4px 0 0;">Enriquecidos</p>
            </div>
            <div style="text-align:center;padding:1rem;background:rgba(239,68,68,0.06);border-radius:8px;">
              <p style="color:#ef4444;font-size:1.5rem;font-weight:700;margin:0;">${result.summary.errors}</p>
              <p style="color:var(--text-tertiary);font-size:0.8rem;margin:4px 0 0;">Erros</p>
            </div>
            <div style="text-align:center;padding:1rem;background:rgba(139,92,246,0.06);border-radius:8px;">
              <p style="color:#8b5cf6;font-size:1.5rem;font-weight:700;margin:0;">${result.summary.total}</p>
              <p style="color:var(--text-tertiary);font-size:0.8rem;margin:4px 0 0;">Total</p>
            </div>
          </div>
          <div style="max-height:300px;overflow-y:auto;">
            ${result.results.map(r => `
              <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem;border-bottom:1px solid var(--border-color);">
                <div style="width:24px;height:24px;border-radius:50%;background:${r.status === 'enriched' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};display:flex;align-items:center;justify-content:center;">
                  <i data-lucide="${r.status === 'enriched' ? 'check' : 'x'}" style="width:12px;height:12px;color:${r.status === 'enriched' ? '#10b981' : '#ef4444'};"></i>
                </div>
                <span style="color:white;font-size:0.85rem;flex:1;">${r.name}</span>
                <span style="color:var(--text-tertiary);font-size:0.75rem;">${r.status === 'enriched' ? r.sources + ' fontes' : r.error}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      lucide.createIcons();

      this.loadStats();
      showToast(`${result.summary.enriched} leads enriquecidos!`, 'success');
    } catch (err) {
      showToast('Erro: ' + err.message, 'danger');
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="sparkles"></i>Enriquecer';
    lucide.createIcons();
  },

  async searchLead() {
    const query = document.getElementById('enrich-search').value.trim();
    if (!query) return showToast('Digite um nome ou CNPJ', 'warning');

    const resultsEl = document.getElementById('enrichment-results');

    try {
      // Search for leads
      const leadsData = await API.get(`/leads?search=${encodeURIComponent(query)}&limit=5`);
      const leads = leadsData.leads || [];

      if (leads.length === 0) {
        resultsEl.innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center;padding:2rem;"><p style="color:var(--text-tertiary);">Nenhum lead encontrado</p></div>';
        return;
      }

      resultsEl.innerHTML = leads.map(lead => `
        <div class="card" style="padding:1.25rem;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem;">
            <h4 style="color:white;font-size:0.95rem;flex:1;">${lead.name}</h4>
            <button class="btn btn-sm btn-primary" onclick="EnrichmentPage.enrichSingle('${lead.id}')" style="font-size:0.75rem;"><i data-lucide="sparkles"></i>Enriquecer</button>
          </div>
          ${lead.cnpj ? `<p style="font-size:0.78rem;color:var(--text-tertiary);font-family:monospace;">CNPJ: ${lead.cnpj}</p>` : ''}
          ${lead.city ? `<p style="font-size:0.78rem;color:var(--text-secondary);">📍 ${lead.city}${lead.state ? '/' + lead.state : ''}</p>` : ''}
          <div style="margin-top:0.5rem;display:flex;gap:0.5rem;">
            ${lead.phone ? `<span style="font-size:0.7rem;color:#818cf8;">📞 ${lead.phone}</span>` : ''}
            ${lead.email ? `<span style="font-size:0.7rem;color:#818cf8;">✉️ ${lead.email}</span>` : ''}
          </div>
        </div>
      `).join('');
      lucide.createIcons();
    } catch (err) {
      showToast('Erro ao buscar: ' + err.message, 'danger');
    }
  },

  async enrichSingle(leadId) {
    showToast('Enriquecendo lead...', 'info');

    try {
      const result = await API.post(`/enrichment/enrich/${leadId}`);
      showToast('Lead enriquecido com sucesso!', 'success');
      this.loadStats();
    } catch (err) {
      showToast('Erro: ' + err.message, 'danger');
    }
  }
};
