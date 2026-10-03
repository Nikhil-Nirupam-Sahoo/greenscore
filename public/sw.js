const CACHE = 'greenscore-v1'
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/login', '/log', '/manifest.json', '/icon.svg'])))
})
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return // POSTs are queued in IndexedDB by the app, not cached
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copy = r.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy))
        return r
      })
      .catch(() => caches.match(e.request).then((m) => m || caches.match('/log'))),
  )
})
