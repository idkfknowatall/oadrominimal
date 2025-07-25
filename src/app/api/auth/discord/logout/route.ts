/**
 * Enhanced Discord OAuth logout with comprehensive cleanup
 * Implements secure session termination and cookie management
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * List of all Discord-related cookies to clear
 */
const DISCORD_COOKIES = [
  'discord_user_id',
  'discord_username', 
  'discord_avatar',
  'discord_oauth_state',
  'discord_code_verifier',
  'discord_oauth_nonce',
] as const;

/**
 * Clears all Discord-related cookies from response
 */
function clearDiscordCookies(response: NextResponse): void {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0, // Expire immediately
  };

  DISCORD_COOKIES.forEach(cookieName => {
    response.cookies.set(cookieName, '', cookieOptions);
  });
}

/**
 * Logs logout event for security monitoring
 */
function logLogoutEvent(request: NextRequest, method: string): void {
  const userId = request.cookies.get('discord_user_id')?.value;
  const username = request.cookies.get('discord_username')?.value;
  
  console.log('[Discord OAuth] User logout', {
    method,
    userId: userId ? `***${userId.slice(-4)}` : 'unknown', // Partial ID for privacy
    username: username || 'unknown',
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent')?.slice(0, 100),
    ip: request.headers.get('x-forwarded-for') || 'unknown',
  });
}

export async function POST(request: NextRequest) {
  try {
    logLogoutEvent(request, 'POST');
    
    const response = NextResponse.json({ 
      success: true,
      message: 'Successfully logged out'
    });
    
    // Clear all Discord-related cookies
    clearDiscordCookies(response);
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    return response;
    
  } catch (error) {
    console.error('[Discord OAuth] Logout error (POST):', error);
    
    // Still try to clear cookies even on error
    const response = NextResponse.json(
      { 
        success: false,
        error: 'Logout failed',
        message: 'An error occurred during logout'
      },
      { status: 500 }
    );
    
    clearDiscordCookies(response);
    return response;
  }
}

export async function GET(request: NextRequest) {
  try {
    logLogoutEvent(request, 'GET');
    
    // Support GET for direct logout links with redirect
    const response = NextResponse.redirect(new URL('/?logout=success', request.url));
    
    // Clear all Discord-related cookies
    clearDiscordCookies(response);
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    return response;
    
  } catch (error) {
    console.error('[Discord OAuth] Logout error (GET):', error);
    
    // Still try to clear cookies and redirect even on error
    const response = NextResponse.redirect(new URL('/?error=logout_failed', request.url));
    clearDiscordCookies(response);
    return response;
  }
}

/**
 * OPTIONS method for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}