/**
 * Enhanced user session endpoint with validation and security
 * Get current user information from Discord session with comprehensive validation
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateDiscordUser } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Validates session cookies and constructs user object
 */
function validateUserSession(request: NextRequest): {
  isValid: boolean;
  user?: any;
  errors?: string[];
} {
  const discordUserId = request.cookies.get('discord_user_id')?.value;
  const discordUsername = request.cookies.get('discord_username')?.value;
  const discordAvatar = request.cookies.get('discord_avatar')?.value;

  // Check if required session data exists
  if (!discordUserId || !discordUsername) {
    return { isValid: false, errors: ['Missing required session data'] };
  }

  // Construct user object for validation
  const userData = {
    id: discordUserId,
    username: discordUsername,
    avatar: discordAvatar && discordAvatar !== 'null' ? discordAvatar : undefined,
  };

  // Validate using our comprehensive validation
  return validateDiscordUser(userData);
}

/**
 * Logs session access for security monitoring
 */
function logSessionAccess(request: NextRequest, success: boolean, userId?: string): void {
  console.log('[Discord Session] Session access', {
    success,
    userId: userId ? `***${userId.slice(-4)}` : 'unknown',
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent')?.slice(0, 100),
    ip: request.headers.get('x-forwarded-for') || 'unknown',
  });
}

export async function GET(request: NextRequest) {
  try {
    const sessionValidation = validateUserSession(request);
    
    if (!sessionValidation.isValid) {
      logSessionAccess(request, false);
      
      return NextResponse.json(
        { 
          isLoggedIn: false,
          user: null,
          error: 'Invalid session'
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Content-Type-Options': 'nosniff',
          }
        }
      );
    }

    const validatedUser = sessionValidation.user!;
    logSessionAccess(request, true, validatedUser.id);

    // Construct avatar URL with validation
    const avatarUrl = validatedUser.avatar && validatedUser.avatar !== 'null'
      ? `https://cdn.discordapp.com/avatars/${validatedUser.id}/${validatedUser.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(validatedUser.id) % 5}.png`;

    return NextResponse.json(
      {
        isLoggedIn: true,
        user: {
          id: validatedUser.id,
          username: validatedUser.username,
          avatar: validatedUser.avatar,
          avatarUrl,
        }
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
          'Vary': 'Cookie',
        }
      }
    );
    
  } catch (error) {
    console.error('[Discord Session] Session validation error:', error);
    
    return NextResponse.json(
      { 
        isLoggedIn: false,
        user: null,
        error: 'Session validation failed'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        }
      }
    );
  }
}

/**
 * Health check for session endpoint
 */
export async function HEAD(request: NextRequest) {
  try {
    const sessionValidation = validateUserSession(request);
    const status = sessionValidation.isValid ? 200 : 401;
    
    return new NextResponse(null, {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
    
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}