// Service Worker para MAC Processor Pro
const CACHE_NAME = 'mac-processor-v4';
const OFFLINE_URL = 'offline.html';

// Archivos críticos para cache inmediato
const CRITICAL_FILES = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Archivos para cache en runtime
const RUNTIME_FILES = [
  // Aquí se cachearán dinámicamente
];

// Estrategia: Cache First para archivos críticos
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    console.log('[SW] 📦 Cache hit:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      console.log('[SW] 💾 Cached new:', request.url);
    }
    return response;
  } catch (error) {
    console.error('[SW] ❌ Cache first failed:', error);
    throw error;
  }
}

// Estrategia: Network First para HTML
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] 🔌 Network failed, using cache:', request.url);
      return cached;
    }
    throw error;
  }
}

// Instalación
self.addEventListener('install', event => {
  console.log('[SW] 📦 Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] 💾 Cacheando archivos críticos');
        return cache.addAll(CRITICAL_FILES);
      })
      .then(() => {
        console.log('[SW] ✅ Instalación completada');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] ❌ Error en instalación:', error);
      })
  );
});

// Activación
self.addEventListener('activate', event => {
  console.log('[SW] 🔄 Activando...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 🗑️ Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] ✅ Activación completada');
      return self.clients.claim();
    })
  );
});

// Fetch
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Solo manejar GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar otras extensiones/orígenes
  if (url.origin !== self.location.origin) return;
  
  // Para navegación (HTML), network first
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // Para recursos estáticos, cache first
  if (CRITICAL_FILES.some(file => url.pathname.endsWith(file.replace('./', '')))) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  
  // Para otros recursos, intentar red primero
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cachear respuestas exitosas
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback a cache
        return caches.match(event.request);
      })
  );
});

// Mensajes
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_INFO') {
    caches.open(CACHE_NAME)
      .then(cache => cache.keys())
      .then(keys => {
        event.ports[0].postMessage({
          type: 'CACHE_INFO',
          cacheName: CACHE_NAME,
          cacheSize: keys.length,
          files: keys.map(k => k.url)
        });
      });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[SW] 🧹 Cache limpiado');
    });
  }
});

// Sincronización en background
self.addEventListener('sync', event => {
  if (event.tag === 'sync-history') {
    console.log('[SW] 🔄 Sincronizando en background...');
    // Aquí podrías sincronizar con un servidor
  }
});

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'MAC Processor Pro',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || './'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'MAC Processor', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});    caches.match(e.request)
      .then(response => response || fetch(e.request))
      .catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('./offline.html');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});
