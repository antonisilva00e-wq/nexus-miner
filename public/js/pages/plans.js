// Plans Page - Subscription Management
const plans_order = ['starter', 'pro', 'enterprise', 'lifetime'];

const masterFeatures = [
  'Consulta de Leads',
  'Consulta CNPJ Real',
  'Pipeline Kanban',
  'Exportacao CSV/Excel',
  'Scoring Inteligente',
  'Automacao de Mineracao',
  'Relatorios Avancados',
  'Busca Dados RF',
  'WhatsApp Integrado'
];

const PlansPage = {
  async render() {
    document.getElementById('page-title').textContent = 'Planos de Assinatura';
    document.getElementById('page-subtitle').textContent = 'Expanda sua capacidade de mineracao';
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
        <div class="card" style="margin-bottom:2rem;padding:1.5rem;background:linear-gradient(135deg,rgba(129,140,248,0.08),rgba(99,102,241,0.04));border-radius:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p style="font-size:0.75rem;color:var(--text-tertiary);margin:0;text-transform:uppercase;font-weight:700;letter-spacing:1px;">Seu Plano Atual</p>
              <h2 style="color:white;font-size:1.6rem;margin:4px 0 0;font-family:var(--font-heading);">${current.name}</h2>
            </div>
            ${currentData.expiry ? `<span style="font-size:0.8rem;color:var(--text-secondary);background:rgba(255,255,255,0.05);padding:6px 12px;border-radius:20px;">Expira em: <strong style="color:white;">${new Date(currentData.expiry).toLocaleDateString('pt-BR')}</strong></span>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px,1fr));gap:1.5rem;margin-top:1.5rem;">
            ${this.renderUsage('Leads', usage.leads)}
            ${this.renderUsage('Exportacoes', usage.exports)}
            ${this.renderUsage('Automacoes', usage.automations)}
          </div>
        </div>

        <!-- Plans Grid -->
        <div class="plans-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;align-items:stretch;">
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
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:6px;font-weight:500;">
          <span style="color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">${label}</span>
          <span style="color:white;font-weight:700;">${data.used} / ${data.max > 0 ? data.max : 'Ilimitado'}</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 1s ease-in-out;"></div>
        </div>
      </div>
    `;
  },

  renderPlan(plan, currentPlanId) {
    const isCurrent = plan.id === currentPlanId;
    const isUpgrade = !isCurrent && plans_order.indexOf(plan.id) > plans_order.indexOf(currentPlanId);
    const isLifetime = plan.id === 'lifetime';
    
    // Aesthetic rules
    let borderColor = 'rgba(255, 255, 255, 0.05)';
    let bgGradient = 'rgba(255, 255, 255, 0.02)';
    let priceColor = '#818cf8';
    
    if (plan.id === 'pro') {
      borderColor = 'rgba(99, 102, 241, 0.4)';
      bgGradient = 'linear-gradient(145deg, rgba(99, 102, 241, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)';
      priceColor = '#a5b4fc';
    } else if (plan.id === 'enterprise') {
      borderColor = 'rgba(16, 185, 129, 0.4)';
      bgGradient = 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)';
      priceColor = '#34d399';
    } else if (isLifetime) {
      borderColor = 'rgba(245, 158, 11, 0.5)';
      bgGradient = 'linear-gradient(145deg, rgba(245, 158, 11, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%)';
      priceColor = '#fbbf24';
    }

    if (isCurrent) borderColor = 'var(--accent-primary)';

    const priceText = isLifetime 
      ? `<span style="font-size:0.85rem;text-decoration:line-through;color:var(--text-tertiary);display:block;margin-bottom:0.2rem;font-weight:600;">De R$ ${plan.originalPrice.toLocaleString('pt-BR')} por</span>
         R$ ${plan.price.toLocaleString('pt-BR')}` 
      : `R$ ${plan.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    return `
      <div class="card" style="padding:1.5rem;background:${bgGradient};border:2px solid ${borderColor};border-radius:20px;display:flex;flex-direction:column;position:relative;overflow:hidden;transition:transform 0.3s, box-shadow 0.3s; ${isCurrent ? 'box-shadow:0 0 20px rgba(99,102,241,0.2);' : ''}">
        ${isLifetime ? '<div style="position:absolute;top:15px;right:-35px;background:#f59e0b;color:#000;font-size:0.65rem;font-weight:800;padding:5px 40px;transform:rotate(45deg);letter-spacing:1px;box-shadow:0 0 15px rgba(245,158,11,0.5);">OFERTA</div>' : ''}
        ${plan.id === 'pro' ? '<div style="position:absolute;top:0;left:0;width:100%;text-align:center;background:linear-gradient(90deg,#6366f1,#818cf8);color:#fff;font-size:0.65rem;font-weight:700;padding:4px;letter-spacing:1px;text-transform:uppercase;">Mais Popular</div><div style="margin-top:15px;"></div>' : ''}
        
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;min-height:24px;">
          <h3 style="color:white;font-size:1.15rem;margin:0;font-family:var(--font-heading);font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">${plan.name}</h3>
          ${isCurrent ? '<span style="background:var(--accent-primary);color:white;font-size:0.65rem;font-weight:800;padding:3px 10px;border-radius:12px;letter-spacing:1px;">ATUAL</span>' : ''}
        </div>
        
        <div style="color:${priceColor};font-size:1.7rem;font-weight:800;margin:0 0 0.5rem;line-height:1.2;">
          ${priceText}
          ${!isLifetime ? '<span style="font-size:0.8rem;font-weight:500;color:var(--text-tertiary);">/mês</span>' : '<span style="font-size:0.8rem;font-weight:500;color:var(--text-tertiary);">/único</span>'}
        </div>
        
        <div style="background:rgba(0,0,0,0.25);padding:1rem;border-radius:12px;font-size:0.75rem;color:var(--text-secondary);margin-bottom:1.5rem;border:1px solid rgba(255,255,255,0.05);">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text-tertiary);">Leads Diários:</span><strong style="color:white;font-weight:700;font-size:0.8rem;">${plan.maxLeads > 0 ? plan.maxLeads : 'Ilimitado'}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text-tertiary);">Usuários:</span><strong style="color:white;font-weight:700;font-size:0.8rem;">${plan.maxUsers > 0 ? plan.maxUsers : 'Ilimitado'}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-tertiary);">Exportações:</span><strong style="color:white;font-weight:700;font-size:0.8rem;">${plan.maxExports > 0 ? plan.maxExports + '/mês' : 'Ilimitado'}</strong></div>
        </div>

        <div style="flex:1;margin-bottom:1.5rem;">
          <h4 style="font-size:0.75rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:5px;">Recursos Inclusos</h4>
          ${masterFeatures.map(f => {
            const hasFeature = plan.featureList.includes(f) || plan.featureList.includes('all') || plan.featureList.length === 9;
            return `
              <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.75rem;opacity:${hasFeature ? '1' : '0.4'};">
                <div style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${hasFeature ? (isLifetime ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)') : 'rgba(255,255,255,0.05)'};">
                  <i data-lucide="${hasFeature ? 'check' : 'x'}" style="width:12px;height:12px;color:${hasFeature ? (isLifetime ? '#fbbf24' : '#10b981') : 'var(--text-tertiary)'};"></i>
                </div>
                <span style="font-size:0.8rem;color:${hasFeature ? 'var(--text-secondary)' : 'var(--text-tertiary)'};font-weight:${hasFeature ? '600' : '400'};text-decoration:${hasFeature ? 'none' : 'line-through'};">${f}</span>
              </div>
            `;
          }).join('')}
        </div>
        
        ${isCurrent
          ? '<button class="btn btn-secondary" disabled style="width:100%;font-weight:800;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);">Plano Atual</button>'
          : `<button class="btn btn-primary" onclick="PlansPage.upgrade('${plan.id}')" style="width:100%;font-weight:800;padding:12px;border-radius:12px;${isLifetime ? 'background:linear-gradient(90deg,#f59e0b,#d97706);color:#000;border:none;' : ''}">
              ${isUpgrade ? 'Fazer Upgrade' : 'Selecionar Plano'}
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
