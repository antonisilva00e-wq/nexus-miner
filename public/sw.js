// Nexus Miner Service Worker v6 — Cache bust
const SW_VERSION = '6.8';
const CACHE_NAME = `nexus-v${SW_VERSION}`;

// Install — skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate — claim all clients and clean ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Push received
self.addEventListener('push', (event) => {
  let data = { title: 'Nexus Miner', message: 'Nova notificação', type: 'info' };
  if (event.data) {
    try { data = event.data.json(); } catch { data.message = event.data.text(); }
  }

  // Remove emojis from the message just in case
  const cleanMessage = data.message.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim();

  event.waitUntil(
    self.registration.showNotification('Nexus Miner', {
      body: cleanMessage,
      icon: '/assets/logo.png',
      badge: '/assets/logo.png',
      vibrate: [100, 50, 100],
      tag: `nexus-${data.type || 'info'}-${Date.now()}`,
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
