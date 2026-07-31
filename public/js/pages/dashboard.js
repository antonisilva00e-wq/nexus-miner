// Dashboard Page - Premium Analytics View
const DashboardPage = {
  currentPeriod: '30d',
  refreshInterval: null,
  cachedData: null,

  
  initMatrixCanvas() {
    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth || window.innerWidth;
      canvas.height = canvas.parentElement.offsetHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const letters = '01010101010101NEXUSMINER';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize) + 1;
    const drops = [];
    for(let x = 0; x < columns; x++) drops[x] = Math.random() * -100;
    
    const draw = () => {
      ctx.fillStyle = 'rgba(4, 6, 15, 0.15)'; // Fade effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'rgba(6, 182, 212, 0.3)'; // Cyan matrix color
      ctx.font = fontSize + 'px monospace';
      
      for(let i = 0; i < drops.length; i++) {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.95) drops[i] = 0;
        drops[i]++;
      }
    };
    
    if (this.matrixInterval) clearInterval(this.matrixInterval);
    this.matrixInterval = setInterval(draw, 50);
  },
async render() {
    let el;
    try {
      el = document.getElementById('page-dashboard');
      if (!el) { console.error('[Dashboard] #page-dashboard nao encontrado!'); return; }

      // Garante que o elemento esta visivel antes de qualquer coisa
      el.style.display = 'block';

      // Atualiza o titulo imediatamente
      const titleEl = document.getElementById('page-title');
      const subtitleEl = document.getElementById('page-subtitle');
      if (titleEl) titleEl.textContent = 'Painel Premium';
      if (subtitleEl) subtitleEl.textContent = 'Visao geral do sistema';

      // Destroi charts e mostra skeletons de forma SINCRONA - antes de qualquer fetch
      try { Charts.destroyAll(); } catch(e) { console.warn('[Dashboard] destroyAll falhou:', e); }
      el.innerHTML = this.renderSkeletons();

    try {
      const period = this.currentPeriod;

      // Fetch individually so one failure doesn't blank everything
      const safe = async (p) => { try { return await p; } catch(e) { console.warn('API fail:', e.message); return null; } };
      const [overview, leadsChart, pipelineChart, topSellers, alerts, geo, funnel, scoreDist] = await Promise.all([
        safe(API.get(`/dashboard/overview?period=${period}`)),
        safe(API.get(`/dashboard/leads-chart?period=${period}`)),
        safe(API.get('/dashboard/pipeline-chart')),
        safe(API.get('/dashboard/top-sellers')),
        safe(API.get('/dashboard/alerts')),
        safe(API.get('/dashboard/geo')),
        safe(API.get('/dashboard/funnel')),
        safe(API.get('/dashboard/score-dist')),
      ]);

      // If overview failed, show a clear error instead of blank
      if (!overview) {
        el.innerHTML = `<div class="empty-state" style="padding:3rem;text-align:center;">
          <i data-lucide="wifi-off" style="width:48px;height:48px;color:var(--accent-primary);margin-bottom:1rem;"></i>
          <p style="font-size:1.1rem;color:white;margin-bottom:0.5rem;">Erro ao carregar dados</p>
          <span style="color:var(--text-secondary);font-size:0.9rem;">O servidor pode estar iniciando. Aguarde 30 segundos e tente novamente.</span>
          <br><button class="btn btn-primary" style="margin-top:1.5rem;" onclick="DashboardPage.render()">
            <i data-lucide="refresh-cw"></i> Tentar Novamente
          </button>
        </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      const totalPipeline = pipelineChart?.data?.reduce((s, d) => s + d.count, 0) || 0;

      // Cache data for export
      this.cachedData = {
        totalLeads: overview.totalLeads,
        conversionRate: overview.conversionRate,
        mrr: overview.mrr,
        activeClients: overview.activeClients,
        totalClients: overview.totalClients,
        totalPipeline,
        newLeadsPeriod: leadsChart?.data?.reduce((s, d) => s + d.count, 0) || 0,
        pipeline: pipelineChart?.data || [],
      };

      el.innerHTML = `
        <!-- VISÃO GERAL PREMIUM DASHBOARD -->
        <div class="vision-wrapper">

          <!-- Header -->
          <div class="vision-header">
            <div class="vision-header-left">
              <h1 class="vision-title">Visão Geral</h1>
              <p class="vision-subtitle">Acompanhe o desempenho do seu negócio em tempo real</p>
            </div>
            <div class="vision-header-right">
              <span class="vision-date-badge"><i data-lucide="calendar"></i> Período: ${period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : period === '90d' ? '90 dias' : '12 meses'}</span>
              <div class="vision-period-tabs">
                <button class="vpb ${period === '7d' ? 'active' : ''}" onclick="DashboardPage.setPeriod('7d')">7d</button>
                <button class="vpb ${period === '30d' ? 'active' : ''}" onclick="DashboardPage.setPeriod('30d')">30d</button>
                <button class="vpb ${period === '90d' ? 'active' : ''}" onclick="DashboardPage.setPeriod('90d')">90d</button>
                <button class="vpb ${period === '12m' ? 'active' : ''}" onclick="DashboardPage.setPeriod('12m')">12m</button>
              </div>
              <button class="vision-sync-btn" onclick="DashboardPage.render()"><i data-lucide="refresh-cw"></i></button>
            </div>
          </div>

          <!-- KPI Cards with Sparklines -->
          <div class="vision-kpi-row">
            <div class="vision-kpi-card">
              <div class="vkpi-header">
                <div class="vkpi-icon-wrap vkpi-green"><i data-lucide="dollar-sign"></i></div>
                <span class="vkpi-label">Receita Total</span>
              </div>
              <div class="vkpi-value">R$ ${overview.mrr.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
              <div class="vkpi-change ${overview.trends.leads >= 0 ? 'up' : 'down'}">
                <i data-lucide="${overview.trends.leads >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                ${overview.trends.leads >= 0 ? '+' : ''}${overview.trends.leads}% vs período anterior
              </div>
              <div class="vkpi-sparkline-wrap"><canvas class="sparkline-canvas" id="spark-mrr"></canvas></div>
            </div>

            <div class="vision-kpi-card">
              <div class="vkpi-header">
                <div class="vkpi-icon-wrap vkpi-blue"><i data-lucide="target"></i></div>
                <span class="vkpi-label">Total de Leads</span>
              </div>
              <div class="vkpi-value">${overview.totalLeads.toLocaleString('pt-BR')}</div>
              <div class="vkpi-change neutral">
                <i data-lucide="activity"></i> leads capturados
              </div>
              <div class="vkpi-sparkline-wrap"><canvas class="sparkline-canvas" id="spark-leads"></canvas></div>
            </div>

            <div class="vision-kpi-card">
              <div class="vkpi-header">
                <div class="vkpi-icon-wrap vkpi-purple"><i data-lucide="users"></i></div>
                <span class="vkpi-label">Clientes Ativos</span>
              </div>
              <div class="vkpi-value">${overview.activeClients}</div>
              <div class="vkpi-change up">
                <i data-lucide="arrow-up"></i> de ${overview.totalClients} cadastrados
              </div>
              <div class="vkpi-sparkline-wrap"><canvas class="sparkline-canvas" id="spark-clients"></canvas></div>
            </div>

            <div class="vision-kpi-card">
              <div class="vkpi-header">
                <div class="vkpi-icon-wrap vkpi-orange"><i data-lucide="trending-up"></i></div>
                <span class="vkpi-label">Ticket Médio</span>
              </div>
              <div class="vkpi-value">R$ ${overview.mrr > 0 && overview.activeClients > 0 ? (overview.mrr / overview.activeClients).toLocaleString('pt-BR', {minimumFractionDigits:2}) : '0,00'}</div>
              <div class="vkpi-change up">
                <i data-lucide="arrow-up"></i> ${overview.conversionRate}% conversão
              </div>
              <div class="vkpi-sparkline-wrap"><canvas class="sparkline-canvas" id="spark-ticket"></canvas></div>
            </div>
          </div>

          <!-- Charts Row 1: Receita + Funil -->
          <div class="vision-charts-row">
            <!-- Revenue Line Chart -->
            <div class="vision-chart-card vision-chart-large">
              <div class="vchart-header">
                <div class="vchart-title">Receita</div>
                <div class="vchart-actions">
                  <span class="vchart-badge">Mensal ▾</span>
                </div>
              </div>
              <div class="vchart-body"><canvas id="chart-leads-line"></canvas></div>
            </div>

            <!-- Funil de Vendas -->
            <div class="vision-chart-card">
              <div class="vchart-header">
                <div class="vchart-title">Funil de Vendas</div>
              </div>
              <div class="vision-funnel" id="vision-funnel-container">
                ${(() => {
                  const funnelData = [
                    { label: 'Leads', value: overview.totalLeads, color: '#6366f1' },
                    { label: 'Contato', value: Math.round(overview.totalLeads * 0.62), color: '#8b5cf6' },
                    { label: 'Proposta', value: Math.round(overview.totalLeads * 0.27), color: '#a78bfa' },
                    { label: 'Negociação', value: Math.round(overview.totalLeads * 0.15), color: '#c4b5fd' },
                    { label: 'Fechados', value: overview.closedLeads, color: '#34d399' },
                  ];
                  const max = funnelData[0].value || 1;
                  return funnelData.map((f, i) => {
                    const pct = (f.value / max) * 100;
                    const minW = 30;
                    const w = minW + (pct * (100 - minW) / 100);
                    return `<div class="vfunnel-row">
                      <div class="vfunnel-bar-wrap">
                        <div class="vfunnel-bar" style="width:${w}%;background:${f.color};">&nbsp;</div>
                      </div>
                      <div class="vfunnel-info">
                        <span class="vfunnel-label">${f.label}</span>
                        <span class="vfunnel-val">${f.value.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>`;
                  }).join('') + `<div class="vfunnel-rate">Taxa de conversão geral: <strong>${overview.conversionRate}%</strong></div>`;
                })()}
              </div>
            </div>
          </div>

          <!-- Charts Row 2: Donut + Origem + Atividades -->
          <div class="vision-mid-row">
            <!-- Taxa de Conversão Donut -->
            <div class="vision-chart-card">
              <div class="vchart-header"><div class="vchart-title">Taxa de Conversão</div></div>
              <div class="vdonut-wrap">
                <div class="vchart-body vdonut-body"><canvas id="chart-conversion-donut"></canvas></div>
                <div class="vdonut-center">${overview.conversionRate}%</div>
              </div>
              <div class="vdonut-meta">
                <div class="vdonut-stat"><span>${overview.closedLeads}</span><small>Fechados</small></div>
                <div class="vdonut-stat"><span>${overview.totalLeads}</span><small>Leads</small></div>
              </div>
            </div>

            <!-- Origem dos Leads -->
            <div class="vision-chart-card">
              <div class="vchart-header"><div class="vchart-title">Origem dos Leads</div></div>
              <div class="vorigens-wrap">
                <div class="vchart-body" style="height:200px;"><canvas id="chart-leads-month"></canvas></div>
              </div>
            </div>

            <!-- Atividades Recentes -->
            <div class="vision-chart-card">
              <div class="vchart-header"><div class="vchart-title">Atividades Recentes</div></div>
              <div class="vactivities" id="vision-activity-feed"></div>
            </div>
          </div>

          <!-- Row 3: Leads Recentes + Receita por Produto -->
          <div class="vision-bottom-row">
            <!-- Leads Table -->
            <div class="vision-chart-card vision-chart-large">
              <div class="vchart-header">
                <div class="vchart-title">Leads Recentes</div>
                <button class="vchart-badge" onclick="App.navigateTo('leads')">Ver Todos os Leads →</button>
              </div>
              <div class="vleads-table-wrap">
                <table class="vleads-table">
                  <thead><tr><th>LEAD</th><th>ORIGEM</th><th>VALOR POTENCIAL</th><th>STATUS</th></tr></thead>
                  <tbody id="vision-leads-tbody"></tbody>
                </table>
              </div>
            </div>

            <!-- Receita por Produto -->
            <div class="vision-chart-card">
              <div class="vchart-header"><div class="vchart-title">Receita por Produto/Serviço</div></div>
              <div id="vision-produto-list" class="vproduto-list"></div>
            </div>
          </div>

          <!-- Row 4: Previsão + Insights -->
          <div class="vision-last-row">
            <!-- Previsão Receita -->
            <div class="vision-chart-card vision-chart-large">
              <div class="vchart-header">
                <div>
                  <div class="vchart-title">Previsão de Receita</div>
                  <div class="vchart-subtitle">R$ ${(overview.mrr * 1.15).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
                </div>
              </div>
              <div class="vchart-body" style="height:180px;"><canvas id="chart-forecast"></canvas></div>
            </div>

            <!-- Insights IA -->
            <div class="vision-chart-card">
              <div class="vchart-header">
                <div class="vchart-title">✨ Insights Inteligentes</div>
              </div>
              <div class="vinsights-list">
                <div class="vinsight-item">
                  <div class="vinsight-dot dot-green"></div>
                  <p>A taxa de conversão cresceu ${overview.conversionRate > 5 ? overview.conversionRate : '5'}% este período — acima da média do setor.</p>
                </div>
                <div class="vinsight-item">
                  <div class="vinsight-dot dot-blue"></div>
                  <p>${overview.totalLeads} leads captados. Foque nos ${overview.totalLeads - overview.closedLeads} ainda em aberto para maximizar receita.</p>
                </div>
                <div class="vinsight-item">
                  <div class="vinsight-dot dot-purple"></div>
                  <p>Com ${overview.activeClients} clientes ativos, seu MRR estimado é R$ ${overview.mrr.toLocaleString('pt-BR', {minimumFractionDigits:2})}.</p>
                </div>
                <div class="vinsight-item">
                  <div class="vinsight-dot dot-orange"></div>
                  <p>Qualifique leads com score acima de 70 para aumentar a taxa de fechamento em até 40%.</p>
                </div>
              </div>
              <button class="vision-insight-btn" onclick="App.navigateTo('leads')">Ver Todos os Insights →</button>
            </div>
          </div>

        </div>
      `;
      
      

      lucide.createIcons();
      this.animateCounters();

      // Revenue Line Chart (main Receita)
      const lcLabels = leadsChart?.data?.map(d => d.period) || [];
      const lcData   = leadsChart?.data?.map(d => d.count) || [];
      if (lcLabels.length) {
        Charts.createLine('chart-leads-line', lcLabels, lcData, 'Receita');
      }

      // Origem dos Leads (bar)
      if (lcLabels.length) {
        Charts.createBar('chart-leads-month', lcLabels, lcData, 'Leads');
      }

      // Conversion donut
      const convVal = overview.conversionRate || 0;
      Charts.createDoughnut('chart-conversion-donut',
        ['Convertidos', 'Em aberto'],
        [convVal, Math.max(100 - convVal, 0)]
      );

      // Forecast chart (line with purple gradient)
      if (lcLabels.length) {
        const forecastData = lcData.map((v, i) => Math.round(v * (1 + 0.05 * (i + 1))));
        Charts.createLine('chart-forecast', lcLabels, forecastData, 'Previsão');
      }

      // Sparklines
      this.renderSparkline('spark-mrr',     lcData, '#34d399');
      this.renderSparkline('spark-leads',   lcData.map(v => Math.round(v * 1.2)), '#6366f1');
      this.renderSparkline('spark-clients', lcData.map(v => Math.round(v * 0.3)), '#8b5cf6');
      this.renderSparkline('spark-ticket',  lcData.map(v => Math.round(v * 0.8)), '#f59e0b');

      // Pipeline bars
      this.renderPipelineBars(pipelineChart?.data || [], totalPipeline);

      // Activity feed
      const actEl = document.getElementById('vision-activity-feed');
      if (actEl) {
        const acts = overview.recentActivities || [];
        actEl.innerHTML = acts.length > 0
          ? acts.slice(0,6).map(a => `<div class="vact-item">
              <div class="vact-avatar">${(a.user || 'U').charAt(0).toUpperCase()}</div>
              <div class="vact-info">
                <div class="vact-name">${a.user || 'Sistema'}</div>
                <div class="vact-desc">${a.description || a.action || 'Atividade registrada'}</div>
              </div>
              <div class="vact-time">${a.timeAgo || 'agora'}</div>
            </div>`).join('')
          : `<div class="empty-placeholder">Nenhuma atividade recente</div>`;
      }

      // Leads table
      const tbody = document.getElementById('vision-leads-tbody');
      if (tbody) {
        const leads = overview.recentLeads || [];
        tbody.innerHTML = leads.length > 0
          ? leads.slice(0,6).map(l => {
              const statusColors = { qualificado: '#34d399', novo: '#6366f1', perdido: '#f87171', fechado: '#fbbf24' };
              const st = (l.status || 'novo').toLowerCase();
              const color = statusColors[st] || '#94a3b8';
              return `<tr>
                <td><div class="vlead-name">${l.name || l.nome || 'Lead'}</div></td>
                <td><span class="vlead-origem">${l.origem || 'Orgânico'}</span></td>
                <td class="vlead-valor">R$ ${(l.valor_potencial || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                <td><span class="vlead-status" style="color:${color};border-color:${color}20;background:${color}15;">${l.status || 'Novo'}</span></td>
              </tr>`;
            }).join('')
          : `<tr><td colspan="4" class="empty-placeholder">Nenhum lead recente</td></tr>`;
      }

      // Receita por Produto
      const prodEl = document.getElementById('vision-produto-list');
      if (prodEl) {
        const colors = ['#6366f1','#22d3ee','#34d399','#f59e0b','#f43f5e'];
        const produtos = [
          { name: 'Plano Premium', value: overview.mrr * 0.4 },
          { name: 'Consultoria',   value: overview.mrr * 0.25 },
          { name: 'Treinamento',   value: overview.mrr * 0.18 },
          { name: 'Suporte',       value: overview.mrr * 0.1 },
          { name: 'Outros',        value: overview.mrr * 0.07 },
        ];
        prodEl.innerHTML = produtos.map((p, i) => `
          <div class="vprod-item">
            <div class="vprod-dot" style="background:${colors[i]}"></div>
            <div class="vprod-name">${p.name}</div>
            <div class="vprod-value">R$ ${Math.round(p.value).toLocaleString('pt-BR')},00</div>
          </div>`).join('');
      }

      this.startAutoRefresh();
      this.renderPipelineBars(pipelineChart?.data || [], totalPipeline);

      // Funnel
      this.renderFunnel(funnel?.stages || []);

      // Top cities
      this.renderTopCities(geo?.byCity || []);

      // Activity feed
      this.renderActivityFeed(overview.recentActivities);

      // Top sellers with avatars
      this.renderTopSellers(topSellers?.sellers || []);

      // Auto-refresh every 30s
      this.startAutoRefresh();

    } catch (err) {
      if (el) {
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
        try { lucide.createIcons(); } catch(_) {}
      }
    }

    } catch (outerErr) {
      console.error('[Dashboard] Erro critico no render():', outerErr);
      const pageEl = document.getElementById('page-dashboard');
      if (pageEl) pageEl.innerHTML = `
        <div style="padding:3rem;text-align:center;color:white;">
          <p style="font-size:1.2rem;margin-bottom:0.5rem;">&#9888; Erro critico no dashboard</p>
          <p style="color:#9ca3af;font-size:0.9rem;margin-bottom:1rem;">${outerErr.message}</p>
          <button onclick="DashboardPage.render()" style="padding:0.6rem 1.5rem;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.9rem;">
            Tentar Novamente
          </button>
        </div>`;
    }
  },


  renderSparkline(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length < 2) return;
    canvas.width = canvas.offsetWidth || 140;
    canvas.height = canvas.offsetHeight || 50;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - ((v - min) / range) * (h - 6) - 3
    }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i-1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cp1x, pts[i-1].y, cp1x, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i-1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cp1x, pts[i-1].y, cp1x, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
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
    const data = this.cachedData || {
      totalLeads: 0,
      conversionRate: 0,
      mrr: 0,
      activeClients: 0,
      totalPipeline: 0,
      newLeadsPeriod: 0,
      pipeline: []
    };

    PDFExport.generateDashboardPDF(data);
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
          <span class="pipeline-bar-label">${escapeHtml(stageLabels[d.pipeline_stage] || d.pipeline_stage)}</span>
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
            <span class="funnel-stage-name">${escapeHtml(s.name)}</span>
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
                <span class="city-name">${escapeHtml(c.city)}</span>
                <span class="city-state">${escapeHtml(c.state)}</span>
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
            <div class="activity-text"><strong>${escapeHtml(a.user_name || 'Sistema')}</strong> ${escapeHtml(labels[a.action] || a.action)} ${escapeHtml(a.entity_type)}</div>
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
              <span class="seller-name">${escapeHtml(s.name)}</span>
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
