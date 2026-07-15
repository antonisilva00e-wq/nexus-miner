// Auth module - handles user types and permissions
const Auth = {
  currentUser: null,

  init() {
    try {
      const user = localStorage.getItem('nexus_user');
      if (user) this.currentUser = JSON.parse(user);
    } catch { this.currentUser = null; }
  },

  isLoggedIn() {
    return !!localStorage.getItem('nexus_access_token') && !!this.currentUser;
  },

  getUser() { return this.currentUser; },

  isClient() { return this.currentUser?.userType === 'client' || this.currentUser?.role === 'client'; },
  isAdmin() { return this.currentUser?.role === 'admin'; },
  isManager() { return this.currentUser?.role === 'manager'; },

  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenciais invalidas');

    localStorage.setItem('nexus_access_token', data.accessToken);
    localStorage.setItem('nexus_refresh_token', data.refreshToken);
    localStorage.setItem('nexus_user', JSON.stringify(data.user));
    this.currentUser = data.user;
    return data.user;
  },

  logout() {
    localStorage.removeItem('nexus_access_token');
    localStorage.removeItem('nexus_refresh_token');
    localStorage.removeItem('nexus_user');
    this.currentUser = null;
    document.body.classList.remove('logged-in');
  },

  applyRole() {
    if (!this.currentUser) return;

    document.body.classList.add('logged-in');
    document.body.classList.add(`role-${this.currentUser.role}`);

    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    if (nameEl) nameEl.textContent = this.currentUser.name;
    if (roleEl) {
      const roleLabels = { admin: 'Admin', manager: 'Gerente', seller: 'Vendedor', client: 'Cliente' };
      roleEl.textContent = roleLabels[this.currentUser.role] || this.currentUser.role;
    }

    const isClient = this.isClient();
    const isAdmin = this.isAdmin();

    // Add body class for CSS-based hiding
    document.body.classList.remove('role-client', 'role-admin', 'role-manager', 'role-seller');
    document.body.classList.add(`role-${this.currentUser.role}`);

    // Hide/show menu items using both CSS class and inline style
    document.querySelectorAll('.menu-item').forEach(el => {
      const page = el.dataset.page;
      const clientBlocked = ['automation', 'users', 'financial', 'templates', 'settings', 'clients'];
      const nonAdminBlocked = ['users', 'clients', 'financial', 'automation', 'templates', 'settings'];

      if (isClient && clientBlocked.includes(page)) {
        el.style.display = 'none';
        el.classList.add('hidden-for-client');
      } else if (!isAdmin && nonAdminBlocked.includes(page)) {
        el.style.display = 'none';
        el.classList.add('hidden-for-client');
      } else {
        el.style.display = '';
        el.classList.remove('hidden-for-client');
      }
    });

    // Admin-only elements
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });

    // Manager+ only elements
    document.querySelectorAll('.manager-only').forEach(el => {
      el.style.display = (isAdmin || this.isManager()) ? '' : 'none';
    });
  }
};
