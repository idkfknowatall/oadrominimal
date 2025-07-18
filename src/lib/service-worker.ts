/**
 * @fileoverview Service Worker registration and management
 */

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    console.log('[SW] Registering service worker...');
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            console.log('[SW] New version available');
            
            // Optionally show update notification
            if (window.confirm('A new version is available. Reload to update?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    // Listen for controlling service worker changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed, reloading page');
      window.location.reload();
    });

    // Warm up cache on first load
    if (registration.active) {
      registration.active.postMessage({ type: 'CACHE_WARM' });
    }

    console.log('[SW] Service worker registered successfully');
    return true;
  } catch (error) {
    console.error('[SW] Service worker registration failed:', error);
    return false;
  }
}

export function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => {
      registration.unregister();
      console.log('[SW] Service worker unregistered');
    })
    .catch((error) => {
      console.error('[SW] Service worker unregistration failed:', error);
    });
}

// Check if app is running in standalone mode (PWA)
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

// Check if device is online
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

// Listen for online/offline events
export function setupNetworkListeners(
  onOnline?: () => void,
  onOffline?: () => void
) {
  if (typeof window === 'undefined') return;

  const handleOnline = () => {
    console.log('[Network] Back online');
    onOnline?.();
  };

  const handleOffline = () => {
    console.log('[Network] Gone offline');
    onOffline?.();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}