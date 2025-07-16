import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory store for rate limiting.
// Note: In a serverless/multi-instance environment, this limit is per-instance.
// For a robust solution, an external store like Redis or a dedicated rate-limiting service is recommended.
const rateLimitData = new Map<string, { count: number; expiry: number }>();

// Global IP-based rate limiting (200 requests per hour per IP)
const globalRateLimitData = new Map<string, { count: number; expiry: number }>();
const GLOBAL_RATE_LIMIT = {
  limit: 200,
  window: 60 * 60 * 1000, // 1 hour
};

type RateLimitConfig = {
  [path: string]: {
    [method: string]: { limit: number; window: number }; // window in milliseconds
  };
};

// Simplified rate limiting for remaining endpoints
const RATE_LIMIT_CONFIG: RateLimitConfig = {
  // Radio stream endpoint - high frequency
  '/api/radio-stream': {
    GET: { limit: 1000, window: 60 * 1000 }, // Allow many concurrent connections
  },
  // Radio metadata endpoint
  '/api/radio-meta': {
    GET: { limit: 300, window: 60 * 1000 },
  },
  // Song endpoint
  '/api/song': {
    GET: { limit: 300, window: 60 * 1000 },
  },
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const now = Date.now();

  // Simplified monitoring - just console log for development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Middleware] ${method} ${pathname} from ${ip}`);
  }

  // Global IP-based rate limiting (100 requests per hour per IP)
  const globalKey = `global:${ip}`;
  const globalEntry = globalRateLimitData.get(globalKey);

  if (globalEntry && now < globalEntry.expiry) {
    if (globalEntry.count >= GLOBAL_RATE_LIMIT.limit) {
      // Log rate limit violation
      console.warn(`[Middleware] Global rate limit exceeded for IP ${ip}: ${globalEntry.count}/${GLOBAL_RATE_LIMIT.limit}`);

      return NextResponse.json(
        {
          error: {
            message: 'Rate limit exceeded. Too many requests from this IP.',
            code: 'RATE_LIMIT_EXCEEDED'
          }
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((globalEntry.expiry - now) / 1000).toString(),
            'X-RateLimit-Limit': GLOBAL_RATE_LIMIT.limit.toString(),
            'X-RateLimit-Remaining': Math.max(0, GLOBAL_RATE_LIMIT.limit - globalEntry.count).toString(),
            'X-RateLimit-Reset': new Date(globalEntry.expiry).toISOString(),
          }
        }
      );
    }
    globalRateLimitData.set(globalKey, { ...globalEntry, count: globalEntry.count + 1 });
  } else {
    globalRateLimitData.set(globalKey, { count: 1, expiry: now + GLOBAL_RATE_LIMIT.window });
  }

  // Path-specific rate limiting
  const pathConfigKey = Object.keys(RATE_LIMIT_CONFIG).find((p) =>
    pathname.startsWith(p)
  );
  
  if (pathConfigKey) {
    const methodConfig = RATE_LIMIT_CONFIG[pathConfigKey]?.[method];
    if (methodConfig) {
      const key = `${pathConfigKey}:${method}:${ip}`;
      const currentEntry = rateLimitData.get(key);

      if (currentEntry && now < currentEntry.expiry) {
        if (currentEntry.count >= methodConfig.limit) {
          // Log endpoint-specific rate limit violation
          console.warn(`[Middleware] Endpoint rate limit exceeded for ${pathConfigKey} ${method} from IP ${ip}: ${currentEntry.count}/${methodConfig.limit}`);

          return NextResponse.json(
            {
              error: {
                message: 'Rate limit exceeded for this endpoint.',
                code: 'ENDPOINT_RATE_LIMIT_EXCEEDED'
              }
            },
            {
              status: 429,
              headers: {
                'Retry-After': Math.ceil((currentEntry.expiry - now) / 1000).toString(),
                'X-RateLimit-Limit': methodConfig.limit.toString(),
                'X-RateLimit-Remaining': Math.max(0, methodConfig.limit - currentEntry.count).toString(),
                'X-RateLimit-Reset': new Date(currentEntry.expiry).toISOString(),
              }
            }
          );
        }
        rateLimitData.set(key, { ...currentEntry, count: currentEntry.count + 1 });
      } else {
        rateLimitData.set(key, { count: 1, expiry: now + methodConfig.window });
      }
    }
  }

  // Create response with security headers
  const response = NextResponse.next();
  
  // Security Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Allow HTTP connections to localhost in development mode
  let connectSrc = "'self' https: wss: ws:";
  if (isDevelopment) {
    connectSrc = "'self' https: wss: ws: http://localhost:* http://127.0.0.1:*";
  }
  
  // Frame sources for embedded content
  let frameSrc = "'self' https://www.google.com";
  if (isDevelopment) {
    frameSrc = "'self' https://www.google.com http://localhost:* http://127.0.0.1:*";
  }
  
  
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https: blob:",
    `connect-src ${connectSrc}`,
    `frame-src ${frameSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  
  // CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://radio.oadro.com' : '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  return response;
}

// Matcher to specify which paths the middleware should run on.
export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
