// Plans Page - Subscription Management
const plans_order = ['free', 'pro', 'enterprise'];

const PlansPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Planos';
    document.getElementById('page-subtitle').textContent = 'Escolha o plano ideal para seu negocio';
    const el = document.getElementById('page-plans');
    el.innerHTML = '<div class="skeleton-card" style="height:300px;"></div>';

    try {
      const [plansData, currentData] = await Promise.all([
        API.get('/plans'),
        API.get('/plans/current'),
      ]);

      const plans = plansData.plans;
      const current = currentData.plan;
      const usage = currentData.usage;

      el.innerHTML = `
        <!-- Current Plan -->
        <div class="card" style="margin-bottom:1.5rem;padding:1.5rem;background:linear-gradient(135deg,rgba(129,140,248,0.08),rgba(99,102,241,0.04));">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p style="font-size:0.75rem;color:var(--text-tertiary);margin:0;text-transform:uppercase;">Seu Plano Atual</p>
              <h2 style="color:white;font-size:1.5rem;margin:4px 0 0;">${current.name}</h2>
            </div>
            ${currentData.expiry ? `<span style="font-size:0.8rem;color:var(--text-secondary);">Expira em: ${new Date(currentData.expiry).toLocaleDateString('pt-BR')}</span>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:1rem;">
            ${this.renderUsage('Leads', usage.leads)}
            ${this.renderUsage('Exportacoes', usage.exports)}
            ${this.renderUsage('Automacoes', usage.automations)}
          </div>
        </div>

        <!-- Plans Grid -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;">
          ${plans.map(p => this.renderPlan(p, current.id)).join('')}
        </div>
      `;
      lucide.createIcons();
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><p>Erro ao carregar planos: ${err.message}</p></div>`;
    }
  },

  renderUsage(label, data) {
    const pct = data.max > 0 ? Math.min((data.used / data.max) * 100, 100) : 0;
    const color = pct > 80 ? '#f43f5e' : pct > 50 ? '#f59e0b' : '#10b981';
    return `
      <div>
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:4px;">
          <span style="color:var(--text-secondary);">${label}</span>
          <span style="color:white;font-weight:600;">${data.used} / ${data.max > 0 ? data.max : '∞'}</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;"></div>
        </div>
      </div>
    `;
  },

  renderPlan(plan, currentPlanId) {
    const isCurrent = plan.id === currentPlanId;
    const isUpgrade = !isCurrent && plans_order.indexOf(plan.id) > plans_order.indexOf(currentPlanId);
    const priceColor = plan.price === 0 ? '#10b981' : '#818cf8';

    return `
      <div class="card" style="padding:1.5rem;${isCurrent ? 'border:2px solid var(--accent-primary);' : ''}display:flex;flex-direction:column;">
        ${isCurrent ? '<span style="display:inline-block;background:var(--accent-primary);color:white;font-size:0.65rem;font-weight:700;padding:3px 10px;border-radius:12px;align-self:flex-start;margin-bottom:0.5rem;">ATUAL</span>' : ''}
        <h3 style="color:white;font-size:1.2rem;margin:0 0 0.5rem;">${plan.name}</h3>
        <p style="color:${priceColor};font-size:1.8rem;font-weight:700;margin:0 0 0.25rem;">
          ${plan.price === 0 ? 'Gratis' : `R$ ${plan.price}`}
          ${plan.price > 0 ? '<span style="font-size:0.8rem;font-weight:400;color:var(--text-tertiary);">/mes</span>' : ''}
        </p>
        <div style="flex:1;margin:1rem 0;">
          ${plan.featureList.map(f => `
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
              <i data-lucide="check" style="width:14px;height:14px;color:#10b981;flex-shrink:0;"></i>
              <span style="font-size:0.82rem;color:var(--text-secondary);">${f}</span>
            </div>
          `).join('')}
        </div>
        <div style="font-size:0.78rem;color:var(--text-tertiary);margin-bottom:1rem;">
          <p style="margin:0 0 4px;">Leads: ${plan.maxLeads > 0 ? plan.maxLeads + '/mes' : 'Ilimitado'}</p>
          <p style="margin:0 0 4px;">Usuarios: ${plan.maxUsers > 0 ? plan.maxUsers : 'Ilimitado'}</p>
          <p style="margin:0;">Exportacoes: ${plan.maxExports > 0 ? plan.maxExports + '/mes' : 'Ilimitado'}</p>
        </div>
        ${isCurrent
          ? '<button class="btn btn-secondary" disabled style="width:100%;">Plano Atual</button>'
          : `<button class="btn btn-primary" onclick="PlansPage.upgrade('${plan.id}')" style="width:100%;">
              ${isUpgrade ? 'Fazer Upgrade' : 'Mudar Plano'}
            </button>`
        }
      </div>
    `;
  },

  async upgrade(planId) {
    if (!confirm(`Confirmar mudanca para o plano ${planId}?`)) return;
    try {
      await API.post('/plans/upgrade', { planId });
      showToast('Plano atualizado com sucesso!', 'success');
      this.render();
    } catch (err) {
      showToast('Erro: ' + err.message, 'danger');
    }
  },
};
