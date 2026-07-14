// Nexus Miner Service Worker v2 — Premium Push Notifications
const SW_VERSION = '2.0';
const CACHE_NAME = `nexus-v${SW_VERSION}`;

// Install — skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate — claim all clients and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Push received
self.addEventListener('push', (event) => {
  let data = { title: 'Nexus Miner', message: 'Nova notificação', type: 'info' };
  if (event.data) {
    try { data = event.data.json(); } catch { data.message = event.data.text(); }
  }

  const styles = {
    sale: { icon: '💰', tag: 'sale' },
    commission: { icon: '🏆', tag: 'commission' },
    lead: { icon: '🎯', tag: 'lead' },
    info: { icon: 'ℹ️', tag: 'info' }
  };
  const s = styles[data.type] || styles.info;

  event.waitUntil(
    self.registration.showNotification(`${s.icon} ${data.title}`, {
      body: data.message,
      icon: '/assets/icon-192.svg',
      badge: '/assets/icon-192.svg',
      vibrate: [100, 50, 100],
      tag: `nexus-${s.tag}-${Date.now()}`,
      renotify: true,
      requireInteraction: data.type === 'sale',
      data: { url: data.url || '/', type: data.type },
      actions: [
        { action: 'open', title: 'Abrir Painel' },
        { action: 'dismiss', title: 'Dispensar' }
      ],
      timestamp: Date.now()
    })
  );
});

// Notification click
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
