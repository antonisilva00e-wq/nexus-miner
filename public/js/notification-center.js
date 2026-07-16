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
      // Show user ID in panel
      this.showUserId();
    }, 2000);

    // Bind send button event
    setTimeout(() => {
      const sendBtn = document.getElementById('nc-send-btn');
      if (sendBtn) {
        sendBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.sendManual();
        });
      }
    }, 1000);
  },

  showUserId() {
    const el = document.getElementById('nc-user-id');
    if (!el) return;
    try {
      const token = localStorage.getItem('nexus_access_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId || payload.id || 'N/A';
        el.textContent = userId;
        el.title = 'ID do usuario - copie para enviar notificacoes direcionadas';
      }
    } catch {}
  },

  copyUserId() {
    const el = document.getElementById('nc-user-id');
    if (el && el.textContent) {
      navigator.clipboard.writeText(el.textContent).then(() => {
        const status = document.getElementById('nc-compose-status');
        if (status) { status.textContent = 'ID copiado!'; status.style.color = '#34d399'; status.style.display = 'block'; setTimeout(() => { status.style.display = 'none'; }, 2000); }
      });
    }
  },

  add(type, title, message, url) {
    try {
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

      const panel = document.getElementById('nc-panel');
      if (panel && panel.classList.contains('open')) {
        this.renderAll();
      }

      this.updateBadge();
      this.showToast(notif);
    } catch (e) {
      console.error('[NC] add error:', e);
    }
  },

  // ============ SEND MANUAL NOTIFICATION ============
  sendManual() {
    try {
      const input = document.getElementById('nc-manual-input');
      const typeSelect = document.getElementById('nc-manual-type');
      const titleInput = document.getElementById('nc-manual-title');
      const targetInput = document.getElementById('nc-target-user');
      const sendBtn = document.getElementById('nc-send-btn');

      const statusEl = document.getElementById('nc-compose-status');
      const showStatus = (msg, color) => {
        if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color; statusEl.style.display = 'block'; setTimeout(() => { statusEl.style.display = 'none'; }, 3000); }
      };

      if (!input) { showStatus('Campo nao encontrado!', '#fb7185'); return; }

      const message = input.value.trim();
      const type = typeSelect ? typeSelect.value : 'info';
      const title = titleInput ? titleInput.value.trim() : '';
      const targetUserId = targetInput ? targetInput.value.trim() : '';

      if (!message) {
        showStatus('Digite uma mensagem!', '#fb7185');
        input.focus();
        input.style.borderColor = 'rgba(244, 63, 94, 0.4)';
        setTimeout(() => { input.style.borderColor = ''; }, 2000);
        return;
      }

      const finalTitle = title || this.getDefaultTitle(type);

      // If target user ID is provided, send via API
      if (targetUserId) {
        this.sendToUser(targetUserId, type, finalTitle, message);
      } else {
        // Broadcast to all
        this.add(type, finalTitle, message);
      }

      // Clear inputs
      input.value = '';
      input.style.borderColor = '';
      if (titleInput) titleInput.value = '';
      if (targetInput) targetInput.value = '';

      // Visual feedback
      showStatus(targetUserId ? 'Notificacao enviada para usuario!' : 'Notificacao enviada!', '#34d399');
      if (sendBtn) {
        sendBtn.textContent = '✓';
        sendBtn.classList.add('sent');
        setTimeout(() => {
          sendBtn.innerHTML = '<i data-lucide="send"></i>';
          sendBtn.classList.remove('sent');
          try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch(e) {}
        }, 1500);
      }
    } catch (e) {
      const statusEl = document.getElementById('nc-compose-status');
      if (statusEl) { statusEl.textContent = 'Erro: ' + e.message; statusEl.style.color = '#fb7185'; statusEl.style.display = 'block'; }
      console.error('[NC] sendManual error:', e);
    }
  },

  async sendToUser(userId, type, title, message) {
    try {
      await API.post('/notifications/send', { userId, type, title, message });
    } catch (e) {
      console.error('[NC] sendToUser error:', e);
      // Fallback: add locally
      this.add(type, title, message);
    }
  },

  getDefaultTitle(type) {
    const titles = {
      sale: 'Venda Registrada',
      commission: 'Comissao',
      lead: 'Novo Lead',
      info: 'Notificacao'
    };
    return titles[type] || titles.info;
  },

  handleManualKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendManual();
    }
  },

  // ============ RENDER CARD ============
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
        <div class="nc-card-title">${this.escapeHtml(n.title)}</div>
        <div class="nc-card-time">${time}</div>
      </div>
      <div class="nc-card-message">${this.escapeHtml(n.message)}</div>
      <div class="nc-card-footer">
        <span class="nc-card-badge">${labels[n.type] || labels.info}</span>
        <div class="nc-card-actions">
          <button class="nc-card-delete" onclick="event.stopPropagation(); NC.remove('${n.id}')" title="Remover">x</button>
          <span class="nc-card-action">Ver →</span>
        </div>
      </div>
    `;
    return card;
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  remove(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveToStorage();
    this.renderAll();
    this.updateBadge();
  },

  // ============ RENDER ALL ============
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
          <span>${this.currentFilter === 'unread' ? 'Novas notificacoes aparecero aqui' : 'Escreva uma notificacao acima'}</span>
        </div>`;
      try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch(e) {}
      return;
    }

    filtered.forEach(n => body.appendChild(this.renderCard(n)));
    try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch(e) {}
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
    try {
      if (typeof sonner === 'undefined') return;
      const icons = { sale: '💰', commission: '🏆', lead: '🎯', info: 'ℹ️' };
      const colors = { sale: '#10b981', commission: '#8b5cf6', lead: '#3b82f6', info: '#6366f1' };
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
    } catch (e) {
      console.error('[NC] Toast error:', e);
    }
  },

  open() {
    try {
      document.getElementById('nc-overlay').classList.add('open');
      document.getElementById('nc-panel').classList.add('open');
      this.renderAll();
      setTimeout(() => {
        const input = document.getElementById('nc-manual-input');
        if (input) input.focus();
      }, 400);
    } catch (e) {
      console.error('[NC] Open error:', e);
    }
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
    try {
      localStorage.setItem('nexus_notifications', JSON.stringify(this.notifications.slice(0, this.maxNotifications)));
    } catch (e) {
      console.error('[NC] saveToStorage error:', e);
    }
  },

  loadFromStorage() {
    try {
      const data = localStorage.getItem('nexus_notifications');
      if (data) this.notifications = JSON.parse(data);
    } catch (e) {
      console.error('[NC] loadFromStorage error:', e);
      this.notifications = [];
    }
  }
};
