// Reports Page - Advanced Analytics & Metrics
const ReportsPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Relatorios';
    document.getElementById('page-subtitle').textContent = 'Metricas e analises do negocio';
    const el = document.getElementById('page-reports');
    el.innerHTML = '<div class="skeleton-card" style="height:400px;"></div>';

    try {
      const data = await API.get('/reports/overview');
      el.innerHTML = `
        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem;">
          <div class="card" style="padding:1.25rem;text-align:center;">
            <p style="font-size:0.7rem;color:var(--text-tertiary);text-transform:uppercase;margin:0 0 4px;">Total Leads</p>
            <p style="font-size:1.8rem;color:white;font-weight:700;margin:0;">${data.totalLeads}</p>
          </div>
          <div class="card" style="padding:1.25rem;text-align:center;">
            <p style="font-size:0.7rem;color:var(--text-tertiary);text-transform:uppercase;margin:0 0 4px;">Clientes Ativos</p>
            <p style="font-size:1.8rem;color:#10b981;font-weight:700;margin:0;">${data.activeClients}</p>
          </div>
          <div class="card" style="padding:1.25rem;text-align:center;">
            <p style="font-size:0.7rem;color:var(--text-tertiary);text-transform:uppercase;margin:0 0 4px;">Receita Total</p>
            <p style="font-size:1.8rem;color:#22d3ee;font-weight:700;margin:0;">R$ ${(data.totalRevenue || 0).toLocaleString('pt-BR')}</p>
          </div>
          <div class="card" style="padding:1.25rem;text-align:center;">
            <p style="font-size:0.7rem;color:var(--text-tertiary);text-transform:uppercase;margin:0 0 4px;">Conversao</p>
            <p style="font-size:1.8rem;color:#f59e0b;font-weight:700;margin:0;">${data.funnel.conversionRate}%</p>
          </div>
          <div class="card" style="padding:1.25rem;text-align:center;">
            <p style="font-size:0.7rem;color:var(--text-tertiary);text-transform:uppercase;margin:0 0 4px;">Score Medio</p>
            <p style="font-size:1.8rem;color:#818cf8;font-weight:700;margin:0;">${data.scoring?.avgScore || 0}</p>
          </div>
        </div>

        <!-- Funil + Scoring -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
          <div class="card" style="padding:1.25rem;">
            <h3 style="color:white;font-size:1rem;margin:0 0 1rem;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="filter" style="width:18px;height:18px;color:var(--accent-primary);"></i>Funil de Conversao</h3>
            ${this.renderFunnel(data.funnel)}
          </div>
          <div class="card" style="padding:1.25rem;">
            <h3 style="color:white;font-size:1rem;margin:0 0 1rem;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="target" style="width:18px;height:18px;color:#f43f5e;"></i>Scoring de Leads</h3>
            ${this.renderScoring(data.scoring)}
          </div>
        </div>

        <!-- Pipeline + Source -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
          <div class="card" style="padding:1.25rem;">
            <h3 style="color:white;font-size:1rem;margin:0 0 1rem;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="kanban-square" style="width:18px;height:18px;color:var(--accent-secondary);"></i>Pipeline</h3>
            ${this.renderPipeline(data.pipeline)}
          </div>
          <div class="card" style="padding:1.25rem;">
            <h3 style="color:white;font-size:1rem;margin:0 0 1rem;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="database" style="width:18px;height:18px;color:#10b981;"></i>Fontes dos Leads</h3>
            ${this.renderSources(data.bySource)}
          </div>
        </div>

        <!-- Top Cities + Sellers -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
          <div class="card" style="padding:1.25rem;">
            <h3 style="color:white;font-size:1rem;margin:0 0 1rem;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="map-pin" style="width:18px;height:18px;color:#f59e0b;"></i>Top Cidades</h3>
            ${this.renderCities(data.byCity)}
          </div>
          <div class="card" style="padding:1.25rem;">
            <h3 style="color:white;font-size:1rem;margin:0 0 1rem;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="trophy" style="width:18px;height:18px;color:#f59e0b;"></i>Desempenho Vendedores</h3>
            ${this.renderSellers(data.sellerPerf)}
          </div>
        </div>
      `;
      lucide.createIcons();
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><p>Erro ao carregar relatorios: ${err.message}</p></div>`;
    }
  },

  renderFunnel(f) {
    const stages = [
      { label: 'Total de Leads', value: f.total, color: '#818cf8' },
      { label: 'Contactados', value: f.contacted, color: '#22d3ee' },
      { label: 'Propostas', value: f.proposal, color: '#f59e0b' },
      { label: 'Fechados', value: f.closed, color: '#10b981' },
      { label: 'Perdidos', value: f.lost, color: '#f43f5e' },
    ];
    const max = f.total || 1;
    return stages.map(s => `
      <div style="margin-bottom:0.6rem;">
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:3px;">
          <span style="color:var(--text-secondary);">${s.label}</span>
          <span style="color:white;font-weight:600;">${s.value}</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${(s.value / max) * 100}%;background:${s.color};border-radius:4px;transition:width 0.5s;"></div>
        </div>
      </div>
    `).join('');
  },

  renderScoring(s) {
    if (!s) return '<p style="color:var(--text-tertiary);">Sem dados de scoring</p>';
    const levels = [
      { label: 'Hot (80+)', value: s.hot, color: '#f43f5e', emoji: '🔥' },
      { label: 'Warm (60-79)', value: s.warm, color: '#f59e0b', emoji: '🌡️' },
      { label: 'Cool (40-59)', value: s.cool, color: '#22d3ee', emoji: '❄️' },
      { label: 'Cold (<40)', value: s.cold, color: '#6b7280', emoji: '🧊' },
    ];
    const max = s.total || 1;
    return levels.map(l => `
      <div style="margin-bottom:0.6rem;">
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:3px;">
          <span style="color:var(--text-secondary);">${l.emoji} ${l.label}</span>
          <span style="color:white;font-weight:600;">${l.value}</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${(l.value / max) * 100}%;background:${l.color};border-radius:4px;"></div>
        </div>
      </div>
    `).join('');
  },

  renderPipeline(stages) {
    const names = { leads: 'Novos', contato: 'Contato', proposta: 'Proposta', fechado: 'Fechado', perdido: 'Perdido' };
    const colors = { leads: '#818cf8', contato: '#22d3ee', proposta: '#f59e0b', fechado: '#10b981', perdido: '#f43f5e' };
    const total = stages.reduce((s, p) => s + p.count, 0) || 1;
    return stages.map(s => `
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
        <div style="width:8px;height:8px;border-radius:50%;background:${colors[s.pipeline_stage] || '#6b7280'};flex-shrink:0;"></div>
        <span style="font-size:0.82rem;color:var(--text-secondary);flex:1;">${names[s.pipeline_stage] || s.pipeline_stage}</span>
        <span style="font-size:0.82rem;color:white;font-weight:600;">${s.count}</span>
        <span style="font-size:0.7rem;color:var(--text-tertiary);width:35px;text-align:right;">${Math.round((s.count / total) * 100)}%</span>
      </div>
    `).join('');
  },

  renderSources(sources) {
    const colors = { 'receita_federal': '#10b981', 'manual': '#818cf8', 'power_mine': '#22d3ee', 'automation': '#f59e0b' };
    return sources.map(s => `
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
        <div style="width:8px;height:8px;border-radius:50%;background:${colors[s.source] || '#6b7280'};flex-shrink:0;"></div>
        <span style="font-size:0.82rem;color:var(--text-secondary);flex:1;">${s.source || 'N/I'}</span>
        <span style="font-size:0.82rem;color:white;font-weight:600;">${s.count}</span>
      </div>
    `).join('');
  },

  renderCities(cities) {
    return cities.map((c, i) => `
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
        <span style="font-size:0.7rem;color:var(--text-tertiary);width:20px;">#${i + 1}</span>
        <span style="font-size:0.82rem;color:var(--text-secondary);flex:1;">${c.city}</span>
        <span style="font-size:0.82rem;color:white;font-weight:600;">${c.count}</span>
      </div>
    `).join('');
  },

  renderSellers(sellers) {
    if (!sellers.length) return '<p style="color:var(--text-tertiary);text-align:center;">Nenhum vendedor com leads</p>';
    return sellers.map((s, i) => {
      const rate = s.total_leads > 0 ? ((s.closed / s.total_leads) * 100).toFixed(0) : 0;
      return `
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
          <span style="font-size:0.7rem;color:var(--text-tertiary);width:20px;">#${i + 1}</span>
          <div style="flex:1;">
            <span style="font-size:0.82rem;color:white;font-weight:500;">${s.name}</span>
            <span style="font-size:0.7rem;color:var(--text-tertiary);margin-left:0.5rem;">${s.total_leads} leads · ${s.closed} fechados · ${rate}%</span>
          </div>
        </div>
      `;
    }).join('');
  },
};
