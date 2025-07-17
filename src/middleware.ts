import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  '/api/radio-stream': { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  '/api/radio-meta': { limit: 60, windowMs: 60 * 1000 }, // 60 requests per minute
  '/api/song': { limit: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  default: { limit: 100, windowMs: 60 * 1000 } // 100 requests per minute for other routes
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
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback to localhost (NextRequest doesn't have ip property in newer versions)
  return '127.0.0.1';
}

export function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const clientId = getClientIdentifier(request);
  const { limit, windowMs } = getRateLimit(request.nextUrl.pathname);
  const key = `${clientId}:${request.nextUrl.pathname}`;

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 0, lastReset: Date.now() });
  }

  const clientData = rateLimitMap.get(key)!;
  const now = Date.now();

  // Reset counter if window has passed
  if (now - clientData.lastReset > windowMs) {
    clientData.count = 0;
    clientData.lastReset = now;
  }

  // Check if limit exceeded
  if (clientData.count >= limit) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((windowMs - (now - clientData.lastReset)) / 1000)} seconds.`,
        retryAfter: Math.ceil((windowMs - (now - clientData.lastReset)) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((windowMs - (now - clientData.lastReset)) / 1000).toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(clientData.lastReset + windowMs).toISOString()
        }
      }
    );
  }

  // Increment counter
  clientData.count++;

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', (limit - clientData.count).toString());
  response.headers.set('X-RateLimit-Reset', new Date(clientData.lastReset + windowMs).toISOString());

  return response;
}

export const config = {
  matcher: [
    '/api/:path*'
  ]
};
