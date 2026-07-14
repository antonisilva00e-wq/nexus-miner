// Onboarding — guided tour for new users
const Onboarding = {
  steps: [
    {
      target: '[data-page="dashboard"]',
      title: 'Bem-vindo ao Nexus Miner!',
      text: 'Este é o seu painel de controle. Aqui você acompanha todos os KPIs do seu negócio em tempo real.',
      position: 'right'
    },
    {
      target: '[data-page="leads"]',
      title: 'Mineração de Leads',
      text: 'Encontre empresas automaticamente por atividade e região. Milhares de leads qualificados à sua disposição.',
      position: 'right'
    },
    {
      target: '[data-page="map"]',
      title: 'Mapa de Leads',
      text: 'Visualize seus leads no mapa. Identifique clusters geográficos e oportunidades de mercado.',
      position: 'right'
    },
    {
      target: '[data-page="kanban"]',
      title: 'Pipeline de Vendas',
      text: 'Arraste e solte leads entre estágios. Acompanhe cada etapa do funil de vendas.',
      position: 'right'
    },
    {
      target: '[data-page="settings"]',
      title: 'Configurações',
      text: 'Ative notificações push para não perder nenhuma oportunidade. Personalize seu painel.',
      position: 'right'
    }
  ],
  currentStep: 0,

  init() {
    const shown = localStorage.getItem('nexus_onboarding_done');
    if (!shown && Auth.isLoggedIn()) {
      setTimeout(() => this.start(), 1500);
    }
  },

  start() {
    this.currentStep = 0;
    this.showStep();
  },

  showStep() {
    if (this.currentStep >= this.steps.length) {
      this.finish();
      return;
    }

    const step = this.steps[this.currentStep];
    const target = document.querySelector(step.target);
    if (!target) { this.next(); return; }

    // Remove existing overlay
    this.removeOverlay();

    const rect = target.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;" onclick="Onboarding.finish()"></div>
      <div style="position:fixed;z-index:100000;background:rgba(15,15,30,0.98);border:1px solid rgba(99,102,241,0.3);border-radius:16px;padding:24px;max-width:320px;box-shadow:0 20px 60px rgba(99,102,241,0.3);backdrop-filter:blur(20px);animation:onbFadeIn 0.3s ease-out;
        ${step.position === 'right' ? `left:${rect.right + 16}px;top:${rect.top}px;` : `left:${rect.right + 16}px;top:${rect.top}px;`}
      ">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:0.7rem;color:rgba(255,255,255,0.3);font-weight:600;">PASSO ${this.currentStep + 1}/${this.steps.length}</span>
          <button onclick="Onboarding.finish()" style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:1.2rem;">✕</button>
        </div>
        <h3 style="color:#fff;font-size:1rem;margin:0 0 8px;">${step.title}</h3>
        <p style="color:rgba(255,255,255,0.6);font-size:0.85rem;line-height:1.5;margin:0 0 16px;">${step.text}</p>
        <div style="display:flex;gap:8px;justify-content:space-between;">
          <button onclick="Onboarding.prev()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.8rem;">Voltar</button>
          <div style="display:flex;gap:4px;align-items:center;">
            ${this.steps.map((_, i) => `<div style="width:${i === this.currentStep ? '20px' : '6px'};height:6px;border-radius:3px;background:${i === this.currentStep ? '#6366f1' : 'rgba(255,255,255,0.15)'};transition:all 0.3s;"></div>`).join('')}
          </div>
          <button onclick="Onboarding.next()" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.8rem;font-weight:600;">${this.currentStep === this.steps.length - 1 ? 'Começar' : 'Próximo'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Highlight target
    target.style.position = 'relative';
    target.style.zIndex = '99998';
    target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.5)';
    target.style.borderRadius = '12px';
  },

  next() {
    this.unhighlight();
    this.currentStep++;
    this.showStep();
  },

  prev() {
    this.unhighlight();
    this.currentStep = Math.max(0, this.currentStep - 1);
    this.showStep();
  },

  finish() {
    this.unhighlight();
    this.removeOverlay();
    localStorage.setItem('nexus_onboarding_done', '1');
  },

  unhighlight() {
    document.querySelectorAll('[style*="z-index: 99998"]').forEach(el => {
      el.style.zIndex = '';
      el.style.boxShadow = '';
    });
  },

  removeOverlay() {
    const el = document.getElementById('onboarding-overlay');
    if (el) el.remove();
  }
};
