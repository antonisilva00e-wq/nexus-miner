// Notification Center — Clean & Professional (UTMify Style)
const NC = {
  notifications: [],
  maxNotifications: 50,
  currentFilter: 'all',

  init() {
    this.loadFromStorage();
    this.updateBadge();
    setTimeout(() => {
      const trigger = document.getElementById('nc-trigger');
      if (trigger && Auth && Auth.isLoggedIn()) trigger.style.display = 'flex';
    }, 2000);
  },

  add(type, title, message, url) {
    const notif = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      type: type || 'info',
      title: title || 'Notificacao',
      message: message || '',
      url: url || '/',
      time: new Date().toISOString(),
      read: false
    };
    this.notifications.unshift(notif);
    if (this.notifications.length > this.maxNotifications) this.notifications.pop();
    this.saveToStorage();

    // Only render if panel is open
    const panel = document.getElementById('nc-panel');
    if (panel && panel.classList.contains('open')) {
      this.renderAll();
    }

    this.updateBadge();
    this.showToast(notif);
  },

  renderCard(n) {
    const icons = { sale: '💰', commission: '🏆', lead: '🎯', info: 'ℹ️' };
    const labels = { sale: 'VENDA', commission: 'COMISSAO', lead: 'LEAD', info: 'SISTEMA' };
    const time = this.formatTime(n.time);

    const card = document.createElement('div');
    card.className = `nc-card ${n.type}${n.read ? '' : ' unread'}`;
    card.onclick = () => {
      if (n.url) { window.location.hash = n.url.replace('/#', ''); }
      this.markRead(n.id);
      card.classList.remove('unread');
    };

    card.innerHTML = `
      <div class="nc-card-header">
        <div class="nc-card-icon">${icons[n.type] || icons.info}</div>
        <div class="nc-card-title">${n.title}</div>
        <div class="nc-card-time">${time}</div>
      </div>
      <div class="nc-card-message">${n.message}</div>
      <div class="nc-card-footer">
        <span class="nc-card-badge">${labels[n.type] || labels.info}</span>
        <span class="nc-card-action">Ver <i data-lucide="arrow-right"></i></span>
      </div>
    `;
    return card;
  },

  renderAll() {
    const body = document.getElementById('nc-body');
    if (!body) return;
    body.innerHTML = '';

    let filtered = this.notifications;
    if (this.currentFilter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (this.currentFilter !== 'all') {
      filtered = filtered.filter(n => n.type === this.currentFilter);
    }

    if (filtered.length === 0) {
      body.innerHTML = `
        <div class="nc-empty">
          <div class="nc-empty-icon"><i data-lucide="bell-off"></i></div>
          <p>${this.currentFilter === 'unread' ? 'Tudo lido!' : 'Nenhuma notificacao'}</p>
          <span>${this.currentFilter === 'unread' ? 'Novas notificacoes aparecerao aqui' : 'Notificacoes aparecerao aqui'}</span>
        </div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    filtered.forEach(n => body.appendChild(this.renderCard(n)));
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  filterTab(filter, btn) {
    this.currentFilter = filter;
    document.querySelectorAll('.nc-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.renderAll();
  },

  markRead(id) {
    const n = this.notifications.find(x => x.id === id);
    if (n) { n.read = true; this.saveToStorage(); this.updateBadge(); }
  },

  markAllRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveToStorage();
    this.updateBadge();
    this.renderAll();
  },

  clearAll() {
    this.notifications = [];
    this.saveToStorage();
    this.renderAll();
    this.updateBadge();
  },

  updateBadge() {
    const unread = this.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('nc-badge');
    const count = document.getElementById('nc-count');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }
    if (count) count.textContent = unread || this.notifications.length;
  },

  showToast(n) {
    if (typeof sonner === 'undefined') return;
    const icons = { sale: '💰', commission: '🏆', lead: '🎯', info: 'ℹ️' };
    const colors = {
      sale: '#10b981',
      commission: '#8b5cf6',
      lead: '#3b82f6',
      info: '#6366f1'
    };
    const color = colors[n.type] || colors.info;
    const time = this.formatTime(n.time);

    sonner.toast(n.message, {
      title: `${icons[n.type] || icons.info} ${n.title}`,
      description: time,
      style: {
        background: 'rgba(10, 14, 30, 0.95)',
        color: '#fff',
        border: `1px solid ${color}30`,
        borderRadius: '12px',
        padding: '14px 18px',
        fontSize: '13px',
        lineHeight: '1.4',
        boxShadow: `0 12px 40px rgba(0,0,0,0.3), 0 0 20px ${color}15`,
        backdropFilter: 'blur(20px)',
        minWidth: '300px'
      },
      duration: 5000,
      position: 'bottom-right'
    });
  },

  open() {
    document.getElementById('nc-overlay').classList.add('open');
    document.getElementById('nc-panel').classList.add('open');
    this.renderAll();
  },

  close() {
    document.getElementById('nc-overlay').classList.remove('open');
    document.getElementById('nc-panel').classList.remove('open');
  },

  formatTime(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'agora';
    if (diff < 3600) return `ha ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `ha ${Math.floor(diff / 3600)}h`;

    const day = date.getDate().toString().padStart(2, '0');
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const month = months[date.getMonth()];
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${month} ${time}`;
  },

  saveToStorage() {
    try { localStorage.setItem('nexus_notifications', JSON.stringify(this.notifications.slice(0, this.maxNotifications))); } catch {}
  },

  loadFromStorage() {
    try {
      const data = localStorage.getItem('nexus_notifications');
      if (data) this.notifications = JSON.parse(data);
    } catch {}
  }
};
