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
    sites: typeof SitesPage !== 'undefined' ? SitesPage : null,
    'sites-prospecting': typeof SitesProspectingPage !== 'undefined' ? SitesProspectingPage : null,
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
    } else {
      document.body.classList.remove('logged-in');
      const loginPage = document.getElementById('page-login');
      const appShell = document.getElementById('app-shell');
      const appContainer = document.getElementById('app');
      if (loginPage) loginPage.style.display = 'block';
      if (appShell) appShell.style.display = 'none';
      if (appContainer) appContainer.style.display = 'none';
    }
  },

  async handleLogin(e) {
    try {
      if (e && e.preventDefault) e.preventDefault();
      const user = (document.getElementById('login-user')?.value || '').trim();
      const pass = (document.getElementById('login-pass')?.value || '').trim();
      const errorEl = document.getElementById('login-error');
      const btnText = document.getElementById('login-btn-text');


    if (!user || !pass) {
      if (errorEl) errorEl.classList.add('visible');
      const errTxt = document.getElementById('login-error-text');
      if (errTxt) errTxt.textContent = 'Please enter your username and password';
      return false;
    }

    if (errorEl) errorEl.classList.remove('visible');
    if (btnText) btnText.textContent = 'Verifying...';

    try {
      await Auth.login(user, pass);
      if (btnText) btnText.textContent = 'Access granted!';
      this.showApp();
    } catch (err) {
      alert("Erro ao fazer login: " + err.message);
      if (errorEl) errorEl.classList.add('visible');
      const errTxt = document.getElementById('login-error-text');
      if (errTxt) errTxt.textContent = err.message || 'Invalid credentials';
      if (btnText) btnText.textContent = 'Sign In';
    }
    } catch (criticalErr) {
      alert("Erro CRITICO na pagina: " + criticalErr.message);
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
        showToast('Restricted access', 'warning');
        return;
      }
    }

    // Only admin can access restricted pages (users)
    const adminOnly = ['users'];
    if (adminOnly.includes(pageName) && !Auth.isAdmin()) {
      showToast('Only administrators can access this page', 'warning');
      return;
    }

    // Check Plan Limits
    if (Auth.currentUser && Auth.currentUser.plan) {
      const plan = Auth.currentUser.plan;
      const starterBlocked = ['scoring', 'enrichment', 'intelligence', 'whatsapp', 'telegram', 'voice', 'reports', 'automation', 'export'];
      const proBlocked = ['enrichment', 'intelligence', 'telegram', 'voice'];

      if (plan === 'starter' && starterBlocked.includes(pageName)) {
        showToast('Funcionalidade exclusiva dos planos superiores. Faça upgrade!', 'warning');
        this.navigateTo('plans');
        return;
      }
      
      if (plan === 'pro' && proBlocked.includes(pageName)) {
        showToast('Funcionalidade exclusiva dos planos Empresarial e Vitalício. Faça upgrade!', 'warning');
        this.navigateTo('plans');
        return;
      }
    }

    // Hide all page-content
    document.querySelectorAll('.page-content').forEach(el => el.style.display = 'none');

    // Show target
    const pageEl = document.getElementById(`page-${pageName}`);
    if (pageEl) pageEl.style.display = 'block';

    // Close sidebar if open (mobile)
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');

    // Update menu active state
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    const menuItem = document.querySelector(`.menu-item[data-page="${pageName}"]`);
    if (menuItem) menuItem.classList.add('active');

    // Update header
    const titles = {
      dashboard: 'Dashboard',
      leads: 'Lead Mining',
      kanban: 'Sales Pipeline',
      scoring: 'Lead Scoring',
      enrichment: 'AI Enrichment',
      booking: 'Appointments',
      intelligence: 'Market Intelligence',
      clients: 'Manage Clients',
      financial: 'Financial',
      whatsapp: 'WhatsApp',
      reports: 'Reports',
      automation: 'Automation',
      plans: 'Plans',
      referrals: 'Referrals',
      users: 'Manage Users',
      settings: 'Settings',
      map: 'Lead Map',
      telegram: 'Telegram',
      sites: 'AI Site Builder',
      'sites-prospecting': 'Site Prospecting',
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
