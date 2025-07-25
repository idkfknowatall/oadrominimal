/**
 * Enhanced error handling utilities for the Discord voting system
 * Provides comprehensive error classification, user-friendly messages, and retry mechanisms
 */

import { isFirebaseError } from './firebase';
import { isOnline } from './service-worker';

/**
 * Error types for better categorization and handling
 */
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  RATE_LIMIT = 'rate_limit',
  FIREBASE = 'firebase',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown'
}

/**
 * Error severity levels for UI feedback
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Structured error information for consistent handling
 */
export interface VotingError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  retryable: boolean;
  context?: string;
  originalError?: unknown;
}

/**
 * Retry configuration for different error types
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Default retry configurations for different error types
 */
const DEFAULT_RETRY_CONFIGS: Record<ErrorType, RetryConfig> = {
  [ErrorType.NETWORK]: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  },
  [ErrorType.FIREBASE]: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  },
  [ErrorType.OFFLINE]: {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 1.5
  },
  [ErrorType.RATE_LIMIT]: {
    maxAttempts: 2,
    baseDelay: 5000,
    maxDelay: 30000,
    backoffMultiplier: 3
  },
  [ErrorType.AUTHENTICATION]: {
    maxAttempts: 1,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1
  },
  [ErrorType.VALIDATION]: {
    maxAttempts: 1,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1
  },
  [ErrorType.PERMISSION]: {
    maxAttempts: 1,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1
  },
  [ErrorType.UNKNOWN]: {
    maxAttempts: 2,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2
  }
};

/**
 * Classify an error into a structured VotingError
 */
export function classifyError(error: unknown, context?: string): VotingError {
  // Check if device is offline first
  if (!isOnline()) {
    return {
      type: ErrorType.OFFLINE,
      severity: ErrorSeverity.MEDIUM,
      message: 'Device is offline',
      userMessage: 'You appear to be offline. Please check your internet connection and try again.',
      retryable: true,
      context,
      originalError: error
    };
  }

  // Handle Firebase errors
  if (isFirebaseError(error)) {
    return classifyFirebaseError(error, context);
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return classifyStandardError(error, context);
  }

  // Handle string errors
  if (typeof error === 'string') {
    return classifyStringError(error, context);
  }

  // Unknown error type
  return {
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    message: `Unknown error: ${String(error)}`,
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true,
    context,
    originalError: error
  };
}

/**
 * Classify Firebase-specific errors
 */
function classifyFirebaseError(error: any, context?: string): VotingError {
  const code = error.code || '';
  const message = error.message || 'Firebase error';

  switch (code) {
    case 'permission-denied':
      return {
        type: ErrorType.PERMISSION,
        severity: ErrorSeverity.HIGH,
        message: `Permission denied: ${message}`,
        userMessage: 'You don\'t have permission to perform this action. Please try logging in again.',
        retryable: false,
        context,
        originalError: error
      };

    case 'unauthenticated':
      return {
        type: ErrorType.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        message: `Authentication required: ${message}`,
        userMessage: 'Please log in with Discord to vote on songs.',
        retryable: false,
        context,
        originalError: error
      };

    case 'invalid-argument':
    case 'failed-precondition':
    case 'out-of-range':
      return {
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: `Validation error: ${message}`,
        userMessage: 'Invalid data provided. Please try again.',
        retryable: false,
        context,
        originalError: error
      };

    case 'resource-exhausted':
      return {
        type: ErrorType.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        message: `Rate limit exceeded: ${message}`,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        retryable: true,
        context,
        originalError: error
      };

    case 'unavailable':
    case 'deadline-exceeded':
    case 'internal':
      return {
        type: ErrorType.FIREBASE,
        severity: ErrorSeverity.MEDIUM,
        message: `Firebase service error: ${message}`,
        userMessage: 'Service temporarily unavailable. Please try again in a moment.',
        retryable: true,
        context,
        originalError: error
      };

    case 'cancelled':
      return {
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.LOW,
        message: `Request cancelled: ${message}`,
        userMessage: 'Request was cancelled. Please try again.',
        retryable: true,
        context,
        originalError: error
      };

    default:
      return {
        type: ErrorType.FIREBASE,
        severity: ErrorSeverity.MEDIUM,
        message: `Firebase error (${code}): ${message}`,
        userMessage: 'A service error occurred. Please try again.',
        retryable: true,
        context,
        originalError: error
      };
  }
}

/**
 * Classify standard Error objects
 */
function classifyStandardError(error: Error, context?: string): VotingError {
  const message = error.message.toLowerCase();

  // Network-related errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return {
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      userMessage: 'Network connection error. Please check your internet connection and try again.',
      retryable: true,
      context,
      originalError: error
    };
  }

  // Authentication errors
  if (message.includes('authentication') || message.includes('unauthorized') || message.includes('login')) {
    return {
      type: ErrorType.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      userMessage: 'Authentication required. Please log in with Discord to continue.',
      retryable: false,
      context,
      originalError: error
    };
  }

  // Validation errors
  if (message.includes('required') || message.includes('invalid') || message.includes('validation')) {
    return {
      type: ErrorType.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      userMessage: 'Invalid information provided. Please check your input and try again.',
      retryable: false,
      context,
      originalError: error
    };
  }

  // Default to unknown
  return {
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    message: error.message,
    userMessage: 'An error occurred. Please try again.',
    retryable: true,
    context,
    originalError: error
  };
}

/**
 * Classify string errors
 */
function classifyStringError(error: string, context?: string): VotingError {
  const message = error.toLowerCase();

  if (message.includes('offline') || message.includes('network')) {
    return {
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message: error,
      userMessage: 'Network connection error. Please check your internet connection and try again.',
      retryable: true,
      context,
      originalError: error
    };
  }

  if (message.includes('authentication') || message.includes('login')) {
    return {
      type: ErrorType.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message: error,
      userMessage: 'Please log in with Discord to vote on songs.',
      retryable: false,
      context,
      originalError: error
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    message: error,
    userMessage: 'An error occurred. Please try again.',
    retryable: true,
    context,
    originalError: error
  };
}

/**
 * Get retry configuration for an error type
 */
export function getRetryConfig(errorType: ErrorType): RetryConfig {
  return DEFAULT_RETRY_CONFIGS[errorType];
}

/**
 * Calculate delay for retry attempt with exponential backoff
 */
export function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
  return Math.min(delay + jitter, config.maxDelay);
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enhanced retry wrapper with proper error classification
 */
export async function withEnhancedRetry<T>(
  operation: () => Promise<T>,
  context?: string,
  customConfig?: Partial<RetryConfig>
): Promise<T> {
  let lastError: VotingError;
  let attempt = 1;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      lastError = classifyError(error, context);
      
      // Don't retry non-retryable errors
      if (!lastError.retryable) {
        throw lastError;
      }

      const config = { ...getRetryConfig(lastError.type), ...customConfig };
      
      // Check if we've exceeded max attempts
      if (attempt >= config.maxAttempts) {
        throw lastError;
      }

      // Calculate delay and wait
      const delay = calculateRetryDelay(attempt, config);
      console.warn(`[ErrorHandling] Retry attempt ${attempt}/${config.maxAttempts} after ${delay}ms for ${lastError.type} error:`, lastError.message);
      
      await sleep(delay);
      attempt++;
    }
  }
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: VotingError): string {
  return `[${error.type.toUpperCase()}] ${error.context ? `${error.context}: ` : ''}${error.message}`;
}

/**
 * Check if error should trigger a toast notification
 */
export function shouldShowToast(error: VotingError): boolean {
  // Don't show toasts for low severity errors or validation errors that are handled inline
  return error.severity !== ErrorSeverity.LOW && error.type !== ErrorType.VALIDATION;
}

/**
 * Get appropriate toast variant for error severity
 */
export function getToastVariant(severity: ErrorSeverity): 'default' | 'destructive' {
  return severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL ? 'destructive' : 'default';
}