/**
 * YolNet Lite - Service Worker Kaydedici
 * İstemci tarafında güvenli Service Worker yaşam döngüsü yönetimi
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Sayfa tamamen yüklendikten sonra service worker'ı kaydet
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[YolNet PWA] Service Worker başarıyla kaydedildi. Kapsam:', registration.scope);

        // Yeni sürüm kontrolü
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (
                installingWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                console.log('[YolNet PWA] Yeni sürüm mevcut, bir sonraki ziyarette aktif olacak.');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('[YolNet PWA] Service Worker kaydı başarısız:', error);
      });
  });
}
