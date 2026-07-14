// Nexus Miner Service Worker — Push Notifications + Offline
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Push received
self.addEventListener('push', (event) => {
  let data = { title: 'Nexus Miner', message: 'Nova notificação' };
  if (event.data) {
    try { data = event.data.json(); } catch { data.message = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: '/assets/icon-192.svg',
      badge: '/assets/icon-192.svg',
      vibrate: [200, 100, 200],
      tag: 'nexus-' + Date.now(),
      renotify: true,
      data: data.url || '/'
    })
  );
});

// Notification click — open/focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
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
