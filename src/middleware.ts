/**
 * Enhanced middleware with comprehensive security and rate limiting
 * Implements industry best practices for API protection and security headers
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Enhanced in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; lastReset: number; blocked?: number }>();

// Comprehensive rate limiting configuration
const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  '/api/auth/discord/login': { limit: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  '/api/auth/discord/logout': { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  '/api/auth/callback': { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  '/api/auth/user': { limit: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  
  // Streaming endpoints - moderate limits
  '/api/radio-stream': { limit: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  '/api/radio-meta': { limit: 120, windowMs: 60 * 1000 }, // 120 requests per minute
  '/api/song': { limit: 60, windowMs: 60 * 1000 }, // 60 requests per minute
  
  // General API - standard limits
  '/api/health': { limit: 60, windowMs: 60 * 1000 }, // 60 requests per minute
  '/api/schedule': { limit: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  '/api/requests': { limit: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  
  // Default fallback
  default: { limit: 100, windowMs: 60 * 1000 } // 100 requests per minute for other routes
};

// Security headers configuration
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
} as const;

// Content Security Policy
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline and unsafe-eval
  "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
  "img-src 'self' data: https://cdn.discordapp.com https://placehold.co https://radio.oadro.com",
  "font-src 'self' data:",
  "connect-src 'self' https://discord.com https://radio.oadro.com wss: ws:",
  "media-src 'self' https://radio.oadro.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

/**
 * Gets the appropriate rate limit configuration for a pathname
 */
function getRateLimit(pathname: string) {
  // Check for exact matches first
  if (pathname in RATE_LIMITS) {
    return RATE_LIMITS[pathname as keyof typeof RATE_LIMITS];
  }
  
  // Check for prefix matches
  for (const [route, config] of Object.entries(RATE_LIMITS)) {
    if (route !== 'default' && pathname.startsWith(route)) {
      return config;
    }
  }
  
  return RATE_LIMITS.default;
}

/**
 * Gets client identifier for rate limiting with enhanced detection
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for production behind proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback to localhost
  return '127.0.0.1';
}

/**
 * Checks if request should be blocked based on patterns
 */
function shouldBlockRequest(request: NextRequest): { blocked: boolean; reason?: string } {
  const userAgent = request.headers.get('user-agent') || '';
  const pathname = request.nextUrl.pathname;
  
  // Block known bad user agents
  const badUserAgents = [
    'curl', 'wget', 'python-requests', 'Go-http-client',
    'bot', 'crawler', 'spider', 'scraper'
  ];
  
  const lowerUserAgent = userAgent.toLowerCase();
  if (badUserAgents.some(bad => lowerUserAgent.includes(bad))) {
    return { blocked: true, reason: 'Blocked user agent' };
  }
  
  // Block requests with suspicious patterns
  if (pathname.includes('..') || pathname.includes('%2e%2e')) {
    return { blocked: true, reason: 'Path traversal attempt' };
  }
  
  // Block requests to sensitive paths
  const blockedPaths = [
    '/.env', '/config', '/admin', '/.git', '/wp-admin',
    '/phpmyadmin', '/mysql', '/database'
  ];
  
  if (blockedPaths.some(blocked => pathname.startsWith(blocked))) {
    return { blocked: true, reason: 'Blocked path access' };
  }
  
  return { blocked: false };
}

/**
 * Applies rate limiting logic
 */
function applyRateLimit(request: NextRequest): NextResponse | null {
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
    delete clientData.blocked;
  }

  // Check if limit exceeded
  if (clientData.count >= limit) {
    // Track blocked requests
    clientData.blocked = (clientData.blocked || 0) + 1;
    
    const retryAfter = Math.ceil((windowMs - (now - clientData.lastReset)) / 1000);
    
    console.warn('[Middleware] Rate limit exceeded', {
      clientId: clientId.slice(0, 8) + '***', // Partial IP for privacy
      pathname: request.nextUrl.pathname,
      count: clientData.count,
      limit,
      blocked: clientData.blocked,
    });
    
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
        limit,
        remaining: 0,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(clientData.lastReset + windowMs).toISOString(),
          ...SECURITY_HEADERS,
        }
      }
    );
  }

  // Increment counter
  clientData.count++;
  return null; // No rate limit violation
}

/**
 * Adds security headers to response
 */
function addSecurityHeaders(response: NextResponse, request: NextRequest): void {
  // Add all security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add CSP header only in production or if explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CSP === 'true') {
    response.headers.set('Content-Security-Policy', CSP_DIRECTIVES);
  }
  
  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }
}

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  
  // Only apply middleware to API routes and auth pages
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  try {
    // Check for blocked requests
    const blockCheck = shouldBlockRequest(request);
    if (blockCheck.blocked) {
      console.warn('[Middleware] Blocked request', {
        reason: blockCheck.reason,
        pathname,
        userAgent: request.headers.get('user-agent')?.slice(0, 100),
        ip: getClientIdentifier(request).slice(0, 8) + '***',
      });
      
      return new NextResponse(
        JSON.stringify({
          error: 'Forbidden',
          message: 'Request blocked by security policy'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...SECURITY_HEADERS,
          }
        }
      );
    }

    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Continue with request
    const response = NextResponse.next();
    
    // Add security headers
    addSecurityHeaders(response, request);
    
    // Add rate limit headers to successful responses
    const clientId = getClientIdentifier(request);
    const { limit } = getRateLimit(pathname);
    const key = `${clientId}:${pathname}`;
    const clientData = rateLimitMap.get(key);
    
    if (clientData) {
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', (limit - clientData.count).toString());
      response.headers.set('X-RateLimit-Reset', new Date(clientData.lastReset + getRateLimit(pathname).windowMs).toISOString());
    }
    
    // Add performance timing header
    const duration = Date.now() - startTime;
    response.headers.set('X-Response-Time', `${duration}ms`);
    
    return response;
    
  } catch (error) {
    console.error('[Middleware] Error processing request:', error);
    
    // Return error response with security headers
    const errorResponse = new NextResponse(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An error occurred processing your request'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...SECURITY_HEADERS,
        }
      }
    );
    
    return errorResponse;
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/auth/:path*'
  ]
};