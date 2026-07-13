// Financial Page - Enhanced
const FinancialPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Financeiro';
    document.getElementById('page-subtitle').textContent = 'Gestao de receita e assinaturas';

    const el = document.getElementById('page-financial');
    el.innerHTML = `
      <div id="fin-metrics" class="kpi-grid">
        ${Array(4).fill('<div class="skeleton-card" style="min-height:80px;"></div>').join('')}
      </div>
      <div class="dashboard-charts-grid" style="margin-bottom:1.5rem;">
        <div class="chart-card">
          <h3><i data-lucide="trending-up"></i>Receita Mensal</h3>
          <div class="chart-container"><canvas id="chart-revenue"></canvas></div>
        </div>
        <div class="chart-card">
          <h3><i data-lucide="pie-chart"></i>MRR por Plano</h3>
          <div class="chart-container"><canvas id="chart-mrr-plan"></canvas></div>
        </div>
      </div>
      <div class="dashboard-bottom-grid">
        <div class="card">
          <div class="card-header">
            <h3><i data-lucide="calendar"></i>Vencimentos Proximos</h3>
          </div>
          <div id="expiring-list" class="stagger-list"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3><i data-lucide="receipt"></i>Pagamentos Recentes</h3>
            <button class="btn btn-sm btn-primary" onclick="FinancialPage.openPaymentModal()"><i data-lucide="plus"></i>Registrar</button>
          </div>
          <div id="payments-list" class="stagger-list"></div>
        </div>
      </div>
    `;
    lucide.createIcons();
    await this.loadData();
  },

  async loadData() {
    try {
      const [fin, payments] = await Promise.all([
        API.get('/financial/dashboard'),
        API.get('/financial/payments')
      ]);

      // Metrics with counter animation
      document.getElementById('fin-metrics').innerHTML = `
        <div class="kpi-card">
          <div class="kpi-icon" style="background:linear-gradient(135deg,#10b981,#059669);"><i data-lucide="dollar-sign"></i></div>
          <div class="kpi-info"><span class="kpi-value">R$ ${fin.mrr.toLocaleString('pt-BR')}</span><span class="kpi-label">MRR</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:linear-gradient(135deg,#818cf8,#6366f1);"><i data-lucide="trending-up"></i></div>
          <div class="kpi-info"><span class="kpi-value">R$ ${fin.totalRevenue.toLocaleString('pt-BR')}</span><span class="kpi-label">Receita Total</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:linear-gradient(135deg,#f43f5e,#e11d48);"><i data-lucide="alert-triangle"></i></div>
          <div class="kpi-info"><span class="kpi-value">${fin.churnRate}%</span><span class="kpi-label">Churn Rate</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:linear-gradient(135deg,#22d3ee,#06b6d4);"><i data-lucide="users"></i></div>
          <div class="kpi-info"><span class="kpi-value" data-counter="${fin.activeClients}">0</span><span class="kpi-label">Clientes Ativos</span></div>
        </div>
      `;
      lucide.createIcons();

      // Animate counters
      document.querySelectorAll('#fin-metrics [data-counter]').forEach(el => {
        const target = parseFloat(el.dataset.counter);
        const duration = 600;
        const start = performance.now();
        function step(now) {
          const p = Math.min((now - start) / duration, 1);
          el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });

      // Revenue chart
      if (fin.monthlyRevenue.length) {
        Charts.createBar('chart-revenue', fin.monthlyRevenue.map(m => m.month), fin.monthlyRevenue.map(m => m.total), 'Receita (R$)');
      }

      // MRR by plan
      if (fin.mrrByPlan.length) {
        Charts.createDoughnut('chart-mrr-plan', fin.mrrByPlan.map(m => m.plan), fin.mrrByPlan.map(m => m.total));
      }

      // Expiring clients
      const expList = document.getElementById('expiring-list');
      if (fin.expiringClients.length) {
        expList.innerHTML = fin.expiringClients.map(c => {
          const daysLeft = Math.ceil((new Date(c.expiry) - new Date()) / 86400000);
          return `
            <div class="seller-item">
              <div class="seller-info">
                <span class="seller-name">${c.name}</span>
                <span class="seller-stats">${c.plan} · R$${c.price}/mes</span>
              </div>
              <span class="badge ${daysLeft <= 3 ? 'badge-danger' : 'badge-warning'}">${daysLeft}d restantes</span>
            </div>
          `;
        }).join('');
      } else {
        expList.innerHTML = '<p class="text-tertiary text-sm" style="text-align:center;padding:2rem;">Nenhum vencimento proximo</p>';
      }

      // Recent payments
      const payList = document.getElementById('payments-list');
      if (payments.payments.length) {
        payList.innerHTML = payments.payments.slice(0, 8).map(p => `
          <div class="seller-item">
            <div class="seller-info">
              <span class="seller-name">${p.client_name || 'N/A'}</span>
              <span class="seller-stats">${p.payment_method || '-'} · ${new Date(p.payment_date).toLocaleDateString('pt-BR')}</span>
            </div>
            <span class="badge badge-success">R$ ${p.amount.toLocaleString('pt-BR')}</span>
          </div>
        `).join('');
      } else {
        payList.innerHTML = '<p class="text-tertiary text-sm" style="text-align:center;padding:2rem;">Nenhum pagamento registrado</p>';
      }
    } catch (err) {
      showToast('Erro ao carregar dados financeiros', 'danger');
    }
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
  }
};
