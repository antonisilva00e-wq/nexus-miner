// Nexus Miner Service Worker v10
const SW_VERSION = '10.0';
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

// Fetch — network first, no caching (always fresh)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  // Always go to network
  event.respondWith(fetch(event.request));
});

// Push received
self.addEventListener('push', (event) => {
  let data = { heading: 'Venda concluída', body: 'Nova notificação', type: 'info' };
  if (event.data) {
    try { data = event.data.json(); } catch { data.body = event.data.text(); }
  }

  // Remove emojis do corpo da mensagem
  const removeEmoji = (str = '') => str.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();

  // heading = titulo em negrito (ex: "Venda concluída")
  // body    = detalhe menor   (ex: "R$ 297,00")
  // O nome "Nexus Miner" aparece automaticamente pelo PWA — NAO duplicar aqui
  const heading = removeEmoji(data.heading || data.title || 'Nova notificação');
  const body    = removeEmoji(data.body    || data.message || '');

  event.waitUntil(
    self.registration.showNotification(heading, {
      body,
      icon: '/assets/logo.png',
      badge: '/assets/logo.png',
      vibrate: [200, 100, 200],
      tag: `nexus-${data.type || 'info'}`,
      renotify: true,
      requireInteraction: data.type === 'sale',
      silent: false,
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
