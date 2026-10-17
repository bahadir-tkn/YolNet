/**
 * YolNet Lite - Service Worker
 * Çevrimdışı Önbellek, Cache-First & Stale-While-Revalidate Mimarisi
 */

const CACHE_NAME = 'yolnet-cache-v1';

// Önceden önbelleğe alınacak statik kabuk varlıkları
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
];

// Service Worker Kurulumu (Install)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Service Worker Etkinleştirme (Activate) & Eski Önbellekleri Temizleme
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// İstek Yönetimi (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Harita Karoları, OSRM Rota ve Nominatim Arama Servisleri: Doğrudan Ağ (Network-Only)
  if (
    url.hostname.includes('arcgisonline.com') ||
    url.hostname.includes('project-osrm.org') ||
    url.hostname.includes('openstreetmap.org') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('yandex') ||
    event.request.method !== 'GET'
  ) {
    return; // Tarayıcının standart ağ isteğini yürüt
  }

  // 2. Tarife Verileri ve API İstekleri: Stale-While-Revalidate
  // Taksici tünelde veya internetin çekmediği yerde olsa bile son tarife anında gelsin
  if (
    url.pathname.includes('/tariffs') ||
    url.pathname.endsWith('.json') ||
    url.pathname.startsWith('/api/')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. Statik Varlıklar ve Sayfa İstekleri: Cache-First (Ağ Yedekli)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Yalnızca geçerli GET yanıtlarını önbelleğe al
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (event.request.destination === 'style' ||
              event.request.destination === 'script' ||
              event.request.destination === 'image' ||
              event.request.destination === 'font')
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Ağ yoksa ve ana sayfa isteniyorsa önbellekteki kök sayfayı döndür
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});
