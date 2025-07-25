/**
 * Enhanced Discord OAuth login with PKCE implementation
 * Implements OAuth 2.1 security best practices
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateSecureRandom, validateEnvironmentVariables } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// PKCE code challenge methods
const CODE_CHALLENGE_METHOD = 'S256';

/**
 * Generates PKCE code verifier and challenge with proper SHA256 hashing
 */
async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  // Generate code verifier (43-128 characters, base64url-safe)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Generate code challenge using SHA256
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  
  // Convert to base64url
  const codeChallenge = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return { codeVerifier, codeChallenge };
}

/**
 * Validates environment configuration before proceeding
 */
function validateConfig(): { isValid: boolean; errors: string[] } {
  const envValidation = validateEnvironmentVariables();
  
  if (!envValidation.isValid) {
    return envValidation;
  }
  
  // Additional Discord-specific validations
  const errors: string[] = [];
  
  if (!process.env.DISCORD_REDIRECT_URI?.startsWith('https://') && process.env.NODE_ENV === 'production') {
    errors.push('DISCORD_REDIRECT_URI must use HTTPS in production');
  }
  
  return {
    isValid: errors.length === 0,
    errors: [...envValidation.errors, ...errors]
  };
}

export async function GET(request: NextRequest) {
  try {
    // Validate environment configuration
    const configValidation = validateConfig();
    if (!configValidation.isValid) {
      console.error('[Discord OAuth] Configuration validation failed:', configValidation.errors);
      return NextResponse.json(
        { 
          error: 'OAuth configuration error',
          message: 'Discord authentication is not properly configured'
        },
        { status: 500 }
      );
    }

    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = await generatePKCE();
    
    // Generate cryptographically secure state parameter
    const state = crypto.randomUUID();
    
    // Generate nonce for additional security
    const nonce = generateSecureRandom(16);
    
    // Discord OAuth parameters with PKCE
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      response_type: 'code',
      scope: 'identify',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CODE_CHALLENGE_METHOD,
      prompt: 'consent', // Always show consent screen for security
    });

    // Create Discord authorization URL
    const authUrl = `https://discord.com/api/oauth2/authorize?${params}`;
    
    // Create response with redirect
    const response = NextResponse.redirect(authUrl);
    
    // Store PKCE and state parameters in secure cookies
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Always use secure cookies for production
      sameSite: 'lax' as const,
      maxAge: 60 * 10, // 10 minutes
      path: '/',
      domain: '.oadro.com', // Set domain to work across subdomains
    };
    
    response.cookies.set('discord_oauth_state', state, cookieOptions);
    response.cookies.set('discord_code_verifier', codeVerifier, cookieOptions);
    response.cookies.set('discord_oauth_nonce', nonce, cookieOptions);
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Log successful OAuth initiation (without sensitive data)
    console.log('[Discord OAuth] Login initiated', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')?.slice(0, 100),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return response;
    
  } catch (error) {
    console.error('[Discord OAuth] Login initiation failed:', error);
    
    // Return user-friendly error
    return NextResponse.json(
      { 
        error: 'Authentication error',
        message: 'Failed to initiate Discord login. Please try again.'
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for OAuth service
 */
export async function HEAD(request: NextRequest) {
  const configValidation = validateConfig();
  
  if (configValidation.isValid) {
    return new NextResponse(null, { status: 200 });
  } else {
    return new NextResponse(null, { status: 503 });
  }
}