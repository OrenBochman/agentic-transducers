const CACHE_NAME = 'fsm-playground-v1'
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/src/main.js',
  '/src/styles.css',
  '/src/components/fsm-playground.js'
]

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)))
})

self.addEventListener('activate', (ev) => {
  ev.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (ev) => {
  ev.respondWith(caches.match(ev.request).then(r => r || fetch(ev.request)))
})
