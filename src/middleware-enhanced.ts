import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimiter } from '@/lib/rate-limiter';
import { apiLogger } from '@/lib/logger';

// Rate limiting configuration with different tiers
const RATE_LIMITS = {
  '/api/radio-stream': { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute for SSE
  '/api/radio-meta': { limit: 120, windowMs: 60 * 1000 }, // 120 requests per minute
  '/api/song': { limit: 60, windowMs: 60 * 1000 }, // 60 requests per minute
  '/api/schedule': { limit: 40, windowMs: 60 * 1000 }, // 40 requests per minute
  '/api/requests': { limit: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  '/api/health': { limit: 200, windowMs: 60 * 1000 }, // 200 requests per minute for health checks
  default: { limit: 150, windowMs: 60 * 1000 } // 150 requests per minute for other routes
};

function getRateLimit(pathname: string) {
  for (const [route, config] of Object.entries(RATE_LIMITS)) {
    if (route !== 'default' && pathname.startsWith(route)) {
      return config;
    }
  }
  return RATE_LIMITS.default;
}

function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for production behind proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  if (forwarded) {
    const firstIp = forwarded.split(',')[0];
    return firstIp ? firstIp.trim() : forwarded;
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback to a combination of headers for better identification
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  
  // Create a hash-like identifier from available headers
  const identifier = `${userAgent.slice(0, 50)}-${acceptLanguage.slice(0, 20)}`;
  return Buffer.from(identifier).toString('base64').slice(0, 32);
}

function isHealthCheckPath(pathname: string): boolean {
  const healthPaths = ['/api/health', '/api/ping', '/health', '/ping'];
  return healthPaths.some(path => pathname.startsWith(path));
}

function isStaticAsset(pathname: string): boolean {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) || pathname.startsWith('/_next/static/');
}

export async function enhancedMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static assets and health checks in development
  if (process.env.NODE_ENV === 'development' && (isStaticAsset(pathname) || isHealthCheckPath(pathname))) {
    return NextResponse.next();
  }
  
  // Only apply rate limiting to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const clientId = getClientIdentifier(request);
  const { limit, windowMs } = getRateLimit(pathname);
  
  try {
    const result = await rateLimiter.checkLimit(clientId, pathname, { limit, windowMs });
    
    // Log rate limiting events
    if (!result.allowed) {
      apiLogger.warn('Rate limit exceeded', {
        clientId: clientId.slice(0, 8) + '...',
        pathname,
        limit,
        remaining: result.remaining,
        retryAfter: result.retryAfter
      });
    }
    
    // Add rate limit headers to all responses
    const response = result.allowed ? NextResponse.next() : new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
        limit,
        remaining: result.remaining
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.resetTime.toISOString());
    
    if (result.retryAfter) {
      response.headers.set('Retry-After', result.retryAfter.toString());
    }
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // CORS headers for API routes
    if (pathname.startsWith('/api/')) {
      const origin = request.headers.get('origin');
      const allowedOrigins = process.env.NODE_ENV === 'development' 
        ? ['http://localhost:3000', 'http://127.0.0.1:3000']
        : ['https://radio.oadro.com', 'https://oadro.com'];
      
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }
      
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    }
    
    return response;
    
  } catch (error) {
    // Log error but don't block request if rate limiting fails
    apiLogger.error('Rate limiting error', error instanceof Error ? error : new Error('Unknown rate limiting error'), {
      clientId: clientId.slice(0, 8) + '...',
      pathname
    });
    
    // Fail open - allow request if rate limiting fails
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Error', 'true');
    return response;
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
};