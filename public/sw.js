// Nexus Miner Service Worker — Premium Push Notifications
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = { title: 'Nexus Miner', message: 'Nova notificação', type: 'info' };
  if (event.data) {
    try { data = event.data.json(); } catch { data.message = event.data.text(); }
  }

  const styles = {
    sale: { color: '#10b981', icon: '💰', tag: 'sale' },
    commission: { color: '#8b5cf6', icon: '🏆', tag: 'commission' },
    lead: { color: '#3b82f6', icon: '🎯', tag: 'lead' },
    info: { color: '#6366f1', icon: 'ℹ️', tag: 'info' }
  };
  const s = styles[data.type] || styles.info;

  const options = {
    body: data.message,
    icon: '/assets/icon-192.svg',
    badge: '/assets/icon-192.svg',
    image: data.image || null,
    vibrate: [100, 50, 100],
    tag: `nexus-${s.tag}-${Date.now()}`,
    renotify: true,
    requireInteraction: data.type === 'sale',
    silent: false,
    data: { url: data.url || '/', type: data.type },
    actions: [
      { action: 'open', title: 'Abrir Painel', icon: '/assets/icon-192.svg' },
      { action: 'dismiss', title: 'Dispensar' }
    ],
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(`${s.icon} ${data.title}`, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
