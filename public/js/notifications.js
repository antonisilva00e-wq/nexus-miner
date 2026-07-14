// Push notifications using native Web Push API (no OneSignal)
const Notifications = {
  socket: null,
  swRegistration: null,
  vapidPublicKey: null,

  async init() {
    if (this.socket) return;

    // Socket.IO for real-time
    this.socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    this.socket.on('connect', () => console.log('[SOCKET] OK'));
    this.socket.on('notification', (data) => this.show(data));

    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('[SW] Registrado');
      } catch (e) {
        console.error('[SW] Erro:', e);
      }
    }

    // Fetch VAPID public key
    try {
      const res = await fetch('/api/push/vapid-public-key');
      const data = await res.json();
      this.vapidPublicKey = data.publicKey;
    } catch {}

    this.updateButton();
  },

  async requestPermission() {
    const user = this.getCurrentUser();
    if (!user) { showToast('Faça login primeiro', 'error'); return; }
    if (!this.swRegistration) { showToast('Service Worker não disponível', 'error'); return; }
    if (!this.vapidPublicKey) { showToast('Push não configurado no servidor', 'error'); return; }

    try {
      // Request browser permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Permissão negada', 'error');
        return;
      }

      // Subscribe to push
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Save subscription on server
      const sub = subscription.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('nexus_access_token')
        },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Notificações ativadas!', 'success');
      } else {
        showToast(data.error || 'Erro ao ativar', 'error');
      }
      this.updateButton();
    } catch (e) {
      showToast('Erro: ' + e.message, 'error');
    }
  },

  async unsubscribe() {
    const user = this.getCurrentUser();
    if (!user) return;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('nexus_access_token')
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }
      showToast('Notificações desativadas', 'info');
      this.updateButton();
    } catch (e) {
      console.error('[PUSH] unsubscribe:', e);
    }
  },

  async testPush() {
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('nexus_access_token')
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
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

    let subscribed = false;
    if (this.swRegistration) {
      const sub = await this.swRegistration.pushManager.getSubscription();
      subscribed = !!sub;
    }

    btn.innerHTML = subscribed
      ? '<i data-lucide="bell-off"></i><span>Desativar Notificações</span>'
      : '<i data-lucide="bell"></i><span>Ativar Notificações</span>';
    btn.classList.toggle('active', subscribed);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  getCurrentUser() {
    try {
      const t = localStorage.getItem('nexus_access_token');
      if (!t) return null;
      const p = JSON.parse(atob(t.split('.')[1]));
      return { id: p.userId };
    } catch { return null; }
  },

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  },

  show({ type, title, message }) {
    const c = { sale: { icon: '💰', bg: 'linear-gradient(135deg, #10b981, #059669)', border: '#34d399', shadow: 'rgba(16,185,129,.3)' }, commission: { icon: '🏆', bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '#a78bfa', shadow: 'rgba(139,92,246,.3)' }, lead: { icon: '🎯', bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '#60a5fa', shadow: 'rgba(59,130,246,.3)' }, info: { icon: 'ℹ️', bg: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: '#818cf8', shadow: 'rgba(99,102,241,.3)' } };
    const s = c[type] || c.info;
    sonner.toast(message, { title, icon: s.icon, style: { background: s.bg, color: '#fff', border: `1px solid ${s.border}`, borderRadius: '12px', padding: '16px 20px', boxShadow: `0 8px 32px ${s.shadow}` }, duration: 6000, position: 'top-right' });
  }
};

document.addEventListener('DOMContentLoaded', () => Notifications.init());
