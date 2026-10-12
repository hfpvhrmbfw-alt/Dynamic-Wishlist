/* Service Worker: App-Shell vorab laden, Cache-first mit Netzwerk-Fallback.
   __BUILD__ ersetzt der GitHub-Actions-Workflow beim Deploy durch den Commit-Hash,
   so entsteht pro Deploy ein neuer Cache und die App meldet "Neue Version verfügbar". */
const VERSION = 'wunschliste-__BUILD__';
const SHELL = [
  './', './index.html', './app.css', './app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png',
  './fonts/BricolageGrotesque-latin.woff2', './fonts/Nunito-latin.woff2', './fonts/Nunito-cyrillic.woff2',
  './fonts/SpaceMono-latin.woff2', './fonts/SpaceMono-latin-700.woff2'
];

self.addEventListener('install', e => {
  // Kein skipWaiting: die neue Version wartet, bis die App "Neu laden" auslöst.
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('wunschliste-') && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') { const shell = await cache.match('./index.html'); if (shell) return shell; }
      return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
