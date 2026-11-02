// Guarda o jogo no aparelho para funcionar sem internet.
// Com internet, sempre busca a versão mais nova (e atualiza a cópia guardada).
const CACHE = 'cobrinha-v7';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './pixel.js',
  './audio.js',
  './story.js',
  './game.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // fontes do Google: usa a cópia guardada (elas não mudam)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  // só cuida dos arquivos deste jogo: outros jogos publicados em subpastas do mesmo site ficam de fora
  const rel = url.href.slice(self.registration.scope.length).split('?')[0];
  if (rel.indexOf('/') >= 0 && rel.indexOf('icons/') !== 0) return;

  // arquivos do jogo: tenta a internet primeiro; sem conexão, usa a cópia guardada
  // "no-cache" faz o navegador sempre conferir com o servidor se o arquivo mudou
  const fresh = req.mode === 'navigate' ? req : new Request(req, { cache: 'no-cache' });
  e.respondWith(
    fetch(fresh)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))),
  );
});
