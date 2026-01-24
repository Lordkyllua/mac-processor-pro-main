// Service Worker básico y funcional
const CACHE_NAME = 'mac-processor-v1';

// Instalar
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(self.skipWaiting());
});

// Activar
self.addEventListener('activate', event => {
  console.log('[SW] Activando...');
  event.waitUntil(self.clients.claim());
});

// Fetch - Estrategia simple
self.addEventListener('fetch', event => {
  // Solo manejar nuestra app
  if (!event.request.url.includes('mac-processor-pro')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // Si falla, intentar servir desde cache
        return caches.match(event.request)
          .then(response => response || new Response('Offline', { status: 503 }));
      })
  );
});
