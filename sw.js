// Offline support: cache the app so it works on the iPad without internet.
// Bump VERSION whenever you change any file so the iPad picks up the update.
const VERSION = 'ollies-tree-v7';
const APP_FILES = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/speech.js',
  'js/sound.js',
  'js/store.js',
  'js/ui.js',
  'js/math.js',
  'js/reading.js',
  'js/words.js',
  'js/explore.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  // recorded letter sounds
  ...'abcdefghijklmnopqrstuvwxyz'.split('').map(l => `audio/sounds/${l}.wav`),
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: serve from cache, refresh in the background.
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // App files: network first (so updates arrive), falling back to cache when offline.
  // 'no-cache' makes the browser check with the server instead of reusing a stale copy.
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(r => {
        if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone()));
        return r;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))),
  );
});
