// Dashboard Page - Premium Analytics View
const DashboardPage = {
  currentPeriod: '30d',
  refreshInterval: null,

  async render() {
    const el = document.getElementById('page-dashboard');
    document.getElementById('page-title').textContent = 'Dashboard';
    document.getElementById('page-subtitle').textContent = 'Visao geral do sistema';

    Charts.destroyAll();
    el.innerHTML = this.renderSkeletons();

    try {
      const period = this.currentPeriod;
      const [overview, leadsChart, pipelineChart, topSellers, alerts, geo, funnel, scoreDist] = await Promise.all([
        API.get(`/dashboard/overview?period=${period}`),
        API.get(`/dashboard/leads-chart?period=${period}`),
        API.get('/dashboard/pipeline-chart'),
        API.get('/dashboard/top-sellers'),
        API.get('/dashboard/alerts'),
        API.get('/dashboard/geo'),
        API.get('/dashboard/funnel'),
        API.get('/dashboard/score-dist'),
      ]);

      const totalPipeline = pipelineChart.data.reduce((s, d) => s + d.count, 0);

      el.innerHTML = `
        <!-- Top Bar: Period Filter + Export -->
        <div class="dashboard-top-bar">
          <div class="period-filter">
            <button class="period-btn ${period === '7d' ? 'active' : ''}" onclick="DashboardPage.setPeriod('7d')">7 dias</button>
            <button class="period-btn ${period === '30d' ? 'active' : ''}" onclick="DashboardPage.setPeriod('30d')">30 dias</button>
            <button class="period-btn ${period === '90d' ? 'active' : ''}" onclick="DashboardPage.setPeriod('90d')">90 dias</button>
            <button class="period-btn ${period === '12m' ? 'active' : ''}" onclick="DashboardPage.setPeriod('12m')">12 meses</button>
          </div>
          <div class="dashboard-top-actions">
            <button class="quick-action-btn" onclick="DashboardPage.exportDashboard()" title="Exportar dados">
              <i data-lucide="download"></i>
              <span>Exportar</span>
            </button>
            <button class="quick-action-btn" onclick="DashboardPage.render()" title="Atualizar">
              <i data-lucide="refresh-cw"></i>
            </button>
          </div>
        </div>

        <!-- Smart Alerts -->
        ${alerts.alerts.length > 0 ? `
        <div class="dashboard-alerts">
          ${alerts.alerts.map(a => `
            <div class="alert-card alert-${a.type}" onclick="App.navigateTo('${a.action}')">
              <i data-lucide="${a.icon}"></i>
              <span>${a.message}</span>
              <i data-lucide="chevron-right" class="alert-arrow"></i>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <!-- Quick Actions -->
        <div class="quick-actions-bar">
          <button class="quick-action-btn" onclick="App.navigateTo('leads')">
            <i data-lucide="pickaxe"></i>
            <span>Minerar Leads</span>
          </button>
          <button class="quick-action-btn" onclick="App.navigateTo('kanban')">
            <i data-lucide="kanban-square"></i>
            <span>Ver Pipeline</span>
          </button>
          <button class="quick-action-btn" onclick="App.navigateTo('clients')">
            <i data-lucide="user-plus"></i>
            <span>Novo Cliente</span>
          </button>
          <button class="quick-action-btn" onclick="App.navigateTo('financial')">
            <i data-lucide="bar-chart-3"></i>
            <span>Financeiro</span>
          </button>
        </div>

        <!-- KPI Cards -->
        <div class="dashboard-kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon-large" style="background:linear-gradient(135deg,#818cf8,#6366f1);">
              <i data-lucide="target"></i>
            </div>
            <div class="kpi-info">
              <span class="kpi-value" data-counter="${overview.totalLeads}">0</span>
              <span class="kpi-label">Total de Leads</span>
              <span class="kpi-trend ${overview.trends.leads >= 0 ? 'up' : 'down'}">
                <i data-lucide="${overview.trends.leads >= 0 ? 'trending-up' : 'trending-down'}" style="width:12px;height:12px;"></i>
                ${overview.trends.leads >= 0 ? '+' : ''}${overview.trends.leads}% vs ${overview.periodLabel}
              </span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon-large" style="background:linear-gradient(135deg,#22d3ee,#06b6d4);">
              <i data-lucide="trending-up"></i>
            </div>
            <div class="kpi-info">
              <span class="kpi-value" data-counter="${overview.conversionRate}" data-suffix="%">0%</span>
              <span class="kpi-label">Taxa de Conversao</span>
              <span class="kpi-trend up"><i data-lucide="check-circle" style="width:12px;height:12px;"></i> ${overview.closedLeads} fechados</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon-large" style="background:linear-gradient(135deg,#10b981,#059669);">
              <i data-lucide="dollar-sign"></i>
            </div>
            <div class="kpi-info">
              <span class="kpi-value">R$ ${overview.mrr.toLocaleString('pt-BR')}</span>
              <span class="kpi-label">Receita Mensal (MRR)</span>
              <span class="kpi-trend up"><i data-lucide="wallet" style="width:12px;height:12px;"></i> de ${overview.activeClients} clientes</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon-large" style="background:linear-gradient(135deg,#f59e0b,#d97706);">
              <i data-lucide="users"></i>
            </div>
            <div class="kpi-info">
              <span class="kpi-value" data-counter="${overview.activeClients}">0</span>
              <span class="kpi-label">Clientes Ativos</span>
              <span class="kpi-trend up"><i data-lucide="user-check" style="width:12px;height:12px;"></i> de ${overview.totalClients} total</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon-large" style="background:linear-gradient(135deg,#a78bfa,#7c3aed);">
              <i data-lucide="funnel"></i>
            </div>
            <div class="kpi-info">
              <span class="kpi-value" data-counter="${totalPipeline}">0</span>
              <span class="kpi-label">Pipeline Ativo</span>
              <span class="kpi-trend up"><i data-lucide="layers" style="width:12px;height:12px;"></i> ${pipelineChart.data.length} estagios</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon-large" style="background:linear-gradient(135deg,#f43f5e,#e11d48);">
              <i data-lucide="activity"></i>
            </div>
            <div class="kpi-info">
              <span class="kpi-value" data-counter="${overview.recentActivities?.length || 0}">0</span>
              <span class="kpi-label">Atividades Hoje</span>
              <span class="kpi-trend up"><i data-lucide="zap" style="width:12px;height:12px;"></i> acoes recentes</span>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="dashboard-charts-grid">
          <div class="chart-card">
            <h3><i data-lucide="bar-chart-3"></i> Leads por Periodo</h3>
            <div class="chart-container"><canvas id="chart-leads-month"></canvas></div>
          </div>
          <div class="chart-card">
            <h3><i data-lucide="pie-chart"></i> Pipeline</h3>
            <div class="chart-container"><canvas id="chart-pipeline"></canvas></div>
            <div class="pipeline-progress-section">
              <div class="pipeline-bar-group" id="pipeline-bars"></div>
            </div>
          </div>
        </div>

        <!-- Funnel + Score Distribution -->
        <div class="dashboard-charts-grid">
          <div class="chart-card">
            <h3><i data-lucide="filter"></i> Funil de Conversao</h3>
            <div class="funnel-container" id="funnel-container"></div>
          </div>
          <div class="chart-card">
            <h3><i data-lucide="bar-chart"></i> Distribuicao de Score</h3>
            <div class="chart-container"><canvas id="chart-score-dist"></canvas></div>
          </div>
        </div>

        <!-- Geographic + Top Cities -->
        <div class="dashboard-charts-grid">
          <div class="chart-card">
            <h3><i data-lucide="map-pin"></i> Top 10 Cidades</h3>
            <div class="top-cities-list" id="top-cities-list"></div>
          </div>
          <div class="chart-card">
            <h3><i data-lucide="map"></i> Leads por Estado</h3>
            <div class="chart-container"><canvas id="chart-states"></canvas></div>
          </div>
        </div>

        <!-- Bottom Row: Activity + Sellers -->
        <div class="dashboard-bottom-grid">
          <div class="card">
            <div class="card-header">
              <h3><i data-lucide="activity"></i> Atividade Recente</h3>
            </div>
            <div class="activity-feed stagger-list" id="activity-feed"></div>
          </div>
          <div class="card">
            <div class="card-header">
              <h3><i data-lucide="trophy"></i> Top Vendedores</h3>
            </div>
            <div class="stagger-list" id="top-sellers-list"></div>
          </div>
        </div>
      `;

      lucide.createIcons();

      // Animate counters
      this.animateCounters();

      // Leads chart
      const lcLabels = leadsChart.data.map(d => d.period);
      const lcData = leadsChart.data.map(d => d.count);
      if (lcLabels.length) Charts.createLine('chart-leads-month', lcLabels, lcData, 'Leads');

      // Pipeline doughnut
      const pcLabels = pipelineChart.data.map(d => {
        const names = { leads: 'Novos', contato: 'Contato', proposta: 'Proposta', fechado: 'Fechado', perdido: 'Perdido' };
        return names[d.pipeline_stage] || d.pipeline_stage;
      });
      const pcData = pipelineChart.data.map(d => d.count);
      if (pcLabels.length) Charts.createDoughnut('chart-pipeline', pcLabels, pcData);

      // Score distribution bar chart
      const sdLabels = scoreDist.data.map(d => d.label);
      const sdData = scoreDist.data.map(d => d.count);
      if (sdLabels.length) {
        Charts.createBar('chart-score-dist', sdLabels, sdData, 'Leads');
      }

      // States bar chart
      const topStates = geo.byState.slice(0, 12);
      if (topStates.length) {
        Charts.createBar('chart-states', topStates.map(s => s.state), topStates.map(s => s.count), 'Leads');
      }

      // Pipeline progress bars
      this.renderPipelineBars(pipelineChart.data, totalPipeline);

      // Funnel
      this.renderFunnel(funnel.stages);

      // Top cities
      this.renderTopCities(geo.byCity);

      // Activity feed
      this.renderActivityFeed(overview.recentActivities);

      // Top sellers with avatars
      this.renderTopSellers(topSellers.sellers);

      // Auto-refresh every 30s
      this.startAutoRefresh();

    } catch (err) {
      el.innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-triangle"></i>
          <p>Erro ao carregar dashboard</p>
          <span class="text-secondary text-sm">${err.message}</span>
          <button class="btn btn-primary" style="margin-top:1rem;" onclick="DashboardPage.render()">
            <i data-lucide="refresh-cw"></i> Tentar Novamente
          </button>
        </div>
      `;
      lucide.createIcons();
    }
  },

  renderSkeletons() {
    return `
      <div class="dashboard-top-bar">
        <div class="skeleton" style="height:36px;width:300px;border-radius:8px;"></div>
        <div class="skeleton" style="height:36px;width:120px;border-radius:8px;"></div>
      </div>
      <div class="quick-actions-bar">
        <div class="skeleton" style="height:40px;width:150px;border-radius:12px;"></div>
        <div class="skeleton" style="height:40px;width:140px;border-radius:12px;"></div>
        <div class="skeleton" style="height:40px;width:160px;border-radius:12px;"></div>
      </div>
      <div class="dashboard-kpi-grid">
        ${Array(6).fill('<div class="skeleton-card"><div class="skeleton skeleton-circle" style="margin-bottom:12px;"></div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div></div>').join('')}
      </div>
      <div class="dashboard-charts-grid">
        <div class="skeleton-card" style="min-height:320px;"></div>
        <div class="skeleton-card" style="min-height:320px;"></div>
      </div>
      <div class="dashboard-bottom-grid">
        <div class="skeleton-card" style="min-height:200px;"></div>
        <div class="skeleton-card" style="min-height:200px;"></div>
      </div>
    `;
  },

  setPeriod(period) {
    this.currentPeriod = period;
    this.render();
  },

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshInterval = setInterval(() => {
      if (App.currentPage === 'dashboard') this.render();
    }, 30000);
  },

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  },

  exportDashboard() {
    window.open('/api/dashboard/export', '_blank');
  },

  animateCounters() {
    document.querySelectorAll('[data-counter]').forEach(el => {
      const target = parseFloat(el.dataset.counter);
      const suffix = el.dataset.suffix || '';
      const isFloat = target % 1 !== 0;
      const duration = 800;
      const start = performance.now();

      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = eased * target;
        el.textContent = (isFloat ? current.toFixed(1) : Math.round(current)) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  },

  renderPipelineBars(data, total) {
    const container = document.getElementById('pipeline-bars');
    if (!container || !data.length) return;

    const stageLabels = { leads: 'Novos Leads', contato: 'Em Contato', proposta: 'Proposta', fechado: 'Fechados', perdido: 'Perdidos' };

    container.innerHTML = data.map(d => {
      const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
      return `
        <div class="pipeline-bar-item">
          <span class="pipeline-bar-label">${stageLabels[d.pipeline_stage] || d.pipeline_stage}</span>
          <div class="pipeline-bar-track">
            <div class="pipeline-bar-fill ${d.pipeline_stage}" style="width:${pct}%;"></div>
          </div>
          <span class="pipeline-bar-count">${d.count}</span>
        </div>
      `;
    }).join('');
  },

  renderFunnel(stages) {
    const container = document.getElementById('funnel-container');
    if (!container || !stages.length) return;

    const colors = ['#818cf8', '#22d3ee', '#f59e0b', '#10b981'];

    container.innerHTML = stages.map((s, i) => {
      const width = 100 - (i * 18);
      return `
        <div class="funnel-stage" style="width:${width}%;background:${colors[i]};opacity:${1 - (i * 0.15)};">
          <div class="funnel-stage-content">
            <span class="funnel-stage-name">${s.name}</span>
            <span class="funnel-stage-count">${s.count}</span>
            <span class="funnel-stage-pct">${s.pct}%</span>
          </div>
        </div>
      `;
    }).join('');
  },

  renderTopCities(cities) {
    const container = document.getElementById('top-cities-list');
    if (!container) return;

    if (cities?.length) {
      const maxCount = cities[0]?.count || 1;
      container.innerHTML = cities.map((c, i) => {
        const pct = Math.round((c.count / maxCount) * 100);
        return `
          <div class="city-bar-item">
            <span class="city-rank">#${i + 1}</span>
            <div class="city-info">
              <div class="city-name-row">
                <span class="city-name">${c.city}</span>
                <span class="city-state">${c.state}</span>
              </div>
              <div class="city-bar-track">
                <div class="city-bar-fill" style="width:${pct}%;"></div>
              </div>
            </div>
            <span class="city-count">${c.count}</span>
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = '<p class="text-tertiary text-sm" style="text-align:center;padding:2rem;">Sem dados geograficos</p>';
    }
  },

  renderActivityFeed(activities) {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    if (activities?.length) {
      const colors = { created: '#10b981', updated: '#818cf8', stage_changed: '#22d3ee', deleted: '#f43f5e', login: '#f59e0b' };
      const labels = { created: 'criou', updated: 'atualizou', stage_changed: 'moveu', deleted: 'removeu', login: 'fez login' };
      feed.innerHTML = activities.map(a => `
        <div class="activity-item">
          <div class="activity-dot" style="background:${colors[a.action] || '#6b7280'}"></div>
          <div>
            <div class="activity-text"><strong>${a.user_name || 'Sistema'}</strong> ${labels[a.action] || a.action} ${a.entity_type}</div>
            <div class="activity-time">${this.timeAgo(a.created_at)}</div>
          </div>
        </div>
      `).join('');
    } else {
      feed.innerHTML = '<p class="text-tertiary text-sm" style="text-align:center;padding:2rem;">Nenhuma atividade recente</p>';
    }
  },

  renderTopSellers(sellers) {
    const list = document.getElementById('top-sellers-list');
    if (!list) return;

    if (sellers?.length) {
      const avatarColors = ['#818cf8', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e'];
      list.innerHTML = sellers.map((s, i) => {
        const initials = s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        return `
          <div class="seller-item">
            <div class="seller-avatar" style="background:${avatarColors[i % avatarColors.length]};">${initials}</div>
            <span class="seller-rank">#${i + 1}</span>
            <div class="seller-info">
              <span class="seller-name">${s.name}</span>
              <span class="seller-stats">${s.lead_count} leads · ${s.closed_count} fechados</span>
            </div>
            <div class="seller-bar">
              <div class="seller-bar-fill" style="width:${sellers[0].lead_count > 0 ? (s.lead_count / sellers[0].lead_count * 100) : 0}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      list.innerHTML = '<p class="text-tertiary text-sm" style="text-align:center;padding:2rem;">Sem dados de vendedores</p>';
    }
  },

  timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `ha ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `ha ${Math.floor(diff / 3600)}h`;
    return `ha ${Math.floor(diff / 86400)}d`;
  }
};
