// Real-time notifications + Push via OneSignal
const Notifications = {
  socket: null,
  onesignalReady: false,

  init() {
    if (this.socket) return;

    // Socket.IO
    this.socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    this.socket.on('connect', () => console.log('[SOCKET] OK'));
    this.socket.on('notification', (data) => this.show(data));

    // OneSignal init (with retry)
    this.retryInit(0);
  },

  retryInit(attempt) {
    if (typeof OneSignal !== 'undefined') {
      this.initOneSignal();
    } else if (attempt < 10) {
      setTimeout(() => this.retryInit(attempt + 1), 500);
    }
  },

  async initOneSignal() {
    try {
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

      const res = await fetch('/api/config');
      const { onesignalAppId } = await res.json();
      if (!onesignalAppId) return;

      await OneSignal.init({
        appId: onesignalAppId,
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
        welcomeNotification: { disable: true },
        serviceWorkerUrl: '/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' }
      });

      this.onesignalReady = true;
      console.log('[PUSH] OneSignal OK');
      this.updateButton();
    } catch (e) {
      console.error('[PUSH] Erro:', e);
    }
  },

  async requestPermission() {
    if (!this.onesignalReady) {
      showToast('Aguarde o carregamento completo...', 'warning');
      // Retry in 2 seconds
      setTimeout(() => this.retryInit(0), 2000);
      return;
    }

    const user = this.getCurrentUser();
    if (!user) { showToast('Faça login primeiro', 'error'); return; }

    try {
      const perm = await OneSignal.Notifications.requestPermission();
      if (perm === 'granted') {
        await this.registerToken();
        showToast('Notificações ativadas!', 'success');
      } else {
        showToast('Permissão negada', 'error');
      }
    } catch (e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  async registerToken() {
    try {
      const user = this.getCurrentUser();
      if (!user) return;
      const sub = await OneSignal.User.pushSubscription.getSubscriptionId();
      if (!sub) return;
      await fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('nexus_access_token') },
        body: JSON.stringify({ playerId: sub, platform: 'web' })
      });
    } catch (e) { console.error('[PUSH] register:', e); }
  },

  async testPush() {
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('nexus_access_token') }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        this.show({ type: 'lead', title: 'Teste!', message: 'Notificação funcionando!' });
      } else {
        showToast(data.error || 'Erro ao enviar', 'error');
      }
    } catch (e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  async updateButton() {
    const btn = document.getElementById('btn-push-notifications');
    if (!btn) return;
    try {
      const enabled = await OneSignal.Notifications.isPushPermissionGranted();
      btn.innerHTML = enabled
        ? '<i data-lucide="bell-off"></i><span>Desativar Notificações</span>'
        : '<i data-lucide="bell"></i><span>Ativar Notificações</span>';
      btn.classList.toggle('active', enabled);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch {}
  },

  getCurrentUser() {
    try {
      const t = localStorage.getItem('nexus_access_token');
      if (!t) return null;
      const p = JSON.parse(atob(t.split('.')[1]));
      return { id: p.userId };
    } catch { return null; }
  },

  show({ type, title, message }) {
    const c = { sale: { icon: '💰', bg: 'linear-gradient(135deg, #10b981, #059669)', border: '#34d399', shadow: 'rgba(16,185,129,.3)' }, commission: { icon: '🏆', bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '#a78bfa', shadow: 'rgba(139,92,246,.3)' }, lead: { icon: '🎯', bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '#60a5fa', shadow: 'rgba(59,130,246,.3)' }, info: { icon: 'ℹ️', bg: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: '#818cf8', shadow: 'rgba(99,102,241,.3)' } };
    const s = c[type] || c.info;
    sonner.toast(message, { title, icon: s.icon, style: { background: s.bg, color: '#fff', border: `1px solid ${s.border}`, borderRadius: '12px', padding: '16px 20px', boxShadow: `0 8px 32px ${s.shadow}` }, duration: 6000, position: 'top-right' });
  }
};

document.addEventListener('DOMContentLoaded', () => Notifications.init());
