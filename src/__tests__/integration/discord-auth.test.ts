/**
 * Comprehensive integration tests for Discord OAuth flow
 * Tests complete authentication process with mocked Discord API
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET as loginHandler } from '@/app/api/auth/discord/login/route';
import { GET as callbackHandler } from '@/app/api/auth/callback/route';

// Mock environment variables
const mockEnv = {
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'mock-client-secret',
  DISCORD_REDIRECT_URI: 'https://localhost:3000/api/auth/callback',
  NODE_ENV: 'test'
};

// Mock fetch for Discord API calls
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock crypto.subtle for PKCE
const mockCryptoSubtle = {
  digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
};

Object.defineProperty(global, 'crypto', {
  value: {
    ...global.crypto,
    subtle: mockCryptoSubtle,
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
    randomUUID: vi.fn(() => 'mock-uuid-12345')
  },
  writable: true
});

describe('Discord OAuth Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OAuth Login Initiation', () => {
    it('should generate proper PKCE parameters and redirect to Discord', async () => {
      const request = new NextRequest('https://localhost:3000/api/auth/discord/login');
      
      const response = await loginHandler(request);
      
      expect(response.status).toBe(302);
      
      const location = response.headers.get('location');
      expect(location).toContain('https://discord.com/api/oauth2/authorize');
      expect(location).toContain('client_id=123456789012345678');
      expect(location).toContain('response_type=code');
      expect(location).toContain('scope=identify');
      expect(location).toContain('code_challenge=');
      expect(location).toContain('code_challenge_method=S256');
      expect(location).toContain('state=');
      
      // Check that cookies are set
      const cookies = response.headers.get('set-cookie');
      expect(cookies).toContain('discord_oauth_state');
      expect(cookies).toContain('discord_code_verifier');
      expect(cookies).toContain('discord_oauth_nonce');
    });

    it('should return error when environment variables are missing', async () => {
      delete process.env.DISCORD_CLIENT_ID;
      
      const request = new NextRequest('https://localhost:3000/api/auth/discord/login');
      
      const response = await loginHandler(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('OAuth configuration error');
    });

    it('should set secure cookies in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const request = new NextRequest('https://localhost:3000/api/auth/discord/login');
      
      const response = await loginHandler(request);
      
      const cookies = response.headers.get('set-cookie');
      expect(cookies).toContain('Secure');
    });

    it('should include proper security headers', async () => {
      const request = new NextRequest('https://localhost:3000/api/auth/discord/login');
      
      const response = await loginHandler(request);
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('OAuth Callback Handling', () => {
    const mockTokenResponse = {
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      scope: 'identify'
    };

    const mockUserResponse = {
      id: '987654321098765432',
      username: 'testuser',
      discriminator: '1234',
      avatar: 'mock-avatar-hash',
      email: 'test@example.com'
    };

    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url === 'https://discord.com/api/oauth2/token') {
          return Promise.resolve(new Response(JSON.stringify(mockTokenResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        
        if (url === 'https://discord.com/api/users/@me') {
          return Promise.resolve(new Response(JSON.stringify(mockUserResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });
    });

    it('should successfully complete OAuth flow with valid parameters', async () => {
      const state = 'mock-uuid-12345';
      const code = 'mock-auth-code';
      const codeVerifier = 'mock-code-verifier-123456789012345678901234567890123456789012345';
      
      const url = new URL('https://localhost:3000/api/auth/callback');
      url.searchParams.set('code', code);
      url.searchParams.set('state', state);
      
      const request = new NextRequest(url.toString(), {
        headers: {
          cookie: [
            `discord_oauth_state=${state}`,
            `discord_code_verifier=${codeVerifier}`,
            'discord_oauth_nonce=mock-nonce'
          ].join('; ')
        }
      });
      
      const response = await callbackHandler(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/?auth=success');
      
      // Check that user cookies are set
      const cookies = response.headers.get('set-cookie');
      expect(cookies).toContain('discord_user_id=987654321098765432');
      expect(cookies).toContain('discord_username=testuser');
      
      // Check that OAuth cookies are cleared
      expect(cookies).toContain('discord_oauth_state=; Max-Age=0');
      expect(cookies).toContain('discord_code_verifier=; Max-Age=0');
    });

    it('should reject requests with invalid state parameter', async () => {
      const url = new URL('https://localhost:3000/api/auth/callback');
      url.searchParams.set('code', 'mock-auth-code');
      url.searchParams.set('state', 'invalid-state');
      
      const request = new NextRequest(url.toString(), {
        headers: {
          cookie: 'discord_oauth_state=different-state; discord_code_verifier=mock-verifier'
        }
      });
      
      const response = await callbackHandler(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/?error=invalid_state');
    });

    it('should reject requests with missing PKCE code verifier', async () => {
      const state = 'mock-uuid-12345';
      
      const url = new URL('https://localhost:3000/api/auth/callback');
      url.searchParams.set('code', 'mock-auth-code');
      url.searchParams.set('state', state);
      
      const request = new NextRequest(url.toString(), {
        headers: {
          cookie: `discord_oauth_state=${state}`
        }
      });
      
      const response = await callbackHandler(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/?error=invalid_pkce');
    });

    it('should handle Discord API token exchange errors', async () => {
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve(new Response('Invalid request', { status: 400 }))
      );
      
      const state = 'mock-uuid-12345';
      const codeVerifier = 'mock-code-verifier-123456789012345678901234567890123456789012345';
      
      const url = new URL('https://localhost:3000/api/auth/callback');
      url.searchParams.set('code', 'invalid-code');
      url.searchParams.set('state', state);
      
      const request = new NextRequest(url.toString(), {
        headers: {
          cookie: [
            `discord_oauth_state=${state}`,
            `discord_code_verifier=${codeVerifier}`
          ].join('; ')
        }
      });
      
      const response = await callbackHandler(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/?error=token_exchange_failed');
    });

    it('should handle Discord API user fetch errors', async () => {
      mockFetch
        .mockImplementationOnce(() => 
          Promise.resolve(new Response(JSON.stringify(mockTokenResponse), { status: 200 }))
        )
        .mockImplementationOnce(() => 
          Promise.resolve(new Response('Unauthorized', { status: 401 }))
        );
      
      const state = 'mock-uuid-12345';
      const codeVerifier = 'mock-code-verifier-123456789012345678901234567890123456789012345';
      
      const url = new URL('https://localhost:3000/api/auth/callback');
      url.searchParams.set('code', 'mock-auth-code');
      url.searchParams.set('state', state);
      
      const request = new NextRequest(url.toString(), {
        headers: {
          cookie: [
            `discord_oauth_state=${state}`,
            `discord_code_verifier=${codeVerifier}`
          ].join('; ')
        }
      });
      
      const response = await callbackHandler(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/?error=user_fetch_failed');
    });

    it('should handle Discord error responses', async () => {
      const state = 'mock-uuid-12345';
      
      const url = new URL('https://localhost:3000/api/auth/callback');
      url.searchParams.set('error', 'access_denied');
      url.searchParams.set('state', state);
      
      const request = new NextRequest(url.toString(), {
        headers: {
          cookie: `discord_oauth_state=${state}; discord_code_verifier=mock-verifier`
        }
      });
      
      const response = await callbackHandler(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/?error=discord_error');
      expect(response.headers.get('location')).toContain('message=User%20denied%20authorization');
    });

    it('should validate user data before setting cookies', async () => {
      const invalidUserResponse = {
        id: 'invalid-id', // Should be 17-19 digits
        username: '', // Should not be empty
        avatar: 'invalid-hash' // Should be 32 character hex
      };

      mockFetch
        .mockImplementationOnce(() => 
          Promise.resolve(new Response(JSON.stringify(mockTokenResponse), { status: 200 }))
        )
        .mockImplementationOnce(() => 
          Promise.resolve(new Response(JSON.stringify(invalidUserResponse), { status: 200 }))
        );
      
      const state = 'mock-uuid-12345';
      const codeVerifier = 'mock-code-verifier-123456789012345678901234567890123456789012345';
      
      const url = new URL('https://localhost:3000/api/auth/callback');
      url.searchParams.set('code', 'mock-auth-code');
      url.searchParams.set('state', state);
      
      const request = new NextRequest(url.toString(), {
        headers: {
          cookie: [
            `discord_oauth_state=${state}`,
            `discord_code_verifier=${codeVerifier}`
          ].join('; ')
        }
      });
      
      const response = await callbackHandler(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/?error=invalid_user_data');
    });
  });

  describe('Security Measures', () => {
    it('should generate cryptographically secure PKCE parameters', async () => {
      const request = new NextRequest('https://localhost:3000/api/auth/discord/login');
      
      const response = await loginHandler(request);
      
      expect(crypto.getRandomValues).toHaveBeenCalled();
      expect(mockCryptoSubtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
    });

    it('should use secure cookie settings in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const request = new NextRequest('https://localhost:3000/api/auth/discord/login');
      
      const response = await loginHandler(request);
      
      const cookies = response.headers.get('set-cookie');
      expect(cookies).toContain('Secure');
      expect(cookies).toContain('HttpOnly');
      expect(cookies).toContain('SameSite=Lax');
    });

    it('should include CSRF protection with state parameter', async () => {
      const request = new NextRequest('https://localhost:3000/api/auth/discord/login');
      
      const response = await loginHandler(request);
      
      const location = response.headers.get('location');
      expect(location).toMatch(/state=[a-f0-9-]{36}/); // UUID format
    });

    it('should clear sensitive cookies on error', async () => {
      const url = new URL('https://localhost:3000/api/auth/callback');
      url.searchParams.set('error', 'access_denied');
      url.searchParams.set('state', 'mock-state');
      
      const request = new NextRequest(url.toString(), {
        headers: {
          cookie: 'discord_oauth_state=mock-state; discord_code_verifier=mock-verifier'
        }
      });
      
      const response = await callbackHandler(request);
      
      const cookies = response.headers.get('set-cookie');
      expect(cookies).toContain('discord_oauth_state=; Max-Age=0');
      expect(cookies).toContain('discord_code_verifier=; Max-Age=0');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle network timeouts gracefully', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );
      
      const state = 'mock-uuid-12345';
      const codeVerifier = 'mock-code-verifier-123456789012345678901234567890123456789012345';
      
      const url = new URL('https://localhost:3000/api/auth/callback');
      url.searchParams.set('code', 'mock-auth-code');
      url.searchParams.set('state', state);
      
      const request = new NextRequest(url.toString(), {
        headers: {
          cookie: [
            `discord_oauth_state=${state}`,
            `discord_code_verifier=${codeVerifier}`
          ].join('; ')
        }
      });
      
      const response = await callbackHandler(request);
      
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/?error=token_exchange_failed');
    });

    it('should log authentication events for monitoring', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const request = new NextRequest('https://localhost:3000/api/auth/discord/login');
      
      await loginHandler(request);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Discord OAuth] Login initiated'),
        expect.objectContaining({
          timestamp: expect.any(String),
          userAgent: expect.any(String)
        })
      );
      
      consoleSpy.mockRestore();
    });
  });
});