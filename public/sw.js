// Nexus Miner Service Worker — Push Notifications + Offline
const CACHE_NAME = 'nexus-miner-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/dashboard.css',
  '/css/kanban.css',
  '/css/responsive.css',
  '/css/animations.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/notifications.js',
  '/assets/logo.svg'
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return; // never cache API
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push — receive push from OneSignal/FCM
self.addEventListener('push', (event) => {
  let data = { title: 'Nexus Miner', body: 'Nova notificação' };
  if (event.data) {
    try { data = event.data.json(); } catch { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'nexus-notification',
      renotify: true,
      data: data.url || '/',
      actions: data.actions || []
    })
  );
});

// Notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
