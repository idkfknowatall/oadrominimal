/**
 * Enhanced Service Worker with advanced caching strategies and offline support
 */

const CACHE_NAME = 'oadro-radio-v1.0.0';
const STATIC_CACHE = 'oadro-static-v1.0.0';
const DYNAMIC_CACHE = 'oadro-dynamic-v1.0.0';
const API_CACHE = 'oadro-api-v1.0.0';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  // Add critical CSS and JS files here
];

// API endpoints to cache with different strategies
const API_ENDPOINTS = {
  '/api/health': 'networkFirst',
  '/api/radio-meta': 'staleWhileRevalidate',
  '/api/schedule': 'cacheFirst',
  '/api/song': 'networkFirst'
};

// Cache strategies
const CACHE_STRATEGIES = {
  cacheFirst: 'cacheFirst',
  networkFirst: 'networkFirst',
  staleWhileRevalidate: 'staleWhileRevalidate',
  networkOnly: 'networkOnly',
  cacheOnly: 'cacheOnly'
};

// Utility functions
const isNavigationRequest = (request) => {
  return request.mode === 'navigate';
};

const isStaticAsset = (url) => {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/);
};

const isAPIRequest = (url) => {
  return url.pathname.startsWith('/api/');
};

const getFromCache = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  return await cache.match(request);
};

const addToCache = async (request, response, cacheName) => {
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
};

// Cache strategies implementation
const cacheFirst = async (request, cacheName) => {
  const cachedResponse = await getFromCache(request, cacheName);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await addToCache(request, networkResponse, cacheName);
    }
    return networkResponse;
  } catch (error) {
    console.warn('Network request failed:', error);
    throw error;
  }
};

const networkFirst = async (request, cacheName, timeout = 3000) => {
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      )
    ]);
    
    if (networkResponse.ok) {
      await addToCache(request, networkResponse, cacheName);
    }
    return networkResponse;
  } catch (error) {
    console.warn('Network request failed, trying cache:', error);
    const cachedResponse = await getFromCache(request, cacheName);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
};

const staleWhileRevalidate = async (request, cacheName) => {
  const cachedResponse = await getFromCache(request, cacheName);
  
  // Always try to fetch from network in background
  const networkResponsePromise = fetch(request).then(response => {
    if (response.ok) {
      addToCache(request, response, cacheName);
    }
    return response;
  }).catch(error => {
    console.warn('Background fetch failed:', error);
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If no cached response, wait for network
  return await networkResponsePromise;
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    (async () => {
      try {
        const staticCache = await caches.open(STATIC_CACHE);
        await staticCache.addAll(STATIC_ASSETS);
        console.log('[SW] Static assets cached');
        
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Failed to cache static assets:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name !== STATIC_CACHE && 
          name !== DYNAMIC_CACHE && 
          name !== API_CACHE &&
          name !== CACHE_NAME
        );
        
        await Promise.all(
          oldCaches.map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
        );
        
        // Take control of all clients
        await self.clients.claim();
        console.log('[SW] Service worker activated');
      } catch (error) {
        console.error('[SW] Failed to activate service worker:', error);
      }
    })()
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // Handle navigation requests
        if (isNavigationRequest(request)) {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              const dynamicCache = await caches.open(DYNAMIC_CACHE);
              await dynamicCache.put(request, networkResponse.clone());
            }
            return networkResponse;
          } catch (error) {
            console.warn('[SW] Navigation request failed, serving offline page:', error);
            const offlineResponse = await getFromCache('/offline', STATIC_CACHE);
            return offlineResponse || new Response('Offline', { status: 503 });
          }
        }
        
        // Handle API requests
        if (isAPIRequest(url)) {
          const endpoint = Object.keys(API_ENDPOINTS).find(ep => 
            url.pathname.startsWith(ep)
          );
          
          if (endpoint) {
            const strategy = API_ENDPOINTS[endpoint];
            
            switch (strategy) {
              case 'cacheFirst':
                return await cacheFirst(request, API_CACHE);
              case 'networkFirst':
                return await networkFirst(request, API_CACHE);
              case 'staleWhileRevalidate':
                return await staleWhileRevalidate(request, API_CACHE);
              default:
                return await fetch(request);
            }
          }
          
          // Default API strategy
          return await networkFirst(request, API_CACHE);
        }
        
        // Handle static assets
        if (isStaticAsset(url)) {
          return await cacheFirst(request, STATIC_CACHE);
        }
        
        // Handle other requests with stale-while-revalidate
        return await staleWhileRevalidate(request, DYNAMIC_CACHE);
        
      } catch (error) {
        console.error('[SW] Fetch error:', error);
        
        // Return offline fallback for navigation requests
        if (isNavigationRequest(request)) {
          const offlineResponse = await getFromCache('/offline', STATIC_CACHE);
          return offlineResponse || new Response('Offline', { status: 503 });
        }
        
        // Return cached version if available
        const cachedResponse = await getFromCache(request, DYNAMIC_CACHE) ||
                             await getFromCache(request, STATIC_CACHE) ||
                             await getFromCache(request, API_CACHE);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Return error response
        return new Response('Network error', { status: 503 });
      }
    })()
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-requests') {
    event.waitUntil(syncRequests());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'New song playing on OADRO Radio!',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Open Radio',
        icon: '/android-chrome-192x192.png'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.data = { ...options.data, ...data };
    } catch (error) {
      console.warn('[SW] Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('OADRO Radio', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Sync offline requests when back online
async function syncRequests() {
  try {
    // Get offline requests from IndexedDB or localStorage
    // This would sync any requests made while offline
    console.log('[SW] Syncing offline requests');
  } catch (error) {
    console.error('[SW] Failed to sync requests:', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});