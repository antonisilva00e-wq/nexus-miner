// Scoring Page - Lead scoring and qualification
const ScoringPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Scoring de Leads';
    document.getElementById('page-subtitle').textContent = 'Classifique e priorize seus leads por potencial de conversao';

    document.getElementById('page-leads').innerHTML = `
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;"><i data-lucide="bar-chart-3" style="color:white;width:20px;height:20px;"></i></div>
          <div><h3 style="color:white;font-size:1.1rem;">Estatisticas de Scoring</h3><p style="color:var(--text-tertiary);font-size:0.8rem;">Visao geral da qualificacao dos leads</p></div>
        </div>
        <div id="scoring-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;"></div>
      </div>

      <div class="filters-bar" style="margin-bottom:1.5rem;">
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn btn-sm btn-secondary active" onclick="ScoringPage.filterLevel('all')" id="filter-all">Todos</button>
          <button class="btn btn-sm" onclick="ScoringPage.filterLevel('hot')" id="filter-hot" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);">🔥 Quentes (80+)</button>
          <button class="btn btn-sm" onclick="ScoringPage.filterLevel('warm')" id="filter-warm" style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);">🌡️ Mornos (60-79)</button>
          <button class="btn btn-sm" onclick="ScoringPage.filterLevel('cool')" id="filter-cool" style="background:rgba(59,130,246,0.15);color:#3b82f6;border:1px solid rgba(59,130,246,0.3);">❄️ Frios (40-59)</button>
          <button class="btn btn-sm" onclick="ScoringPage.filterLevel('cold')" id="filter-cold" style="background:rgba(107,114,128,0.15);color:#6b7280;border:1px solid rgba(107,114,128,0.3);">🧊 Congelados (<40)</button>
        </div>
        <span id="scoring-count" style="color:var(--text-secondary);font-size:0.85rem;"></span>
      </div>

      <div id="scoring-results" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1rem;"></div>
      <div class="empty-state" id="scoring-empty">
        <i data-lucide="bar-chart-3" style="width:60px;height:60px;color:var(--accent-primary);"></i>
        <h3 style="color:white;margin-top:1rem;">Carregando leads...</h3>
        <p style="color:var(--text-tertiary);">Aguarde enquanto analisamos seus leads</p>
      </div>
    `;
    lucide.createIcons();

    this.loadStats();
    this.loadLeads('all');
  },

  async loadStats() {
    try {
      const stats = await API.get('/scoring/stats');
      const el = document.getElementById('scoring-stats');
      if (!el) return;

      el.innerHTML = `
        <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.12);border-radius:var(--border-radius-md);padding:1rem;">
          <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">Total de Leads</p>
          <p style="color:white;font-size:1.5rem;font-weight:700;margin:0;">${stats.total || 0}</p>
        </div>
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.12);border-radius:var(--border-radius-md);padding:1rem;">
          <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">🔥 Quentes (80+)</p>
          <p style="color:#ef4444;font-size:1.5rem;font-weight:700;margin:0;">${stats.hot || 0}</p>
        </div>
        <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.12);border-radius:var(--border-radius-md);padding:1rem;">
          <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">🌡️ Mornos (60-79)</p>
          <p style="color:#f59e0b;font-size:1.5rem;font-weight:700;margin:0;">${stats.warm || 0}</p>
        </div>
        <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.12);border-radius:var(--border-radius-md);padding:1rem;">
          <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">❄️ Frios (40-59)</p>
          <p style="color:#3b82f6;font-size:1.5rem;font-weight:700;margin:0;">${stats.cool || 0}</p>
        </div>
        <div style="background:rgba(107,114,128,0.06);border:1px solid rgba(107,114,128,0.12);border-radius:var(--border-radius-md);padding:1rem;">
          <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">🧊 Congelados (<40)</p>
          <p style="color:#6b7280;font-size:1.5rem;font-weight:700;margin:0;">${stats.cold || 0}</p>
        </div>
        <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.12);border-radius:var(--border-radius-md);padding:1rem;">
          <p style="color:var(--text-tertiary);font-size:0.75rem;margin:0 0 4px;">Score Medio</p>
          <p style="color:#10b981;font-size:1.5rem;font-weight:700;margin:0;">${stats.avgScore || 0}%</p>
        </div>
      `;
    } catch (err) {
      console.error('Erro ao carregar stats:', err);
    }
  },

  async loadLeads(level) {
    const container = document.getElementById('scoring-results');
    const empty = document.getElementById('scoring-empty');
    const countEl = document.getElementById('scoring-count');

    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;"><div class="spin-animation" style="width:40px;height:40px;border:3px solid rgba(245,158,11,0.2);border-top-color:#f59e0b;border-radius:50%;margin:0 auto;"></div><p style="color:var(--text-secondary);margin-top:1rem;">Analisando leads...</p></div>';
    empty.style.display = 'none';

    try {
      const data = await API.get(`/scoring/leads?level=${level}&limit=50`);
      const leads = data.leads || [];

      if (leads.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'flex';
        empty.querySelector('h3').textContent = 'Nenhum lead encontrado';
        empty.querySelector('p').textContent = 'Minere leads primeiro para ver o scoring';
        countEl.textContent = '';
        return;
      }

      countEl.textContent = `${leads.length} leads | ${data.total} total`;

      container.innerHTML = leads.map(lead => {
        const score = lead.score || 0;
        const scoreColor = score >= 80 ? '#ef4444' : score >= 60 ? '#f59e0b' : score >= 40 ? '#3b82f6' : '#6b7280';
        const scoreLabel = score >= 80 ? 'QUENTE' : score >= 60 ? 'MORNO' : score >= 40 ? 'FRIO' : 'CONGELADO';
        const scoreEmoji = score >= 80 ? '🔥' : score >= 60 ? '🌡️' : score >= 40 ? '❄️' : '🧊';

        // Score breakdown - calculate categories from individual fields
        const breakdown = lead.breakdown || {};
        const dataScore = (breakdown.cnpj || 0) + (breakdown.phone || 0) + (breakdown.email || 0) + 
                         (breakdown.site || 0) + (breakdown.address || 0) + (breakdown.city || 0) + 
                         (breakdown.owner || 0) + (breakdown.bank || 0);
        const sourceScore = breakdown.source || 0;
        const businessScore = (breakdown.capital || 0) + (breakdown.ativa || 0);
        const engagementScore = breakdown.pipeline || 0;

        return `
          <div class="card" style="padding:1.25rem;position:relative;border-left:4px solid ${scoreColor};">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem;">
              <h4 style="color:white;font-size:0.95rem;flex:1;">${lead.name}</h4>
              <div style="display:flex;align-items:center;gap:0.5rem;">
                <span style="font-size:1.2rem;">${scoreEmoji}</span>
                <div style="text-align:right;">
                  <div style="font-size:1.1rem;font-weight:700;color:${scoreColor};">${score}%</div>
                  <div style="font-size:0.65rem;color:${scoreColor};font-weight:600;">${scoreLabel}</div>
                </div>
              </div>
            </div>

            ${lead.activity ? `<p style="font-size:0.8rem;color:var(--text-secondary);margin:0 0 0.5rem;">${lead.activity}</p>` : ''}
            ${lead.city ? `<p style="font-size:0.78rem;color:var(--text-tertiary);margin:0 0 0.5rem;">📍 ${lead.city}${lead.state ? '/' + lead.state : ''}</p>` : ''}

            <!-- Score Breakdown -->
            <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border-color);">
              <p style="font-size:0.7rem;color:var(--text-tertiary);margin:0 0 0.5rem;">DETALHAMENTO DO SCORE:</p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.3rem;font-size:0.75rem;">
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--text-tertiary);">Dados:</span>
                  <span style="color:${dataScore >= 30 ? '#10b981' : dataScore >= 20 ? '#f59e0b' : '#ef4444'};">${dataScore}/40</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--text-tertiary);">Fonte:</span>
                  <span style="color:${sourceScore >= 20 ? '#10b981' : sourceScore >= 15 ? '#f59e0b' : '#ef4444'};">${sourceScore}/25</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--text-tertiary);">Negocio:</span>
                  <span style="color:${businessScore >= 15 ? '#10b981' : businessScore >= 10 ? '#f59e0b' : '#ef4444'};">${businessScore}/20</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--text-tertiary);">Engajamento:</span>
                  <span style="color:${engagementScore >= 10 ? '#10b981' : engagementScore >= 5 ? '#f59e0b' : '#ef4444'};">${engagementScore}/15</span>
                </div>
              </div>
            </div>

            <!-- Contact Info -->
            <div style="margin-top:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
              ${lead.phone ? `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(129,140,248,0.1);color:#818cf8;padding:3px 8px;border-radius:12px;font-size:0.7rem;">📞 ${lead.phone}</span>` : ''}
              ${lead.email ? `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(129,140,248,0.1);color:#818cf8;padding:3px 8px;border-radius:12px;font-size:0.7rem;">✉️ ${lead.email}</span>` : ''}
              ${lead.cnpj ? `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(107,114,128,0.1);color:#6b7280;padding:3px 8px;border-radius:12px;font-size:0.7rem;font-family:monospace;">${lead.cnpj}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      lucide.createIcons();
    } catch (err) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;"><p style="color:#f43f5e;">Erro ao carregar leads: ${err.message}</p></div>`;
    }
  },

  filterLevel(level) {
    // Update active button
    ['all', 'hot', 'warm', 'cool', 'cold'].forEach(l => {
      const btn = document.getElementById(`filter-${l}`);
      if (btn) {
        if (l === level) {
          btn.classList.add('active');
          btn.style.background = l === 'all' ? 'var(--accent-primary)' : '';
        } else {
          btn.classList.remove('active');
        }
      }
    });

    this.loadLeads(level);
  }
};
