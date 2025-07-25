/**
 * Toast notification utilities specifically for the voting system
 * Provides consistent, user-friendly notifications for voting actions and errors
 */

import { toast } from '@/hooks/use-toast';
import { VotingError, ErrorSeverity, getToastVariant, shouldShowToast } from './error-handling';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

/**
 * Show success toast for successful vote submission
 */
export function showVoteSuccessToast(voteType: 'like' | 'dislike', songTitle?: string) {
  const action = voteType === 'like' ? 'liked' : 'disliked';
  const title = `Vote ${action}!`;
  const description = songTitle 
    ? `You ${action} "${songTitle}"`
    : `Your ${voteType} vote has been recorded`;

  toast({
    title,
    description,
    variant: 'default',
    duration: 3000,
  });
}

/**
 * Show error toast for voting errors
 */
export function showVotingErrorToast(error: VotingError, onRetry?: () => void) {
  if (!shouldShowToast(error)) {
    return;
  }

  const variant = getToastVariant(error.severity);
  const duration = error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL 
    ? 8000 
    : 5000;

  // Create retry action if error is retryable and retry function is provided
  const action = error.retryable && onRetry ? (
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-1 rounded-md bg-transparent px-3 py-1 text-sm font-medium hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <RefreshCw className="h-3 w-3" />
      Retry
    </button>
  ) : undefined;

  toast({
    title: getErrorTitle(error),
    description: error.userMessage,
    variant,
    duration,
    action,
  });
}

/**
 * Show offline notification
 */
export function showOfflineToast() {
  toast({
    title: 'You\'re offline',
    description: 'Voting is disabled while offline. Check your connection and try again.',
    variant: 'default',
    duration: 6000,
    action: (
      <div className="flex items-center gap-1 text-muted-foreground">
        <WifiOff className="h-3 w-3" />
        <span className="text-xs">Offline</span>
      </div>
    ),
  });
}

/**
 * Show reconnection success toast
 */
export function showReconnectedToast() {
  toast({
    title: 'Back online!',
    description: 'Your connection has been restored. You can now vote on songs.',
    variant: 'default',
    duration: 4000,
    action: (
      <div className="flex items-center gap-1 text-green-600">
        <Wifi className="h-3 w-3" />
        <span className="text-xs">Online</span>
      </div>
    ),
  });
}

/**
 * Show authentication required toast
 */
export function showAuthRequiredToast(onLogin?: () => void) {
  const action = onLogin ? (
    <button
      onClick={onLogin}
      className="inline-flex items-center gap-1 rounded-md bg-[#5865F2] px-3 py-1 text-sm font-medium text-white hover:bg-[#4752C4] focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
    >
      Login
    </button>
  ) : undefined;

  toast({
    title: 'Login required',
    description: 'Please log in with Discord to vote on songs.',
    variant: 'default',
    duration: 6000,
    action,
  });
}

/**
 * Show rate limit toast
 */
export function showRateLimitToast(retryAfter?: number) {
  const description = retryAfter 
    ? `Please wait ${Math.ceil(retryAfter / 1000)} seconds before voting again.`
    : 'You\'re voting too quickly. Please wait a moment and try again.';

  toast({
    title: 'Slow down!',
    description,
    variant: 'default',
    duration: 6000,
  });
}

/**
 * Show connection error toast with retry option
 */
export function showConnectionErrorToast(onRetry?: () => void) {
  const action = onRetry ? (
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-1 rounded-md bg-transparent px-3 py-1 text-sm font-medium hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <RefreshCw className="h-3 w-3" />
      Retry
    </button>
  ) : undefined;

  toast({
    title: 'Connection error',
    description: 'Unable to connect to the voting service. Please check your connection.',
    variant: 'destructive',
    duration: 8000,
    action,
  });
}

/**
 * Show service unavailable toast
 */
export function showServiceUnavailableToast(onRetry?: () => void) {
  const action = onRetry ? (
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-1 rounded-md bg-transparent px-3 py-1 text-sm font-medium hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <RefreshCw className="h-3 w-3" />
      Try again
    </button>
  ) : undefined;

  toast({
    title: 'Service temporarily unavailable',
    description: 'The voting service is currently unavailable. Please try again in a moment.',
    variant: 'default',
    duration: 8000,
    action,
  });
}

/**
 * Show vote change confirmation
 */
export function showVoteChangeToast(oldVote: 'like' | 'dislike', newVote: 'like' | 'dislike', songTitle?: string) {
  const description = songTitle
    ? `Changed your vote on "${songTitle}" from ${oldVote} to ${newVote}`
    : `Changed your vote from ${oldVote} to ${newVote}`;

  toast({
    title: 'Vote updated',
    description,
    variant: 'default',
    duration: 3000,
  });
}

/**
 * Get appropriate error title based on error type and severity
 */
function getErrorTitle(error: VotingError): string {
  switch (error.type) {
    case 'network':
      return 'Connection error';
    case 'authentication':
      return 'Authentication required';
    case 'validation':
      return 'Invalid input';
    case 'permission':
      return 'Permission denied';
    case 'rate_limit':
      return 'Too many requests';
    case 'firebase':
      return 'Service error';
    case 'offline':
      return 'You\'re offline';
    default:
      return error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL
        ? 'Error'
        : 'Something went wrong';
  }
}

/**
 * Get icon component for error type
 */
function getErrorIcon(error: VotingError) {
  switch (error.type) {
    case 'network':
    case 'offline':
      return WifiOff;
    case 'authentication':
    case 'permission':
      return XCircle;
    case 'rate_limit':
      return AlertTriangle;
    default:
      return error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL
        ? XCircle
        : AlertTriangle;
  }
}