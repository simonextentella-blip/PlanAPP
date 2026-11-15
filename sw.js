// Service worker minimo: rende l'app installabile e la fa aprire anche senza rete.
// Strategia: prima la rete (così ogni aggiornamento arriva subito), la copia salvata solo se offline.
const CACHE = 'planapp-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match(self.registration.scope) : undefined))
      )
  );
});

// Notifiche dei sopralluoghi (mandate ogni mattina dalla funzione Supabase "planapp-notifiche").
self.addEventListener('push', (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch (e) {
    msg = { body: event.data ? event.data.text() : '' };
  }
  const scope = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(msg.title || 'PlanApp', {
      body: msg.body || '',
      icon: scope + 'icon-192.png',
      badge: scope + 'icon-192.png',
      tag: msg.tag || 'planapp',
      data: { url: scope + 'sopralluoghi' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
          if ('navigate' in c) c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
