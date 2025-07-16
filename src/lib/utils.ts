import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDuration = (seconds: number | undefined): string => {
  if (seconds === undefined || isNaN(seconds)) return '0:00';
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
 * A simple server-side sanitizer to prevent XSS. It strips all HTML tags.
 * For more complex sanitization needs, a more robust library like DOMPurify would be recommended.
 * @param text The input string to sanitize.
 * @returns The sanitized string.
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  let sanitized = text;
  // First, remove script tags and their content to prevent execution.
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  // Then, strip any remaining HTML tags to clean up the text.
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  return sanitized.trim();
}

/**
 * Creates a URL-friendly slug from a string.
 * @param text The text to slugify.
 * @returns The slugified string.
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
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
  const interactionPoints = (commentCount || 0) + (reactionCount || 0);
  const listeningPoints = (totalListeningSeconds || 0) / 600;
  return interactionPoints + listeningPoints;
}
