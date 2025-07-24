import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats duration in seconds to MM:SS format with enhanced validation.
 * @param seconds The duration in seconds.
 * @returns Formatted duration string.
 */
export const formatDuration = (seconds: number | undefined): string => {
  // Enhanced input validation
  if (seconds === undefined || seconds === null) return '0:00';
  if (typeof seconds !== 'number' || isNaN(seconds)) return '0:00';
  if (seconds < 0) return '0:00';
  if (!isFinite(seconds)) return '0:00';
  
  // Handle very large durations (over 24 hours)
  if (seconds > 86400) { // 24 hours
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Formats a total number of seconds into a human-readable string like "5h 21m" or "45m".
 * @param seconds The total number of seconds.
 * @returns A formatted string representing hours and minutes.
 */
export const formatListeningTime = (seconds: number | undefined): string => {
  if (seconds === undefined || isNaN(seconds) || seconds < 60) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Enhanced server-side sanitizer to prevent XSS with comprehensive cleaning.
 * @param text The input string to sanitize.
 * @returns The sanitized string.
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  let sanitized = text;
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove potentially dangerous attributes
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, ''); // onclick, onload, etc.
  sanitized = sanitized.replace(/\s*javascript\s*:/gi, ''); // javascript: URLs
  sanitized = sanitized.replace(/\s*data\s*:/gi, ''); // data: URLs
  sanitized = sanitized.replace(/\s*vbscript\s*:/gi, ''); // vbscript: URLs
  
  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities and re-encode to prevent double encoding
  sanitized = sanitized
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
  
  // Re-encode special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized.trim();
}

/**
 * Creates a URL-friendly slug from a string with enhanced validation.
 * @param text The text to slugify.
 * @returns The slugified string.
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove all non-alphanumeric characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/\-\-+/g, '-')
    // Remove hyphens from start and end
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    // Limit length to prevent overly long slugs
    .substring(0, 100);
}

/**
 * Validates and sanitizes email addresses.
 * @param email The email to validate.
 * @returns The sanitized email or null if invalid.
 */
export function validateEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized) || sanitized.length > 254) {
    return null;
  }
  
  return sanitized;
}

/**
 * Validates URLs with protocol checking and enhanced security.
 * @param url The URL to validate.
 * @param allowedProtocols Allowed protocols (default: ['http', 'https']).
 * @returns The validated URL or null if invalid.
 */
export function validateUrl(url: string, allowedProtocols: string[] = ['http', 'https']): string | null {
  if (!url || typeof url !== 'string') return null;
  
  try {
    const urlObj = new URL(url.trim());
    
    if (!allowedProtocols.includes(urlObj.protocol.slice(0, -1))) {
      return null;
    }
    
    // Additional security checks
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      return null; // Prevent localhost access in production
    }
    
    return urlObj.toString();
  } catch {
    return null;
  }
}

/**
 * Validates Discord ID format.
 * @param id The Discord ID to validate.
 * @returns The validated ID or null if invalid.
 */
export function validateDiscordId(id: string): string | null {
  if (!id || typeof id !== 'string') return null;
  
  const sanitized = id.trim();
  const discordIdRegex = /^\d{17,19}$/;
  
  return discordIdRegex.test(sanitized) ? sanitized : null;
}

/**
 * Safely parses JSON with error handling and type validation.
 * @param jsonString The JSON string to parse.
 * @param defaultValue Default value to return on parse error.
 * @returns Parsed object or default value.
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  if (!jsonString || typeof jsonString !== 'string') {
    return defaultValue;
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Debounces a function call with improved memory management.
 * @param func The function to debounce.
 * @param wait The number of milliseconds to delay.
 * @returns The debounced function with cleanup capability.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      func(...args);
    }, wait);
  };
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced;
}

/**
 * Throttles a function call with improved performance.
 * @param func The function to throttle.
 * @param limit The number of milliseconds to limit calls.
 * @returns The throttled function.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  
  return (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    }
  };
}

interface InfluenceScoreParams {
  commentCount?: number;
  reactionCount?: number;
  totalListeningSeconds?: number;
}

/**
 * Calculates a user's influence score based on their interactions and listening time.
 * The formula is: (comments + reactions) + (total listening seconds / 600).
 * This provides 1 point for every 10 minutes of listening.
 * @param params An object containing user stats.
 * @returns The calculated influence score.
 */
export function calculateInfluenceScore({
  commentCount = 0,
  reactionCount = 0,
  totalListeningSeconds = 0,
}: InfluenceScoreParams): number {
  // Validate inputs
  const validCommentCount = Math.max(0, Math.floor(commentCount || 0));
  const validReactionCount = Math.max(0, Math.floor(reactionCount || 0));
  const validListeningSeconds = Math.max(0, Math.floor(totalListeningSeconds || 0));
  
  const interactionPoints = validCommentCount + validReactionCount;
  const listeningPoints = validListeningSeconds / 600; // 1 point per 10 minutes
  
  return Math.round((interactionPoints + listeningPoints) * 100) / 100; // Round to 2 decimal places
}

/**
 * Formats file sizes in human-readable format with enhanced validation.
 * @param bytes The size in bytes.
 * @param decimals Number of decimal places.
 * @returns Formatted file size string.
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) return '0 Bytes';
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = Math.max(0, Math.floor(decimals));
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Generates a cryptographically secure random string.
 * @param length The length of the string to generate.
 * @param charset The character set to use.
 * @returns Random string.
 */
export function generateRandomString(
  length: number = 10,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  if (length <= 0 || !charset) return '';
  
  // Use crypto.getRandomValues for better security if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  }
  
  // Fallback to Math.random
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Creates a retry function with exponential backoff.
 * @param fn The function to retry.
 * @param maxAttempts Maximum number of retry attempts.
 * @param baseDelay Base delay in milliseconds.
 * @returns Promise that resolves with the function result or rejects after max attempts.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}