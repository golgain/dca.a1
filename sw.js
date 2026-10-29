const V = 'rx-pro-final-3';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const FA = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/';
const CDN = [
  'https://cdn.tailwindcss.com',
  FA + 'css/all.min.css',
  FA + 'webfonts/fa-solid-900.woff2',
  FA + 'webfonts/fa-brands-400.woff2'
];
const GF = 'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap';

async function grab(cache, url) {
  let res;
  try { res = await fetch(url, { mode: 'cors' }); }
  catch (e) { try { res = await fetch(url, { mode: 'no-cors' }); } catch (_) { return null; } }
  if (res && (res.ok || res.type === 'opaque')) { await cache.put(url, res.clone()); return res; }
  return null;
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.allSettled(CORE.map(u => grab(c, u)));
    await Promise.allSettled(CDN.map(u => grab(c, u)));
    try {
      const r = await grab(c, GF);
      if (r) {
        const css = await r.clone().text();
        const urls = [...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
        await Promise.allSettled(urls.map(u => grab(c, u)));
      }
    } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Stale-while-revalidate: instant offline loads, silent updates when online
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith('http')) return;
  e.respondWith((async () => {
    const c = await caches.open(V);
    const hit = await c.match(r, { ignoreSearch: r.mode === 'navigate' });
    const net = fetch(r).then(res => {
      if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (r.mode === 'navigate') return (await c.match('index.html')) || (await c.match('./')) || Response.error();
    return Response.error();
  })());
});
               
