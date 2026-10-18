// Service worker do Statikos: deixa o app abrir sem internet depois da primeira visita.
// Estratégia: rede primeiro, com cópia no cache; sem rede (ou rede muito lenta), usa o cache.
// Assim cada nova publicação aparece na próxima abertura com internet.
// O app inteiro é um único index.html (vite-plugin-singlefile); as fontes do Google ficam em cache à parte.
const CACHE = 'statikos-v1';
const FONTS = 'statikos-fonts-v1';
const CORE = ['./', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png'];
const NAV_TIMEOUT_MS = 6000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    e.respondWith(networkFirst(req, req.mode === 'navigate' || url.pathname.endsWith('/index.html')));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(req));
  }
});

/** Página: guarda sempre sob a chave da raiz, para que "/", "/index.html" e "/?x" caiam no mesmo cache. */
async function networkFirst(req, isPage) {
  const cache = await caches.open(CACHE);
  const key = isPage ? new URL('./', self.registration.scope).href : req;
  const net = fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') cache.put(key, res.clone());
    return res;
  });
  net.catch(() => {}); // a falha é tratada abaixo; evita rejeição não tratada quando o cache já respondeu
  try {
    if (!isPage) return await net;
    // Rede lenta: depois do tempo limite, entrega o cache (se houver) e deixa a rede atualizar em segundo plano.
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));
    const first = await Promise.race([net, timeout]);
    if (first) return first;
    const hit = await cache.match(key);
    return hit ?? (await net);
  } catch {
    const hit = await cache.match(key, { ignoreSearch: true });
    if (hit) return hit;
    return Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req);
  const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit ?? (await net) ?? Response.error();
}
