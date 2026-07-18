// MarketBrief Service Worker — Offline-Support (Punkt 8)
// Strategie:
//  - HTML: NETWORK-FIRST (damit ?v=… Cache-Busting & GitHub-Pages-Updates funktionieren),
//    Fallback auf Cache nur wenn offline.
//  - Fonts/statische Assets: CACHE-FIRST (ändern sich nie).
//  - API-Calls (Finnhub, CoinGecko, Twelve Data, Anthropic-Proxy): NIE cachen —
//    der Offline-Fallback dafür passiert in der App selbst (localStorage).

const CACHE_NAME = 'mb-shell-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API-Domains niemals anfassen
  const apiHosts = ['finnhub.io', 'api.coingecko.com', 'api.twelvedata.com', 'workers.dev'];
  if (apiHosts.some(h => url.hostname.includes(h))) return;

  // HTML: Network-first mit Cache-Fallback
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }

  // Fonts & statische Assets: Cache-first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
        return res;
      }))
    );
  }
});
