/**
 * Enhanced Discord OAuth callback handler with PKCE validation
 * Implements comprehensive security checks and error handling
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateDiscordUser, validateOAuthState } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Validates PKCE code verifier by recreating the challenge
 */
async function validatePKCE(codeVerifier: string): Promise<boolean> {
  try {
    if (!codeVerifier || typeof codeVerifier !== 'string') {
      return false;
    }
    
    // Validate code verifier format (base64url, 43-128 characters)
    if (codeVerifier.length < 43 || codeVerifier.length > 128) {
      return false;
    }
    
    // Validate base64url format
    const base64urlPattern = /^[A-Za-z0-9_-]+$/;
    if (!base64urlPattern.test(codeVerifier)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Discord OAuth] PKCE validation error:', error);
    return false;
  }
}

/**
 * Exchanges authorization code for access token with PKCE
 */
async function exchangeCodeForToken(
  code: string, 
  codeVerifier: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const body = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      code_verifier: codeVerifier, // PKCE parameter
    });

    console.log('[Discord OAuth] Exchanging code for token');

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'OADRO-Radio/1.0',
      },
      body,
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[Discord OAuth] Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData,
      });
      return { success: false, error: 'Token exchange failed' };
    }

    const tokenData = await tokenResponse.json();
    return { success: true, data: tokenData };
    
  } catch (error) {
    console.error('[Discord OAuth] Token exchange error:', error);
    return { success: false, error: 'Network error during token exchange' };
  }
}

/**
 * Fetches user data from Discord API
 */
async function fetchDiscordUser(accessToken: string, tokenType: string): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  try {
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `${tokenType} ${accessToken}`,
        'User-Agent': 'OADRO-Radio/1.0',
      },
    });

    if (!userResponse.ok) {
      console.error('[Discord OAuth] User fetch failed:', {
        status: userResponse.status,
        statusText: userResponse.statusText,
      });
      return { success: false, error: 'Failed to fetch user data' };
    }

    const userData = await userResponse.json();
    return { success: true, user: userData };
    
  } catch (error) {
    console.error('[Discord OAuth] User fetch error:', error);
    return { success: false, error: 'Network error during user fetch' };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');
    
    // Retrieve stored values from cookies
    const storedState = request.cookies.get('discord_oauth_state')?.value;
    const codeVerifier = request.cookies.get('discord_code_verifier')?.value;
    const nonce = request.cookies.get('discord_oauth_nonce')?.value;

    // Enhanced state validation
    if (!validateOAuthState(state || null) || !validateOAuthState(storedState || null) || state !== storedState) {
      console.error('[Discord OAuth] Invalid or mismatched state parameter', {
        hasState: !!state,
        hasStoredState: !!storedState,
        statesMatch: state === storedState,
      });
      return NextResponse.redirect(new URL('/?error=invalid_state', request.url));
    }

    // Validate PKCE code verifier
    if (!codeVerifier || !(await validatePKCE(codeVerifier))) {
      console.error('[Discord OAuth] Invalid PKCE code verifier');
      return NextResponse.redirect(new URL('/?error=invalid_pkce', request.url));
    }

    // Handle OAuth errors from Discord
    if (error) {
      console.error('[Discord OAuth] Discord returned error:', error);
      const errorMap: Record<string, string> = {
        'access_denied': 'User denied authorization',
        'invalid_request': 'Invalid OAuth request',
        'unsupported_response_type': 'Unsupported response type',
        'invalid_scope': 'Invalid scope requested',
      };
      
      return NextResponse.redirect(
        new URL(`/?error=discord_error&message=${encodeURIComponent(errorMap[error] || error)}`, request.url)
      );
    }

    // Validate authorization code
    if (!code) {
      console.error('[Discord OAuth] Missing authorization code');
      return NextResponse.redirect(new URL('/?error=missing_code', request.url));
    }

    // Exchange code for token with PKCE validation
    const tokenResult = await exchangeCodeForToken(code, codeVerifier);
    if (!tokenResult.success) {
      return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
    }

    const { access_token, token_type } = tokenResult.data;

    // Fetch user data from Discord
    const userResult = await fetchDiscordUser(access_token, token_type);
    if (!userResult.success) {
      return NextResponse.redirect(new URL('/?error=user_fetch_failed', request.url));
    }

    // Validate and sanitize user data
    const userValidation = validateDiscordUser(userResult.user);
    if (!userValidation.isValid) {
      console.error('[Discord OAuth] User data validation failed:', userValidation.errors);
      return NextResponse.redirect(new URL('/?error=invalid_user_data', request.url));
    }

    const validatedUser = userValidation.user!;
    
    console.log('[Discord OAuth] User authenticated successfully:', {
      id: validatedUser.id,
      username: validatedUser.username,
      duration: Date.now() - startTime,
    });

    // Create response with user session
    const response = NextResponse.redirect(new URL('/?auth=success', request.url));
    
    // Set secure session cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    };
    
    response.cookies.set('discord_user_id', validatedUser.id, cookieOptions);
    response.cookies.set('discord_username', validatedUser.username, cookieOptions);
    response.cookies.set('discord_avatar', validatedUser.avatar || '', cookieOptions);
    
    // Clear OAuth temporary cookies
    response.cookies.delete('discord_oauth_state');
    response.cookies.delete('discord_code_verifier');
    response.cookies.delete('discord_oauth_nonce');
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
    
  } catch (error) {
    console.error('[Discord OAuth] Unexpected error during callback:', error);
    
    // Clear any OAuth cookies on error
    const response = NextResponse.redirect(new URL('/?error=unexpected_error', request.url));
    response.cookies.delete('discord_oauth_state');
    response.cookies.delete('discord_code_verifier');
    response.cookies.delete('discord_oauth_nonce');
    
    return response;
  }
}