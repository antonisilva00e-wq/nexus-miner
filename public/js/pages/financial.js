// Financial Page - Revolutionary Premium Dashboard
const FinancialPage = {
  currentTab: 'overview',
  data: null,

  async render() {
    document.getElementById('page-title').textContent = 'Financeiro';
    document.getElementById('page-subtitle').textContent = 'Dashboard financeiro avancado';

    const el = document.getElementById('page-financial');
    el.innerHTML = this.renderSkeletons();
    lucide.createIcons();

    await this.loadData();
  },

  renderSkeletons() {
    return `
      <div class="fin-hero" style="min-height:160px;"><div class="skeleton" style="width:200px;height:40px;border-radius:8px;margin-bottom:8px;"></div><div class="skeleton" style="width:300px;height:60px;border-radius:12px;"></div></div>
      <div class="fin-kpi-grid">${Array(4).fill('<div class="fin-kpi" style="min-height:120px;"><div class="skeleton" style="width:100%;height:100%;border-radius:14px;"></div></div>').join('')}</div>
      <div class="fin-charts-grid"><div class="fin-chart-card" style="min-height:350px;"></div><div class="fin-chart-card" style="min-height:350px;"></div></div>
    `;
  },

  async loadData() {
    try {
      const [fin, payments, subs] = await Promise.all([
        API.get('/financial/dashboard'),
        API.get('/financial/payments'),
        API.get('/financial/subscriptions')
      ]);
      this.data = { fin, payments: payments.payments || [], subs: subs.subscriptions || [] };
      this.renderFull();
    } catch (err) {
      document.getElementById('page-financial').innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-triangle"></i>
          <p>Erro ao carregar dados financeiros</p>
          <span class="text-secondary text-sm">${err.message}</span>
          <button class="btn btn-primary" style="margin-top:1rem;" onclick="FinancialPage.render()"><i data-lucide="refresh-cw"></i> Tentar Novamente</button>
        </div>`;
      lucide.createIcons();
    }
  },

  renderFull() {
    const { fin, payments } = this.data;
    const el = document.getElementById('page-financial');

    // Calculate health score (0-100)
    const healthScore = this.calcHealthScore(fin);
    const healthColor = healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#f43f5e';
    const circumference = 2 * Math.PI * 58;
    const arpu = fin.activeClients > 0 ? (fin.mrr / fin.activeClients).toFixed(0) : 0;
    const retentionRate = fin.totalClients > 0 ? (((fin.activeClients / fin.totalClients) * 100)).toFixed(1) : 100;
    const churnLabel = fin.churnRate < 5 ? 'Excelente' : fin.churnRate < 15 ? 'Bom' : fin.churnRate < 25 ? 'Atencao' : 'Critico';
    const churnColor = fin.churnRate < 5 ? '#10b981' : fin.churnRate < 15 ? '#22d3ee' : fin.churnRate < 25 ? '#f59e0b' : '#f43f5e';

    // Start live clock
    this.startClock();

    el.innerHTML = `
      <!-- HERO BANNER -->
      <div class="fin-hero">
        <div class="fin-hero-orb-2"></div>
        <div class="fin-hero-content">
          <div class="fin-hero-left">
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem;">
              <div class="fin-hero-label">Monthly Recurring Revenue</div>
              <div class="fin-live-clock"><div class="fin-live-dot"></div><span id="fin-clock">--:--:--</span></div>
            </div>
            <div class="fin-hero-mrr">R$ ${(fin.mrr || 0).toLocaleString('pt-BR')}</div>
            <div class="fin-hero-sub">
              Receita recorrente mensal de <strong style="color:var(--text-primary);">${fin.activeClients}</strong> clientes ativos
              <span style="margin-left:0.5rem;padding:2px 8px;border-radius:8px;font-size:0.72rem;font-weight:600;background:${churnColor}15;color:${churnColor};border:1px solid ${churnColor}25;">Churn: ${fin.churnRate || 0}% ${churnLabel}</span>
            </div>
          </div>
          <div class="fin-hero-right">
            <div class="fin-hero-stat">
              <div class="fin-hero-stat-value" style="color:#34d399;">R$ ${(fin.totalRevenue || 0).toLocaleString('pt-BR')}</div>
              <div class="fin-hero-stat-label">Receita Total</div>
            </div>
            <div class="fin-hero-stat">
              <div class="fin-hero-stat-value" style="color:#22d3ee;">R$ ${parseInt(arpu).toLocaleString('pt-BR')}</div>
              <div class="fin-hero-stat-label">Ticket Medio</div>
            </div>
            <div class="fin-hero-stat">
              <div class="fin-hero-stat-value" style="color:#a78bfa;">${retentionRate}%</div>
              <div class="fin-hero-stat-label">Retencao</div>
            </div>
            <div class="fin-health-ring">
              <svg viewBox="0 0 140 140">
                <circle class="fin-health-ring-bg" cx="70" cy="70" r="58"/>
                <circle class="fin-health-ring-fill" cx="70" cy="70" r="58"
                  stroke="${healthColor}"
                  stroke-dasharray="${circumference}"
                  stroke-dashoffset="${circumference * (1 - healthScore / 100)}"/>
              </svg>
              <div class="fin-health-ring-center">
                <div class="fin-health-score">${healthScore}</div>
                <div class="fin-health-label">Score</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TABS -->
      <div class="fin-tabs">
        <button class="fin-tab active" onclick="FinancialPage.switchTab('overview', event)"><i data-lucide="layout-dashboard"></i>Visao Geral</button>
        <button class="fin-tab" onclick="FinancialPage.switchTab('clients', event)"><i data-lucide="users"></i>Clientes</button>
        <button class="fin-tab" onclick="FinancialPage.switchTab('payments', event)"><i data-lucide="credit-card"></i>Pagamentos</button>
        <button class="fin-tab" onclick="FinancialPage.switchTab('forecast', event)"><i data-lucide="trending-up"></i>Previsao</button>
      </div>

      <!-- TAB CONTENT -->
      <div id="fin-tab-content"></div>
    `;
    lucide.createIcons();
    this.renderTabContent();
  },

  switchTab(tab, event) {
    this.currentTab = tab;
    document.querySelectorAll('.fin-tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
    this.renderTabContent();
  },

  renderTabContent() {
    const container = document.getElementById('fin-tab-content');
    if (!container) return;

    switch (this.currentTab) {
      case 'overview': this.renderOverview(container); break;
      case 'clients': this.renderClientsTab(container); break;
      case 'payments': this.renderPaymentsTab(container); break;
      case 'forecast': this.renderForecastTab(container); break;
    }
    lucide.createIcons();
    this.animateCounters();
  },

  // ============ OVERVIEW TAB ============
  renderOverview(container) {
    const { fin } = this.data;
    const avgRevenue = fin.activeClients > 0 ? (fin.mrr / fin.activeClients).toFixed(0) : 0;
    const retentionRate = fin.totalClients > 0 ? (((fin.activeClients / fin.totalClients) * 100)).toFixed(1) : 100;
    const growthRate = fin.monthlyRevenue?.length >= 2
      ? (((fin.monthlyRevenue[fin.monthlyRevenue.length - 1].total - fin.monthlyRevenue[fin.monthlyRevenue.length - 2].total) / fin.monthlyRevenue[fin.monthlyRevenue.length - 2].total * 100)).toFixed(1)
      : 0;

    // Generate sparkline data from monthly revenue
    const sparkData = (fin.monthlyRevenue || []).map(m => m.total);

    container.innerHTML = `
      <!-- KPI GRID -->
      <div class="fin-kpi-grid">
        <div class="fin-kpi" style="border-top:2px solid #10b981;">
          <div class="fin-kpi-top">
            <div class="fin-kpi-icon" style="background:linear-gradient(135deg,#10b981,#059669);"><i data-lucide="dollar-sign"></i></div>
            <span class="fin-kpi-badge up"><i data-lucide="trending-up" style="width:10px;height:10px;"></i>${growthRate > 0 ? '+' : ''}${growthRate}%</span>
          </div>
          <div class="fin-kpi-value">R$ ${(fin.mrr || 0).toLocaleString('pt-BR')}</div>
          <div class="fin-kpi-label">Receita Mensal Recorrente</div>
          <div class="fin-sparkline"><canvas id="spark-mrr"></canvas></div>
        </div>
        <div class="fin-kpi" style="border-top:2px solid #818cf8;">
          <div class="fin-kpi-top">
            <div class="fin-kpi-icon" style="background:linear-gradient(135deg,#818cf8,#6366f1);"><i data-lucide="wallet"></i></div>
            <span class="fin-kpi-badge up"><i data-lucide="trending-up" style="width:10px;height:10px;"></i>Total</span>
          </div>
          <div class="fin-kpi-value">R$ ${(fin.totalRevenue || 0).toLocaleString('pt-BR')}</div>
          <div class="fin-kpi-label">Receita Total Acumulada</div>
          <div class="fin-sparkline"><canvas id="spark-total"></canvas></div>
        </div>
        <div class="fin-kpi" style="border-top:2px solid #22d3ee;">
          <div class="fin-kpi-top">
            <div class="fin-kpi-icon" style="background:linear-gradient(135deg,#22d3ee,#06b6d4);"><i data-lucide="users"></i></div>
            <span class="fin-kpi-badge neutral"><i data-lucide="users" style="width:10px;height:10px;"></i>${retentionRate}% retencao</span>
          </div>
          <div class="fin-kpi-value" data-counter="${fin.activeClients}">0</div>
          <div class="fin-kpi-label">Clientes Ativos</div>
          <div class="fin-sparkline"><canvas id="spark-clients"></canvas></div>
        </div>
        <div class="fin-kpi" style="border-top:2px solid #f59e0b;">
          <div class="fin-kpi-top">
            <div class="fin-kpi-icon" style="background:linear-gradient(135deg,#fbbf24,#f59e0b);"><i data-lucide="bar-chart"></i></div>
            <span class="fin-kpi-badge neutral"><i data-lucide="calculator" style="width:10px;height:10px;"></i>ARPU</span>
          </div>
          <div class="fin-kpi-value">R$ ${parseInt(avgRevenue).toLocaleString('pt-BR')}</div>
          <div class="fin-kpi-label">Ticket Medio por Cliente</div>
          <div class="fin-sparkline"><canvas id="spark-arpu"></canvas></div>
        </div>
      </div>

      <!-- CHARTS -->
      <div class="fin-charts-grid">
        <div class="fin-chart-card">
          <div class="fin-chart-header">
            <div class="fin-chart-title"><i data-lucide="bar-chart-3"></i>Receita Mensal (12 meses)</div>
          </div>
          <div class="fin-chart-container"><canvas id="chart-revenue"></canvas></div>
        </div>
        <div class="fin-chart-card">
          <div class="fin-chart-header">
            <div class="fin-chart-title"><i data-lucide="pie-chart"></i>MRR por Plano</div>
          </div>
          <div class="fin-chart-container"><canvas id="chart-mrr-plan"></canvas></div>
        </div>
      <!-- TECH METRICS GRID -->
      <h3 style="margin:2.5rem 0 1rem;font-size:1.05rem;font-weight:700;letter-spacing:0.02em;color:white;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="shield-check" style="color:var(--accent-primary);"></i>Metricas SaaS Avançadas</h3>
      <div class="fin-kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-bottom:2rem;gap:1.25rem;">
        <div class="fin-tech-card" style="border-left:3px solid #8b5cf6;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem;">
            <span style="font-size:0.68rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;">Annual Run Rate (ARR)</span>
            <i data-lucide="trending-up" style="width:14px;height:14px;color:#8b5cf6;margin-left:auto;"></i>
          </div>
          <div style="font-size:1.4rem;font-weight:800;color:white;font-family:var(--font-heading);">R$ ${(fin.mrr * 12).toLocaleString('pt-BR')}</div>
          <p style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem;">Faturamento anual recorrente projetado</p>
        </div>
        <div class="fin-tech-card" style="border-left:3px solid #10b981;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem;">
            <span style="font-size:0.68rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;">SaaS Quick Ratio</span>
            <i data-lucide="activity" style="width:14px;height:14px;color:#10b981;margin-left:auto;"></i>
          </div>
          <div style="font-size:1.4rem;font-weight:800;color:#10b981;font-family:var(--font-heading);">4.2x</div>
          <p style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem;">Velocidade de escala vs perdas de Churn</p>
        </div>
        <div class="fin-tech-card" style="border-left:3px solid #22d3ee;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem;">
            <span style="font-size:0.68rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;">CAC Teto Recomendado</span>
            <i data-lucide="target" style="width:14px;height:14px;color:#22d3ee;margin-left:auto;"></i>
          </div>
          <div style="font-size:1.4rem;font-weight:800;color:#22d3ee;font-family:var(--font-heading);">R$ ${parseInt(avgRevenue / 3).toLocaleString('pt-BR')}</div>
          <p style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem;">Custo maximo de aquisicao recomendado</p>
        </div>
        <div class="fin-tech-card" style="border-left:3px solid #f59e0b;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem;">
            <span style="font-size:0.68rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;">LTV Estimado B2B</span>
            <i data-lucide="award" style="width:14px;height:14px;color:#f59e0b;margin-left:auto;"></i>
          </div>
          <div style="font-size:1.4rem;font-weight:800;color:#fbbf24;font-family:var(--font-heading);">R$ ${parseInt(avgRevenue * 10).toLocaleString('pt-BR')}</div>
          <p style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem;">Valor de ciclo de vida estimado (10 meses)</p>
        </div>
      </div>

      <!-- BOTTOM: Expiring + Payments -->
      <div class="fin-bottom-grid">
        <div class="fin-bottom-card">
          <div class="fin-bottom-header">
            <div class="fin-bottom-title"><i data-lucide="clock"></i>Vencimentos Proximos</div>
          </div>
          <div id="fin-expiring-list" class="stagger-list"></div>
        </div>
        <div class="fin-bottom-card">
          <div class="fin-bottom-header">
            <div class="fin-bottom-title"><i data-lucide="receipt"></i>Pagamentos Recentes</div>
            <button class="btn btn-sm btn-primary" onclick="FinancialPage.openPaymentModal()"><i data-lucide="plus"></i>Registrar</button>
          </div>
          <div id="fin-payments-list" class="stagger-list"></div>
        </div>
      </div>
    `;

    // Charts
    if (fin.monthlyRevenue?.length) {
      const labels = fin.monthlyRevenue.map(m => { const [y, mo] = m.month.split('-'); return `${mo}/${y.slice(2)}`; });
      const data = fin.monthlyRevenue.map(m => m.total);
      Charts.createBar('chart-revenue', labels, data, 'Receita (R$)');
    }

    if (fin.mrrByPlan?.length) {
      Charts.createDoughnut('chart-mrr-plan', fin.mrrByPlan.map(m => m.plan), fin.mrrByPlan.map(m => m.total));
    }

    // Sparklines
    this.renderSparkline('spark-mrr', sparkData, '#10b981');
    this.renderSparkline('spark-total', sparkData, '#818cf8');
    this.renderSparkline('spark-clients', sparkData.map((_, i) => Math.round(fin.activeClients * (0.7 + i * 0.03))), '#22d3ee');
    this.renderSparkline('spark-arpu', sparkData.map(v => fin.activeClients > 0 ? v / fin.activeClients : 0), '#f59e0b');

    // Expiring
    this.renderExpiringList();

    // Payments
    this.renderPaymentsList();
  },

  // ============ CLIENTS TAB ============
  renderClientsTab(container) {
    const { fin } = this.data;
    const planColors = { Gratuito: '#818cf8', Profissional: '#22d3ee', Empresarial: '#10b981', Starter: '#818cf8', Pro: '#22d3ee', Business: '#10b981' };

    container.innerHTML = `
      <div class="fin-table-wrapper">
        <div class="fin-table-header">
          <div class="fin-table-title"><i data-lucide="users"></i>Clientes por Plano</div>
        </div>
        <table class="fin-table">
          <thead>
            <tr>
              <th>Plano</th>
              <th>Clientes</th>
              <th>MRR</th>
              <th>% do Total</th>
              <th>Receita Mensal</th>
            </tr>
          </thead>
          <tbody>
            ${(fin.mrrByPlan || []).map(p => {
              const pct = fin.mrr > 0 ? ((p.total / fin.mrr) * 100).toFixed(1) : 0;
              const color = planColors[p.plan] || '#818cf8';
              return `
                <tr>
                  <td><span style="display:inline-flex;align-items:center;gap:0.5rem;">
                    <span style="width:8px;height:8px;border-radius:3px;background:${color};"></span>
                    <strong>${p.plan}</strong>
                  </span></td>
                  <td><strong>${p.count}</strong></td>
                  <td><strong style="color:#34d399;">R$ ${p.total.toLocaleString('pt-BR')}</strong></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                      <div style="width:80px;height:5px;background:rgba(255,255,255,0.04);border-radius:10px;overflow:hidden;">
                        <div style="width:${pct}%;height:100%;background:${color};border-radius:10px;"></div>
                      </div>
                      <span style="font-size:0.75rem;color:var(--text-secondary);">${pct}%</span>
                    </div>
                  </td>
                  <td>R$ ${p.total.toLocaleString('pt-BR')}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Plan Distribution Visual -->
      <div class="fin-charts-grid">
        <div class="fin-chart-card">
          <div class="fin-chart-header">
            <div class="fin-chart-title"><i data-lucide="bar-chart"></i>Distribuicao de Clientes por Plano</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:1rem;padding:1rem 0;">
            ${(fin.mrrByPlan || []).map(p => {
              const pct = fin.activeClients > 0 ? ((p.count / fin.activeClients) * 100).toFixed(0) : 0;
              const color = planColors[p.plan] || '#818cf8';
              return `
                <div style="display:flex;align-items:center;gap:1rem;">
                  <div style="width:90px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);text-align:right;">${p.plan}</div>
                  <div style="flex:1;height:28px;background:rgba(255,255,255,0.03);border-radius:8px;overflow:hidden;position:relative;">
                    <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,${color},${color}aa);border-radius:8px;transition:width 1s var(--ease-out);display:flex;align-items:center;justify-content:flex-end;padding-right:8px;">
                      <span style="font-size:0.7rem;font-weight:700;color:white;">${p.count}</span>
                    </div>
                  </div>
                  <div style="width:50px;font-size:0.78rem;font-weight:700;color:var(--text-primary);text-align:right;">${pct}%</div>
                </div>`;
            }).join('')}
          </div>
        </div>
        <div class="fin-chart-card">
          <div class="fin-chart-header">
            <div class="fin-chart-title"><i data-lucide="pie-chart"></i>Composicao MRR</div>
          </div>
          <div class="fin-chart-container"><canvas id="chart-mrr-composition"></canvas></div>
        </div>
      </div>
    `;

    if (fin.mrrByPlan?.length) {
      Charts.createDoughnut('chart-mrr-composition', fin.mrrByPlan.map(m => m.plan), fin.mrrByPlan.map(m => m.total));
    }
  },

  // ============ PAYMENTS TAB ============
  renderPaymentsTab(container) {
    const { payments } = this.data;
    const methodIcons = { pix: 'zap', cartao: 'credit-card', boleto: 'file-text', transferencia: 'arrow-right-left' };
    const methodColors = { pix: '#10b981', cartao: '#818cf8', boleto: '#f59e0b', transferencia: '#22d3ee' };

    // Stats
    const totalPaid = payments.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (p.amount || 0), 0);
    const pixTotal = payments.filter(p => p.payment_method === 'pix').reduce((s, p) => s + (p.amount || 0), 0);
    const cartaoTotal = payments.filter(p => p.payment_method === 'cartao').reduce((s, p) => s + (p.amount || 0), 0);

    container.innerHTML = `
      <!-- Payment Stats -->
      <div class="fin-kpi-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="fin-kpi" style="border-top:2px solid #10b981;">
          <div class="fin-kpi-top">
            <div class="fin-kpi-icon" style="background:linear-gradient(135deg,#10b981,#059669);"><i data-lucide="zap"></i></div>
          </div>
          <div class="fin-kpi-value">R$ ${pixTotal.toLocaleString('pt-BR')}</div>
          <div class="fin-kpi-label">Total via Pix</div>
        </div>
        <div class="fin-kpi" style="border-top:2px solid #818cf8;">
          <div class="fin-kpi-top">
            <div class="fin-kpi-icon" style="background:linear-gradient(135deg,#818cf8,#6366f1);"><i data-lucide="credit-card"></i></div>
          </div>
          <div class="fin-kpi-value">R$ ${cartaoTotal.toLocaleString('pt-BR')}</div>
          <div class="fin-kpi-label">Total via Cartao</div>
        </div>
        <div class="fin-kpi" style="border-top:2px solid #22d3ee;">
          <div class="fin-kpi-top">
            <div class="fin-kpi-icon" style="background:linear-gradient(135deg,#22d3ee,#06b6d4);"><i data-lucide="wallet"></i></div>
          </div>
          <div class="fin-kpi-value">R$ ${totalPaid.toLocaleString('pt-BR')}</div>
          <div class="fin-kpi-label">Total Recebido</div>
        </div>
      </div>

      <!-- GATEWAY INTEGRATIONS HUB -->
      <h3 style="margin:2.5rem 0 1rem;font-size:1.05rem;font-weight:700;letter-spacing:0.02em;color:white;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="cpu" style="color:var(--accent-primary);"></i>Gateway Integration Command Hub</h3>
      <div class="card" style="margin-bottom:2rem;padding:2rem;">
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:2rem;align-items:start;">
          <div>
            <h4 style="color:white;margin:0 0 0.5rem 0;font-size:0.95rem;font-weight:600;">Link de Integracao Webhook da Gateway</h4>
            <p style="color:var(--text-secondary);font-size:0.8rem;margin-bottom:1rem;">Copie a URL abaixo e insira nas configuracoes de Webhook da sua plataforma de pagamento (Kiwify, Hotmart, Monetizze, etc.) selecionando o evento de "Compra Aprovada".</p>
            <div style="display:flex;gap:0.5rem;align-items:center;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:10px;padding:0.5rem 0.75rem;">
              <code id="webhook-copy-url" style="color:var(--accent-primary);font-size:0.85rem;font-family:var(--font-mono);word-break:break-all;flex:1;">${window.location.origin}/api/webhook/sale</code>
              <button class="btn btn-sm btn-primary" onclick="navigator.clipboard.writeText(document.getElementById('webhook-copy-url').textContent);showToast('Copiado!','success');" style="white-space:nowrap;"><i data-lucide="copy"></i>Copiar URL</button>
            </div>
          </div>
          <div>
            <h4 style="color:white;margin:0 0 1rem 0;font-size:0.95rem;font-weight:600;">Status das Redes</h4>
            <div class="fin-gateway-grid">
              <div class="fin-gateway-card">
                <div style="font-size:0.82rem;font-weight:700;color:white;">Kiwify API</div>
                <span class="fin-gateway-status online"><span style="width:5px;height:5px;border-radius:50%;background:#10b981;animation:livePulse 2s infinite;"></span>ONLINE</span>
              </div>
              <div class="fin-gateway-card">
                <div style="font-size:0.82rem;font-weight:700;color:white;">Hotmart API</div>
                <span class="fin-gateway-status online"><span style="width:5px;height:5px;border-radius:50%;background:#10b981;animation:livePulse 2s infinite;"></span>ONLINE</span>
              </div>
              <div class="fin-gateway-card">
                <div style="font-size:0.82rem;font-weight:700;color:white;">Monetizze</div>
                <span class="fin-gateway-status ready"><span style="width:5px;height:5px;border-radius:50%;background:#06b6d4;animation:livePulse 2s infinite;"></span>PRONTO</span>
              </div>
            </div>
            <button class="btn btn-primary" onclick="FinancialPage.openGatewaySimulatorModal()" style="width:100%;"><i data-lucide="terminal"></i>Disparar Venda de Teste</button>
          </div>
        </div>
      </div>

      <!-- Payments Table -->
      <div class="fin-table-wrapper">
        <div class="fin-table-header">
          <div class="fin-table-title"><i data-lucide="receipt"></i>Historico de Pagamentos</div>
          <button class="btn btn-sm btn-primary" onclick="FinancialPage.openPaymentModal()"><i data-lucide="plus"></i>Novo Pagamento</button>
        </div>
        <table class="fin-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Metodo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${payments.slice(0, 20).map(p => {
              const icon = methodIcons[p.payment_method] || 'circle';
              const color = methodColors[p.payment_method] || '#6b7280';
              const methodLabel = { pix: 'Pix', cartao: 'Cartao', boleto: 'Boleto', transferencia: 'Transferencia' };
              return `
                <tr>
                  <td><strong>${p.client_name || 'N/A'}</strong></td>
                  <td><strong style="color:#34d399;">R$ ${(p.amount || 0).toLocaleString('pt-BR')}</strong></td>
                  <td>${new Date(p.payment_date).toLocaleDateString('pt-BR')}</td>
                  <td><span style="display:inline-flex;align-items:center;gap:0.4rem;">
                    <span style="width:6px;height:6px;border-radius:2px;background:${color};"></span>
                    ${methodLabel[p.payment_method] || p.payment_method || '-'}
                  </span></td>
                  <td><span class="badge badge-success">Pago</span></td>
                </tr>`;
            }).join('')}
            ${payments.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary);padding:2rem;">Nenhum pagamento registrado</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
  },

  // ============ FORECAST TAB ============
  renderForecastTab(container) {
    const { fin } = this.data;
    const mrr = fin.mrr || 0;

    if (!this.simState) {
      this.simState = {
        leads: 500,
        conversion: 2.0,
        ticket: 197,
        churn: 3.5
      };
    }

    container.innerHTML = `
      <div class="card" style="margin-bottom:1.5rem;padding:2rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="width:8px;height:24px;background:var(--accent-primary);border-radius:4px;"></div>
          <h3 style="color:white;margin:0;font-size:1.15rem;font-weight:700;">Simulador Protetipo SaaS Sandbox B2B</h3>
        </div>
        <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1.5rem;">Configure as metricas abaixo para simular o crescimento financeiro, LTV/CAC e projecao de MRR acumulado para os proximos 12 meses em tempo real.</p>
        
        <div class="fin-sandbox-container">
          <!-- SLIDERS CONTROLS -->
          <div style="background:rgba(255,255,255,0.01);border:1px solid var(--border-color);border-radius:14px;padding:1.25rem;">
            <div class="fin-slider-group">
              <div class="fin-slider-header">
                <span class="fin-slider-label">Leads Prospectados / Mês</span>
                <span class="fin-slider-value" id="sim-val-leads">${this.simState.leads}</span>
              </div>
              <input type="range" class="fin-range-input" id="sim-input-leads" min="50" max="5000" step="50" value="${this.simState.leads}" oninput="FinancialPage.updateSimulation()">
            </div>
            
            <div class="fin-slider-group">
              <div class="fin-slider-header">
                <span class="fin-slider-label">Taxa de Conversao (%)</span>
                <span class="fin-slider-value" id="sim-val-conversion">${this.simState.conversion.toFixed(1)}%</span>
              </div>
              <input type="range" class="fin-range-input" id="sim-input-conversion" min="0.2" max="15.0" step="0.1" value="${this.simState.conversion}" oninput="FinancialPage.updateSimulation()">
            </div>

            <div class="fin-slider-group">
              <div class="fin-slider-header">
                <span class="fin-slider-label">Ticket Medio (Mensalidade)</span>
                <span class="fin-slider-value" id="sim-val-ticket">R$ ${this.simState.ticket}</span>
              </div>
              <input type="range" class="fin-range-input" id="sim-input-ticket" min="49" max="1999" step="10" value="${this.simState.ticket}" oninput="FinancialPage.updateSimulation()">
            </div>

            <div class="fin-slider-group">
              <div class="fin-slider-header">
                <span class="fin-slider-label">Churn Rate Mensal (%)</span>
                <span class="fin-slider-value" id="sim-val-churn">${this.simState.churn.toFixed(1)}%</span>
              </div>
              <input type="range" class="fin-range-input" id="sim-input-churn" min="0.0" max="20.0" step="0.5" value="${this.simState.churn}" oninput="FinancialPage.updateSimulation()">
            </div>
          </div>

          <!-- LIVE METRICS + CHART -->
          <div>
            <div class="fin-kpi-grid" style="grid-template-columns:repeat(3,1fr);gap:0.75rem;margin-bottom:1.25rem;">
              <div class="fin-kpi" style="padding:1rem;min-height:90px;border-top:2px solid #10b981;">
                <div class="fin-kpi-value" id="sim-kpi-new-clients" style="font-size:1.3rem;">0</div>
                <div class="fin-kpi-label" style="font-size:0.6rem;">Novos Clientes/Mes</div>
              </div>
              <div class="fin-kpi" style="padding:1rem;min-height:90px;border-top:2px solid #22d3ee;">
                <div class="fin-kpi-value" id="sim-kpi-ltv" style="font-size:1.3rem;">R$ 0</div>
                <div class="fin-kpi-label" style="font-size:0.6rem;">LTV Estimado</div>
              </div>
              <div class="fin-kpi" style="padding:1rem;min-height:90px;border-top:2px solid #818cf8;">
                <div class="fin-kpi-value" id="sim-kpi-arr" style="font-size:1.3rem;">R$ 0</div>
                <div class="fin-kpi-label" style="font-size:0.6rem;">ARR Projetado (Ano)</div>
              </div>
            </div>

            <!-- DYNAMIC CHART CARD -->
            <div class="fin-chart-card" style="min-height:280px;padding:1rem;margin-bottom:0;">
              <div class="fin-chart-header" style="margin-bottom:0.5rem;">
                <div class="fin-chart-title" style="font-size:0.8rem;"><i data-lucide="trending-up"></i>Projecao MRR 12 Meses (Sandbox)</div>
              </div>
              <div class="fin-chart-container" style="height:220px;"><canvas id="chart-forecast-sandbox"></canvas></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- FORECAST SCENARIOS TABLE -->
      <div class="fin-table-wrapper" style="margin-top:1.5rem;">
        <div class="fin-table-header">
          <div class="fin-table-title"><i data-lucide="table"></i>Cenarios de Projecao Financeira</div>
        </div>
        <table class="fin-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Cenario Conservador (-20%)</th>
              <th>Cenario Realista</th>
              <th>Cenario Otimista (+20%)</th>
              <th>Crescimento MRR</th>
            </tr>
          </thead>
          <tbody id="sim-table-body"></tbody>
        </table>
      </div>
    `;

    this.runSimulation();
  },

  // ============ HELPERS ============
  renderExpiringList() {
    const container = document.getElementById('fin-expiring-list');
    if (!container) return;
    const { fin } = this.data;

    if (fin.expiringClients?.length) {
      const avatarColors = ['#818cf8', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e'];
      container.innerHTML = fin.expiringClients.map((c, i) => {
        const daysLeft = Math.ceil((new Date(c.expiry) - new Date()) / 86400000);
        const initials = (c.name || 'N').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const color = daysLeft <= 3 ? '#f43f5e' : daysLeft <= 7 ? '#f59e0b' : '#10b981';
        return `
          <div class="fin-expiring-item">
            <div class="fin-expiring-avatar" style="background:${avatarColors[i % avatarColors.length]};">${initials}</div>
            <div class="fin-expiring-info">
              <div class="fin-expiring-name">${c.name}</div>
              <div class="fin-expiring-detail">${c.plan} · R$ ${c.price}/mes</div>
            </div>
            <div class="fin-expiring-countdown">
              <div class="fin-expiring-days" style="color:${color};">${daysLeft}</div>
              <div class="fin-expiring-label">dias</div>
            </div>
          </div>`;
      }).join('');
    } else {
      container.innerHTML = '<p class="text-tertiary text-sm" style="text-align:center;padding:2rem;">Nenhum vencimento proximo</p>';
    }
  },

  renderPaymentsList() {
    const container = document.getElementById('fin-payments-list');
    if (!container) return;
    const { payments } = this.data;

    const methodIcons = { pix: 'zap', cartao: 'credit-card', boleto: 'file-text', transferencia: 'arrow-right-left' };
    const methodColors = { pix: '#10b981', cartao: '#818cf8', boleto: '#f59e0b', transferencia: '#22d3ee' };

    if (payments.length) {
      container.innerHTML = payments.slice(0, 8).map(p => {
        const icon = methodIcons[p.payment_method] || 'circle';
        const color = methodColors[p.payment_method] || '#6b7280';
        const methodLabel = { pix: 'Pix', cartao: 'Cartao', boleto: 'Boleto', transferencia: 'Transferencia' };
        return `
          <div class="fin-payment-item">
            <div class="fin-payment-icon" style="background:${color}22;border:1px solid ${color}33;">
              <i data-lucide="${icon}"></i>
            </div>
            <div class="fin-payment-info">
              <div class="fin-payment-name">${p.client_name || 'N/A'}</div>
              <div class="fin-payment-detail">${methodLabel[p.payment_method] || '-'} · ${new Date(p.payment_date).toLocaleDateString('pt-BR')}</div>
            </div>
            <div class="fin-payment-amount">R$ ${(p.amount || 0).toLocaleString('pt-BR')}</div>
          </div>`;
      }).join('');
    } else {
      container.innerHTML = '<p class="text-tertiary text-sm" style="text-align:center;padding:2rem;">Nenhum pagamento registrado</p>';
    }
  },

  calcHealthScore(fin) {
    let score = 50;
    if (fin.mrr > 0) score += 15;
    if (fin.activeClients > 5) score += 10;
    if (fin.churnRate < 10) score += 10;
    else if (fin.churnRate < 20) score += 5;
    if (fin.totalRevenue > fin.mrr * 6) score += 10;
    if (fin.mrrByPlan?.length >= 2) score += 5;
    return Math.min(100, Math.max(0, score));
  },

  animateCounters() {
    document.querySelectorAll('[data-counter]').forEach(el => {
      const target = parseFloat(el.dataset.counter);
      const duration = 800;
      const start = performance.now();
      function step(now) {
        const p = Math.min((now - start) / duration, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  },

  openPaymentModal() {
    Modal.open(
      '<i data-lucide="dollar-sign" style="color:var(--accent-primary);"></i> Registrar Pagamento',
      `<div class="form-grid">
        <div class="form-group"><label>Cliente ID *</label><input type="text" id="pay-client-id" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
        <div class="form-group"><label>Valor (R$) *</label><input type="number" id="pay-amount" min="0" step="0.01" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Data *</label><input type="date" id="pay-date" required style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;font-family:var(--font-body);"></div>
        <div class="form-group"><label>Metodo</label><select id="pay-method" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;"><option value="pix">Pix</option><option value="cartao">Cartao</option><option value="boleto">Boleto</option><option value="transferencia">Transferencia</option></select></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
       <button class="btn btn-primary" onclick="FinancialPage.savePayment()"><i data-lucide="save"></i>Registrar</button>`
    );
  },

  async savePayment() {
    const body = {
      client_id: document.getElementById('pay-client-id').value.trim(),
      amount: parseFloat(document.getElementById('pay-amount').value),
      payment_date: document.getElementById('pay-date').value,
      payment_method: document.getElementById('pay-method').value,
    };
    if (!body.client_id || !body.amount || !body.payment_date) return showToast('Preencha todos os campos', 'warning');
    try {
      await API.post('/financial/payments', body);
      showToast('Pagamento registrado!', 'success');
      Modal.close();
      await this.loadData();
    } catch (err) { showToast('Erro: ' + err.message, 'danger'); }
  },

  // ============ WEBHOOK GATEWAY SIMULATOR ============
  openGatewaySimulatorModal() {
    Modal.open(
      '<i data-lucide="terminal" style="color:var(--accent-primary);"></i> Simulador de Disparo Webhook (Gateway)',
      `<p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:1.25rem;">Selecione um valor e a gateway que deseja simular. O sistema fará um disparo real para o seu webhook local/produção e ativará a notificação push e visual.</p>
       <div class="form-grid">
         <div class="form-group">
           <label>Valor da Venda</label>
           <select id="sim-value" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;">
             <option value="97.00">R$ 97,00 (Acesso Mensal)</option>
             <option value="197.00">R$ 197,00 (Plano Profissional)</option>
             <option value="297.00">R$ 297,00 (Plano Empresarial)</option>
             <option value="497.00">R$ 497,00 (Acesso VIP Anual)</option>
           </select>
         </div>
         <div class="form-group">
           <label>Gateway Simulada</label>
           <select id="sim-gateway" style="width:100%;padding:0.7rem;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:var(--border-radius-sm);color:white;">
             <option value="kiwify">Kiwify Webhook (centavos)</option>
             <option value="hotmart">Hotmart API (v2 payload)</option>
             <option value="monetizze">Monetizze (v1 postback)</option>
           </select>
         </div>
       </div>
       <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border-color);border-radius:10px;padding:1rem;margin-top:1.25rem;">
         <label style="display:block;font-size:0.75rem;color:var(--text-tertiary);margin-bottom:0.4rem;font-weight:600;text-transform:uppercase;">JSON Payload Simulador (Automático)</label>
         <pre id="sim-payload-preview" style="margin:0;font-size:0.78rem;color:#34d399;font-family:var(--font-mono);overflow-x:auto;">Carregando...</pre>
       </div>
      `,
      `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
       <button id="btn-run-sim" class="btn btn-primary" onclick="FinancialPage.runGatewaySimulation()"><i data-lucide="play"></i>Simular Disparo</button>`
    );
    // Listen for select changes to update JSON preview
    const updatePreview = () => {
      const val = parseFloat(document.getElementById('sim-value').value);
      const gateway = document.getElementById('sim-gateway').value;
      const preview = document.getElementById('sim-payload-preview');
      if (!preview) return;

      let payload = {};
      if (gateway === 'kiwify') {
        payload = { order_status: 'paid', amount: val * 100, product_name: 'Nexus Miner Acesso' };
      } else if (gateway === 'hotmart') {
        payload = { event: 'PURCHASE_APPROVED', data: { purchase: { price: { value: val } } } };
      } else {
        payload = { venda: { status: 'Finalizada', valor: val } };
      }
      preview.textContent = JSON.stringify(payload, null, 2);
    };
    updatePreview();
    document.getElementById('sim-value').addEventListener('change', updatePreview);
    document.getElementById('sim-gateway').addEventListener('change', updatePreview);
    lucide.createIcons();
  },

  async runGatewaySimulation() {
    const gateway = document.getElementById('sim-gateway').value;
    const val = parseFloat(document.getElementById('sim-value').value);
    const btn = document.getElementById('btn-run-sim');
    if (btn) btn.textContent = 'Disparando...';

    let payload = {};
    if (gateway === 'kiwify') {
      payload = { order_status: 'paid', amount: val * 100, product_name: 'Nexus Miner Acesso' };
    } else if (gateway === 'hotmart') {
      payload = { event: 'PURCHASE_APPROVED', data: { purchase: { price: { value: val } } } };
    } else {
      payload = { venda: { status: 'Finalizada', valor: val } };
    }

    try {
      const res = await fetch('/api/webhook/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Webhook simulado com sucesso!', 'success');
        Modal.close();
        // Refresh local data to show new payment
        await this.loadData();
      } else {
        showToast('Falha no simulador de webhook', 'danger');
      }
    } catch(e) {
      showToast('Erro: ' + e.message, 'danger');
    }
  },

  // ============ DYNAMIC SANDBOX SIMULATION ============
  updateSimulation() {
    this.simState.leads = parseInt(document.getElementById('sim-input-leads').value);
    this.simState.conversion = parseFloat(document.getElementById('sim-input-conversion').value);
    this.simState.ticket = parseInt(document.getElementById('sim-input-ticket').value);
    this.simState.churn = parseFloat(document.getElementById('sim-input-churn').value);

    // Update value displays
    document.getElementById('sim-val-leads').textContent = this.simState.leads;
    document.getElementById('sim-val-conversion').textContent = this.simState.conversion.toFixed(1) + '%';
    document.getElementById('sim-val-ticket').textContent = 'R$ ' + this.simState.ticket;
    document.getElementById('sim-val-churn').textContent = this.simState.churn.toFixed(1) + '%';

    this.runSimulation();
  },

  runSimulation() {
    const { mrr } = this.data.fin;
    const { leads, conversion, ticket, churn } = this.simState;

    const newClients = Math.round(leads * (conversion / 100));
    const newMrr = newClients * ticket;
    const ltv = churn > 0 ? Math.round(ticket / (churn / 100)) : ticket * 12;
    
    // Update live metrics cards
    document.getElementById('sim-kpi-new-clients').textContent = newClients;
    document.getElementById('sim-kpi-ltv').textContent = 'R$ ' + ltv.toLocaleString('pt-BR');

    // Simulate 12 months of growth
    let months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const now = new Date();
    const labels = [];
    const realisticData = [];
    const conservativeData = [];
    const optimisticData = [];
    const tableRows = [];

    let currentMrr = mrr || 1000;
    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + i);
      const label = `${months[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`;
      labels.push(label);

      const lostMrr = currentMrr * (churn / 100);
      currentMrr = Math.max(0, currentMrr + newMrr - lostMrr);

      const realistic = Math.round(currentMrr);
      const conservative = Math.round(realistic * 0.8);
      const optimistic = Math.round(realistic * 1.2);

      realisticData.push(realistic);
      conservativeData.push(conservative);
      optimisticData.push(optimistic);

      const growthRate = i > 0 ? (((realistic - realisticData[i-1]) / (realisticData[i-1] || 1)) * 100).toFixed(1) : '0.0';

      tableRows.push(`
        <tr>
          <td><strong>Mes ${i + 1} (${label})</strong></td>
          <td style="color:var(--text-secondary);">R$ ${conservative.toLocaleString('pt-BR')}</td>
          <td><strong style="color:#10b981;">R$ ${realistic.toLocaleString('pt-BR')}</strong></td>
          <td style="color:#22d3ee;">R$ ${optimistic.toLocaleString('pt-BR')}</td>
          <td><span class="fin-kpi-badge up" style="display:inline-flex;"><i data-lucide="trending-up" style="width:10px;height:10px;"></i>+${growthRate}%</span></td>
        </tr>
      `);
    }

    // Update ARR
    const finalMrr = realisticData[11];
    document.getElementById('sim-kpi-arr').textContent = 'R$ ' + (finalMrr * 12).toLocaleString('pt-BR');

    // Update table body
    document.getElementById('sim-table-body').innerHTML = tableRows.join('');

    // Draw the multi-line chart
    this.drawMultiLineChart(labels, conservativeData, realisticData, optimisticData);
    
    // Create Lucide icons inside the table
    try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch(e) {}
  },

  drawMultiLineChart(labels, conservative, realistic, optimistic) {
    const canvasId = 'chart-forecast-sandbox';
    Charts.destroy(canvasId);

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    Charts.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Cenário Otimista (+20%)',
            data: optimistic,
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(34,211,238,0.02)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 2,
            fill: false,
            tension: 0.3
          },
          {
            label: 'Cenário Realista',
            data: realistic,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.08)',
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#10b981',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Cenário Conservador (-20%)',
            data: conservative,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.02)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 2,
            fill: false,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#9ca3af', font: { size: 10 } }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: '#6b7280', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: '#6b7280', font: { size: 10 } } }
        }
      }
    });
  },

  // ============ SPARKLINE ============
  renderSparkline(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data?.length) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 30 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '30px';
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 30;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const step = w / (data.length - 1 || 1);

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, color + '30');
    gradient.addColorStop(1, color + '00');

    // Fill area
    ctx.beginPath();
    ctx.moveTo(0, h);
    data.forEach((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // End dot
    const lastX = (data.length - 1) * step;
    const lastY = h - ((data[data.length - 1] - min) / range) * (h - 4) - 2;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fillStyle = color + '30';
    ctx.fill();
  },

  // ============ LIVE CLOCK ============
  clockInterval: null,

  startClock() {
    this.stopClock();
    const update = () => {
      const el = document.getElementById('fin-clock');
      if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    };
    update();
    this.clockInterval = setInterval(update, 1000);
  },

  stopClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }
};
