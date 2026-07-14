// Notification Center — professional notification panel
const NC = {
  notifications: [],
  maxNotifications: 50,

  init() {
    this.loadFromStorage();
    this.updateBadge();
    // Show trigger button after login
    setTimeout(() => {
      const trigger = document.getElementById('nc-trigger');
      if (trigger && Auth && Auth.isLoggedIn()) trigger.style.display = 'flex';
    }, 2000);
  },

  add(type, title, message, url) {
    const notif = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      type: type || 'info',
      title: title || 'Notificação',
      message: message || '',
      url: url || '/',
      time: new Date().toISOString(),
      read: false
    };
    this.notifications.unshift(notif);
    if (this.notifications.length > this.maxNotifications) this.notifications.pop();
    this.saveToStorage();
    this.renderCard(notif);
    this.updateBadge();
    this.showToast(notif);
  },

  renderCard(n) {
    const body = document.getElementById('nc-body');
    if (!body) return;

    // Remove empty state
    const empty = body.querySelector('.nc-empty');
    if (empty) empty.remove();

    const time = new Date(n.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const date = new Date(n.time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const icons = { sale: '💰', commission: '🏆', lead: '🎯', info: 'ℹ️' };
    const labels = { sale: 'VENDA', commission: 'COMISSÃO', lead: 'LEAD', info: 'SISTEMA' };

    const card = document.createElement('div');
    card.className = `nc-card ${n.type}`;
    card.onclick = () => { if (n.url) { window.location.hash = n.url.replace('/#', ''); this.markRead(n.id); } };
    card.innerHTML = `
      <div class="nc-card-top">
        <div class="nc-card-icon">${icons[n.type] || icons.info}</div>
        <div class="nc-card-title">${n.title}</div>
        <div class="nc-card-time">${date} ${time}</div>
      </div>
      <div class="nc-card-msg">${n.message}</div>
      <span class="nc-card-badge">${labels[n.type] || labels.info}</span>
    `;
    body.insertBefore(card, body.firstChild);
  },

  renderAll() {
    const body = document.getElementById('nc-body');
    if (!body) return;
    body.innerHTML = '';
    if (this.notifications.length === 0) {
      body.innerHTML = '<div class="nc-empty"><i data-lucide="bell-off"></i><p>Nenhuma notificação ainda</p></div>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }
    this.notifications.forEach(n => this.renderCard(n));
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  markRead(id) {
    const n = this.notifications.find(x => x.id === id);
    if (n) { n.read = true; this.saveToStorage(); this.updateBadge(); }
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
    if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'flex' : 'none'; }
    if (count) count.textContent = unread || this.notifications.length;
  },

  showToast(n) {
    if (typeof sonner === 'undefined') return;
    const icons = { sale: '💰', commission: '🏆', lead: '🎯', info: 'ℹ️' };
    const styles = {
      sale: { bg: 'linear-gradient(135deg, #059669, #10b981, #34d399)', border: '#34d399', shadow: 'rgba(16,185,129,.4)' },
      commission: { bg: 'linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)', border: '#a78bfa', shadow: 'rgba(139,92,246,.4)' },
      lead: { bg: 'linear-gradient(135deg, #2563eb, #3b82f6, #60a5fa)', border: '#60a5fa', shadow: 'rgba(59,130,246,.4)' },
      info: { bg: 'linear-gradient(135deg, #4f46e5, #6366f1, #818cf8)', border: '#818cf8', shadow: 'rgba(99,102,241,.4)' }
    };
    const s = styles[n.type] || styles.info;
    const time = new Date(n.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const labels = { sale: 'VENDA', commission: 'COMISSÃO', lead: 'LEAD', info: 'SISTEMA' };

    sonner.toast(n.message, {
      title: `${icons[n.type] || icons.info} ${n.title}`,
      description: `${labels[n.type] || labels.info} • ${time}`,
      style: {
        background: 'rgba(10, 10, 26, 0.95)',
        color: '#fff',
        border: `1px solid ${s.border}`,
        borderRadius: '16px',
        padding: '20px 24px',
        fontSize: '14px',
        lineHeight: '1.5',
        boxShadow: `0 20px 60px ${s.shadow}, 0 0 40px ${s.shadow}`,
        backdropFilter: 'blur(20px)',
        minWidth: '340px'
      },
      duration: 6000,
      position: 'top-right'
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
