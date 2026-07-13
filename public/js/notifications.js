// Real-time notifications via Socket.IO + Sonner toasts + OneSignal Push
const Notifications = {
  socket: null,
  onesignalReady: false,
  playerId: null,

  init() {
    if (this.socket) return;

    // Socket.IO for real-time
    this.socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('[SOCKET] Conectado:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('[SOCKET] Desconectado');
    });

    this.socket.on('notification', (data) => {
      this.show(data);
    });

    // Initialize OneSignal after a small delay to ensure SDK is loaded
    setTimeout(() => this.initOneSignal(), 1000);
  },

  async initOneSignal() {
    try {
      if (typeof OneSignal === 'undefined') {
        console.log('[PUSH] OneSignal SDK não carregado — CDN pode estar bloqueado');
        return;
      }

      // Check if HTTPS (required for push)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.log('[PUSH] HTTPS necessário para push notifications');
        return;
      }

      // Fetch App ID from server
      const res = await fetch('/api/config');
      const config = await res.json();
      const appId = config.onesignalAppId;

      if (!appId) {
        console.log('[PUSH] OneSignal App ID não configurado');
        return;
      }

      await OneSignal.init({
        appId: appId,
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
        welcomeNotification: { disable: true },
        serviceWorkerPath: '/sw.js',
        serviceWorkerParam: { scope: '/' }
      });

      this.onesignalReady = true;
      console.log('[PUSH] OneSignal inicializado com sucesso');

      // Check subscription status
      const isPushSupported = OneSignal.Notifications.isPushSupported();
      const isPushEnabled = await OneSignal.Notifications.isPushPermissionGranted();
      console.log('[PUSH] Push suportado:', isPushSupported, '| Permissão:', isPushEnabled);

      // Update button state
      this.updateButtonState();
    } catch (err) {
      console.error('[PUSH] OneSignal erro:', err.message || err);
    }
  },

  async requestPermission() {
    if (!this.onesignalReady) {
      showToast('Serviço de notificação não disponível. Aguarde o carregamento.', 'error');
      return;
    }

    const user = this.getCurrentUser();
    if (!user) {
      showToast('Faça login para ativar notificações', 'error');
      return;
    }

    try {
      // Request browser permission
      const permission = await OneSignal.Notifications.requestPermission();
      console.log('[PUSH] Permissão:', permission);

      if (permission === 'granted') {
        // Get the subscription ID
        const subscriptionId = await this.getSubscriptionId();
        if (subscriptionId) {
          await this.registerToken(user.id, subscriptionId);
          showToast('Notificações ativadas!', 'success');
        } else {
          showToast('Aguardando ativação... Tente novamente em alguns segundos.', 'info');
        }
      } else {
        showToast('Permissão negada pelo navegador', 'error');
      }
    } catch (err) {
      console.error('[PUSH] Erro permissão:', err);
      showToast('Erro ao ativar notificações: ' + err.message, 'error');
    }
  },

  async getSubscriptionId() {
    try {
      // Try multiple methods to get subscription ID
      if (OneSignal.User && OneSignal.User.pushSubscription) {
        const sub = OneSignal.User.pushSubscription;
        if (sub.getSubscriptionId) return await sub.getSubscriptionId();
        if (sub.id) return sub.id;
      }
      if (OneSignal.User && OneSignal.User.onesignalId) {
        return await OneSignal.User.onesignalId();
      }
      // Fallback: wait and retry
      await new Promise(r => setTimeout(r, 2000));
      if (OneSignal.User && OneSignal.User.pushSubscription) {
        return await OneSignal.User.pushSubscription.getSubscriptionId();
      }
    } catch (e) {
      console.error('[PUSH] Erro getSubscriptionId:', e);
    }
    return null;
  },

  async registerToken(userId, subscriptionId) {
    try {
      await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('nexus_access_token')
        },
        body: JSON.stringify({
          playerId: subscriptionId,
          platform: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'web'
        })
      });
      console.log('[PUSH] Token registrado:', subscriptionId);
    } catch (err) {
      console.error('[PUSH] Erro registro:', err);
    }
  },

  async unsubscribe() {
    try {
      const subscriptionId = await this.getSubscriptionId();
      if (subscriptionId) {
        await fetch('/api/push/unregister', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('nexus_access_token')
          },
          body: JSON.stringify({ playerId: subscriptionId })
        });
      }
      OneSignal.User.pushSubscription.optOut();
      showToast('Notificações desativadas', 'info');
      this.updateButtonState();
    } catch (err) {
      console.error('[PUSH] Erro unsubscribe:', err);
    }
  },

  async updateButtonState() {
    const btn = document.getElementById('btn-push-notifications');
    if (!btn) return;

    try {
      const isPushEnabled = await OneSignal.Notifications.isPushPermissionGranted();
      if (isPushEnabled) {
        btn.innerHTML = '<i data-lucide="bell-off"></i><span>Desativar Notificações</span>';
        btn.classList.add('active');
      } else {
        btn.innerHTML = '<i data-lucide="bell"></i><span>Ativar Notificações</span>';
        btn.classList.remove('active');
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch {}
  },

  getCurrentUser() {
    try {
      const token = localStorage.getItem('nexus_access_token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.userId, role: payload.role };
    } catch { return null; }
  },

  show({ type, title, message, timestamp }) {
    const toastConfig = this.getToastConfig(type);

    sonner.toast(message, {
      title: title,
      icon: toastConfig.icon,
      style: {
        background: toastConfig.bg,
        color: '#fff',
        border: `1px solid ${toastConfig.border}`,
        borderRadius: '12px',
        padding: '16px 20px',
        fontSize: '14px',
        boxShadow: `0 8px 32px ${toastConfig.shadow}`
      },
      duration: 6000,
      position: 'top-right'
    });
  },

  getToastConfig(type) {
    const configs = {
      sale: {
        icon: '💰',
        bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: '#34d399',
        shadow: 'rgba(16, 185, 129, 0.3)'
      },
      commission: {
        icon: '🏆',
        bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        border: '#a78bfa',
        shadow: 'rgba(139, 92, 246, 0.3)'
      },
      lead: {
        icon: '🎯',
        bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        border: '#60a5fa',
        shadow: 'rgba(59, 130, 246, 0.3)'
      },
      info: {
        icon: 'ℹ️',
        bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        border: '#818cf8',
        shadow: 'rgba(99, 102, 241, 0.3)'
      }
    };
    return configs[type] || configs.info;
  },

  test() {
    this.show({
      type: 'sale',
      title: 'Nova Venda!',
      message: 'Empresa ABC — R$ 2.500,00'
    });
  }
};

// Auto-init on page load
document.addEventListener('DOMContentLoaded', () => {
  Notifications.init();
});
