// Main App - Simple & Robust
const App = {
  currentPage: null,

  pages: {
    dashboard: DashboardPage,
    leads: LeadsPage,
    map: MapPage,
    kanban: KanbanPage,
    scoring: ScoringPage,
    enrichment: EnrichmentPage,
    booking: BookingPage,
    intelligence: IntelligencePage,
    clients: ClientsPage,
    financial: FinancialPage,
    whatsapp: WhatsAppPage,
    telegram: TelegramPage,
    voice: VoicePage,
    reports: ReportsPage,
    automation: AutomationPage,
    plans: PlansPage,
    referrals: ReferralsPage,
    users: UsersPage,
    settings: SettingsPage,
  },

  init() {
    Auth.init();
    // Init theme
    if (typeof Theme !== 'undefined') Theme.init();

    // Login form submit prevention
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        App.handleLogin(e);
        return false;
      });
    }

    // Nav links
    document.querySelectorAll('.menu-item[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        App.navigateTo(page);
      });
    });

    // Already logged in?
    if (Auth.isLoggedIn()) {
      Auth.applyRole();
      this.showApp();
    }
  },

  async handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const user = (document.getElementById('login-user')?.value || '').trim();
    const pass = (document.getElementById('login-pass')?.value || '').trim();
    const errorEl = document.getElementById('login-error');
    const btnText = document.getElementById('login-btn-text');

    if (!user || !pass) {
      if (errorEl) errorEl.classList.add('visible');
      const errTxt = document.getElementById('login-error-text');
      if (errTxt) errTxt.textContent = 'Preencha usuario e senha';
      return false;
    }

    if (errorEl) errorEl.classList.remove('visible');
    if (btnText) btnText.textContent = 'Verificando...';

    try {
      await Auth.login(user, pass);
      if (btnText) btnText.textContent = 'Acesso liberado!';
      this.showApp();
    } catch (err) {
      if (errorEl) errorEl.classList.add('visible');
      const errTxt = document.getElementById('login-error-text');
      if (errTxt) errTxt.textContent = err.message || 'Credenciais invalidas';
      if (btnText) btnText.textContent = 'Entrar no Painel';
    }
    return false;
  },

  showApp() {
    Auth.applyRole();
    document.body.classList.add('logged-in');
    this.navigateTo('dashboard');
    // Show notification bell and user ID for all logged-in users
    const trigger = document.getElementById('nc-trigger');
    if (trigger) trigger.style.display = 'flex';
    if (typeof NC !== 'undefined' && NC.showUserId) NC.showUserId();
    // Start onboarding for new users
    if (typeof Onboarding !== 'undefined') Onboarding.init();
    // Start Voice AI Agent
    if (typeof VoiceAgent !== 'undefined') VoiceAgent.init();
  },

  navigateTo(pageName) {
    // Block access for clients on restricted pages
    if (Auth.isClient()) {
      const blocked = ['automation', 'users', 'financial', 'templates'];
      if (blocked.includes(pageName)) {
        showToast('Acesso restrito', 'warning');
        return;
      }
    }

    // Only admin can access restricted pages
    const adminOnly = ['users', 'clients', 'automation', 'templates'];
    if (adminOnly.includes(pageName) && !Auth.isAdmin()) {
      showToast('Apenas o administrador pode acessar esta pÃ¡gina', 'warning');
      return;
    }

    // Hide all page-content
    document.querySelectorAll('.page-content').forEach(el => el.style.display = 'none');

    // Show target
    const pageEl = document.getElementById(`page-${pageName}`);
    if (pageEl) pageEl.style.display = 'block';

    // Update menu active state
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    const menuItem = document.querySelector(`.menu-item[data-page="${pageName}"]`);
    if (menuItem) menuItem.classList.add('active');

    // Update header
    const titles = {
      dashboard: 'Dashboard',
      leads: 'Minerar Leads',
      kanban: 'Pipeline Kanban',
      scoring: 'Scoring de Leads',
      enrichment: 'Enriquecimento IA',
      booking: 'Agendamentos',
      intelligence: 'Inteligencia de Mercado',
      clients: 'Gerenciar Clientes',
      financial: 'Financeiro',
      whatsapp: 'WhatsApp',
      reports: 'Relatorios',
      automation: 'Automacao',
      plans: 'Planos',
      referrals: 'Indicar e Ganhar',
      users: 'Gerenciar Usuarios',
      settings: 'Configuracoes',
      map: 'Mapa de Leads',
      telegram: 'Telegram',
    };
    document.getElementById('page-title').textContent = titles[pageName] || pageName;

    // Clean up intervals from previous page
    if (typeof DashboardPage !== 'undefined') DashboardPage.stopAutoRefresh();
    if (typeof FinancialPage !== 'undefined') FinancialPage.stopClock();

    // Destroy old charts
    if (typeof Charts !== 'undefined') Charts.destroyAll();

    // Render page
    const page = this.pages[pageName];
    if (page && typeof page.render === 'function') {
      this.currentPage = pageName;
      page.render().catch(err => {
        console.error('Page render error:', err);
        document.getElementById(`page-${pageName}`).innerHTML =
          `<div class="empty-state"><p>Erro ao carregar: ${err.message}</p></div>`;
      });
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  logout() {
    // Log logout action (fire and forget)
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('nexus_access_token')}` }
    }).catch(() => {});

    Auth.logout();
    document.body.classList.remove('logged-in');
    window.location.reload();
  },

  closeModal() {
    if (typeof Modal !== 'undefined') Modal.close();
  }
};

// Toggle password visibility
function toggleLoginPassword() {
  const input = document.getElementById('login-pass');
  const icon = document.getElementById('login-eye');
  if (input.type === 'password') {
    input.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());

// Global error handler
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise]', e.reason);
  if (typeof UI !== 'undefined' && e.reason?.message) {
    UI.handleError(e.reason, 'unhandled');
  }
});

window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.message);
});
