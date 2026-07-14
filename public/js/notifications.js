// Push notifications + Notification Center integration
const Notifications = {
  socket: null,
  swRegistration: null,
  vapidPublicKey: null,

  async init() {
    if (this.socket) return;

    // Socket.IO
    this.socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    this.socket.on('connect', () => console.log('[SOCKET] OK'));
    this.socket.on('notification', (data) => {
      NC.add(data.type, data.title, data.message, data.url);
    });

    // Service Worker
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('[SW] OK');
      } catch (e) { console.error('[SW]', e); }
    }

    // VAPID key
    try {
      const res = await fetch('/api/push/vapid-public-key');
      const data = await res.json();
      this.vapidPublicKey = data.publicKey;
    } catch {}

    // Init notification center
    NC.init();
    this.updateButton();
  },

  async requestPermission() {
    const user = this.getCurrentUser();
    if (!user) { showToast('Faça login primeiro', 'error'); return; }
    if (!this.swRegistration) { showToast('Service Worker não disponível', 'error'); return; }
    if (!this.vapidPublicKey) { showToast('Push não configurado', 'error'); return; }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { showToast('Permissão negada', 'error'); return; }

      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      const sub = subscription.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('nexus_access_token') },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys })
      });

      if (res.ok) {
        showToast('Notificações ativadas!', 'success');
        NC.add('info', 'Notificações Ativadas', 'Você receberá alertas em tempo real sobre vendas, leads e comissões.', '/');
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao ativar', 'error');
      }
      this.updateButton();
    } catch (e) { showToast('Erro: ' + e.message, 'error'); }
  },

  async unsubscribe() {
    const user = this.getCurrentUser();
    if (!user) return;
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('nexus_access_token') },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }
      showToast('Notificações desativadas', 'info');
      this.updateButton();
    } catch (e) { console.error('[PUSH]', e); }
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
        NC.add('lead', 'Teste de Notificação', 'As notificações estão funcionando perfeitamente!', '/');
      } else {
        showToast(data.error || 'Erro ao enviar', 'error');
      }
    } catch (e) { showToast('Erro: ' + e.message, 'error'); }
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
  }
};

document.addEventListener('DOMContentLoaded', () => Notifications.init());
