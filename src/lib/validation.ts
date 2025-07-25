/**
 * Comprehensive input validation and sanitization utilities
 * Implements security best practices for user input handling
 */

import { z } from 'zod';

// Email validation schema
export const emailSchema = z.string().email('Invalid email format').max(254);

// Discord ID validation (18-19 digit snowflake)
export const discordIdSchema = z.string().regex(/^\d{17,19}$/, 'Invalid Discord ID format');

// Username validation (Discord username rules)
export const usernameSchema = z.string()
  .min(2, 'Username must be at least 2 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username contains invalid characters');

// URL validation
export const urlSchema = z.string().url('Invalid URL format');

// Discord avatar hash validation
export const avatarHashSchema = z.string().regex(/^[a-f0-9]{32}$/, 'Invalid avatar hash').optional();

// Discord OAuth state validation
export const oauthStateSchema = z.string().uuid('Invalid OAuth state format');

// Audio metadata validation
export const songMetadataSchema = z.object({
  title: z.string().max(200).trim(),
  artist: z.string().max(200).trim(),
  album: z.string().max(200).trim().optional(),
  duration: z.number().positive().optional(),
  albumArt: urlSchema.optional(),
});

// User session validation
export const userSessionSchema = z.object({
  id: discordIdSchema,
  username: usernameSchema,
  avatar: avatarHashSchema,
  avatarUrl: urlSchema,
});

// Request validation schemas
export const requestSubmissionSchema = z.object({
  songTitle: z.string().min(1).max(200).trim(),
  artistName: z.string().min(1).max(200).trim(),
  requestMessage: z.string().max(500).trim().optional(),
});

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitizes user input for safe display
 */
export function sanitizeUserInput(input: string): string {
  return sanitizeHtml(input)
    .replace(/[^\w\s\-_.@]/g, '') // Allow only alphanumeric, spaces, and safe punctuation
    .slice(0, 1000); // Limit length
}

/**
 * Validates and sanitizes Discord user data
 */
export function validateDiscordUser(userData: any): {
  isValid: boolean;
  user?: z.infer<typeof userSessionSchema>;
  errors?: string[];
} {
  try {
    // Sanitize input data
    const sanitizedData = {
      id: sanitizeUserInput(userData.id || ''),
      username: sanitizeUserInput(userData.username || ''),
      avatar: userData.avatar ? sanitizeUserInput(userData.avatar) : undefined,
      avatarUrl: userData.avatar && userData.id 
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.id || '0') % 5}.png`,
    };

    const result = userSessionSchema.safeParse(sanitizedData);
    
    if (result.success) {
      return { isValid: true, user: result.data };
    } else {
      return { 
        isValid: false, 
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
  } catch (error) {
    return { 
      isValid: false, 
      errors: ['Invalid user data format']
    };
  }
}

/**
 * Validates OAuth state parameter
 */
export function validateOAuthState(state: string | null): boolean {
  if (!state) return false;
  return oauthStateSchema.safeParse(state).success;
}

/**
 * Generates a cryptographically secure random string
 */
export function generateSecureRandom(length: number = 32): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for environments without crypto.getRandomValues
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/**
 * Validates environment variables
 */
export function validateEnvironmentVariables(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Discord OAuth validation
  if (!process.env.DISCORD_CLIENT_ID) {
    errors.push('DISCORD_CLIENT_ID is required');
  } else if (!discordIdSchema.safeParse(process.env.DISCORD_CLIENT_ID).success) {
    errors.push('DISCORD_CLIENT_ID must be a valid Discord application ID');
  }
  
  if (!process.env.DISCORD_CLIENT_SECRET) {
    errors.push('DISCORD_CLIENT_SECRET is required');
  }
  
  if (!process.env.DISCORD_REDIRECT_URI) {
    errors.push('DISCORD_REDIRECT_URI is required');
  } else if (!urlSchema.safeParse(process.env.DISCORD_REDIRECT_URI).success) {
    errors.push('DISCORD_REDIRECT_URI must be a valid URL');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Rate limiting validation
 */
export function validateRateLimitHeaders(headers: Record<string, string>): boolean {
  const requiredHeaders = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset'];
  return requiredHeaders.every(header => header in headers);
}

/**
 * Validates audio stream metadata
 */
export function validateSongMetadata(metadata: any): {
  isValid: boolean;
  data?: z.infer<typeof songMetadataSchema>;
  errors?: string[];
} {
  try {
    const result = songMetadataSchema.safeParse(metadata);
    
    if (result.success) {
      return { isValid: true, data: result.data };
    } else {
      return {
        isValid: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
  } catch (error) {
    return {
      isValid: false,
      errors: ['Invalid metadata format']
    };
  }
}

// Export types for use in other modules
export type ValidatedUser = z.infer<typeof userSessionSchema>;
export type ValidatedSongMetadata = z.infer<typeof songMetadataSchema>;
export type ValidatedRequestSubmission = z.infer<typeof requestSubmissionSchema>;