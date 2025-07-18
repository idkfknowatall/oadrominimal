/**
 * Service Worker for OADRO Radio - Optimized for performance and offline capability
 */

const CACHE_NAME = 'oadro-radio-v1';
const STATIC_CACHE_NAME = 'oadro-static-v1';
const API_CACHE_NAME = 'oadro-api-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/chunks/',
];

// API endpoints to cache with different strategies
const API_ENDPOINTS = {
  nowPlaying: /\/api\/nowplaying\//,
  station: /\/api\/station\//,
  radioStream: /\/api\/radio-stream/,
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS.filter(url => !url.endsWith('/')));
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME && 
                cacheName !== API_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - cache first with long TTL
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else if (API_ENDPOINTS.nowPlaying.test(url.pathname)) {
    // Now playing API - network first with short cache
    event.respondWith(networkFirstWithTimeout(request, API_CACHE_NAME, 3000));
  } else if (API_ENDPOINTS.station.test(url.pathname)) {
    // Station info - cache first with medium TTL
    event.respondWith(cacheFirst(request, API_CACHE_NAME));
  } else if (API_ENDPOINTS.radioStream.test(url.pathname)) {
    // Radio stream - always network (don't cache audio streams)
    event.respondWith(fetch(request));
  } else if (url.origin === self.location.origin) {
    // Same origin requests - stale while revalidate
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
  }
});

// Cache first strategy - for static assets
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network first with timeout - for critical API calls
async function networkFirstWithTimeout(request, cacheName, timeout = 5000) {
  try {
    const cache = await caches.open(cacheName);
    
    // Race network request against timeout
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout')), timeout)
    );
    
    try {
      const networkResponse = await Promise.race([networkPromise, timeoutPromise]);
      
      if (networkResponse.ok) {
        // Cache successful responses with short TTL
        const responseClone = networkResponse.clone();
        cache.put(request, responseClone);
      }
      
      return networkResponse;
    } catch (networkError) {
      // Network failed or timed out, try cache
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        console.log('[SW] Serving from cache due to network failure');
        return cachedResponse;
      }
      
      throw networkError;
    }
  } catch (error) {
    console.error('[SW] Network first failed:', error);
    return new Response(JSON.stringify({ 
      error: 'Service temporarily unavailable',
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale while revalidate - for HTML pages
async function staleWhileRevalidate(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // Always try to fetch from network in background
    const networkPromise = fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);
    
    // Return cached version immediately if available
    if (cachedResponse) {
      // Update cache in background
      networkPromise;
      return cachedResponse;
    }
    
    // No cache, wait for network
    const networkResponse = await networkPromise;
    return networkResponse || new Response('Offline', { status: 503 });
  } catch (error) {
    console.error('[SW] Stale while revalidate failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sync any pending data when back online
    console.log('[SW] Background sync triggered');
    
    // Clear old API cache entries
    const apiCache = await caches.open(API_CACHE_NAME);
    const requests = await apiCache.keys();
    
    // Remove entries older than 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    for (const request of requests) {
      const response = await apiCache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        if (dateHeader && new Date(dateHeader).getTime() < fiveMinutesAgo) {
          await apiCache.delete(request);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_WARM') {
    // Warm up cache with critical resources
    event.waitUntil(warmUpCache());
  }
});

async function warmUpCache() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    
    // Pre-cache critical API endpoints
    const criticalUrls = [
      '/api/nowplaying/oadro',
      '/api/station/oadro'
    ];
    
    await Promise.all(
      criticalUrls.map(url => 
        fetch(url).then(response => {
          if (response.ok) {
            cache.put(url, response.clone());
          }
        }).catch(() => {})
      )
    );
    
    console.log('[SW] Cache warmed up');
  } catch (error) {
    console.error('[SW] Cache warm up failed:', error);
  }
}