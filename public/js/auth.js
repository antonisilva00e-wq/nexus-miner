// Auth module - handles user types and permissions
const Auth = {
  memoryStore: {},

  setItem(key, val) {
    try { localStorage.setItem(key, val); } catch {}
    try { sessionStorage.setItem(key, val); } catch {}
    this.memoryStore[key] = val;
  },

  getItem(key) {
    let val = null;
    try { val = localStorage.getItem(key); } catch {}
    if (!val) { try { val = sessionStorage.getItem(key); } catch {} }
    if (!val) { val = this.memoryStore[key] || null; }
    return val;
  },

  removeItem(key) {
    try { localStorage.removeItem(key); } catch {}
    try { sessionStorage.removeItem(key); } catch {}
    delete this.memoryStore[key];
  },

  init() {
    try {
      const user = this.getItem('nexus_user');
      if (user) this.currentUser = typeof user === 'string' ? JSON.parse(user) : user;
    } catch { this.currentUser = null; }
  },

  isLoggedIn() {
    return !!this.getItem('nexus_access_token') && !!this.getUser();
  },

  getUser() {
    if (!this.currentUser) {
      try {
        const u = this.getItem('nexus_user');
        if (u) this.currentUser = typeof u === 'string' ? JSON.parse(u) : u;
      } catch {}
    }
    return this.currentUser;
  },

  isClient() { return this.getUser()?.userType === 'client' || this.getUser()?.role === 'client'; },
  isAdmin() { return this.getUser()?.role === 'admin'; },
  isManager() { return this.getUser()?.role === 'manager'; },

  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenciais invalidas');

    this.setItem('nexus_access_token', data.accessToken);
    this.setItem('nexus_refresh_token', data.refreshToken);
    this.setItem('nexus_user', JSON.stringify(data.user));
    this.currentUser = data.user;
    return data.user;
  },

  logout() {
    this.removeItem('nexus_access_token');
    this.removeItem('nexus_refresh_token');
    this.removeItem('nexus_user');
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
      const clientBlocked = ['automation', 'users', 'financial', 'templates', 'clients'];
      const nonAdminBlocked = ['users', 'clients', 'automation', 'templates'];

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
