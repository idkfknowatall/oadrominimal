import * as React from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VoteButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  type: 'like' | 'dislike';
  count: number;
  isActive: boolean;
  isLoading?: boolean;
  showCount?: boolean;
}

const VoteButton = React.forwardRef<HTMLButtonElement, VoteButtonProps>(
  ({ 
    type, 
    count, 
    isActive, 
    isLoading = false, 
    showCount = true, 
    className, 
    disabled,
    ...props 
  }, ref) => {
    const Icon = type === 'like' ? ThumbsUp : ThumbsDown;
    
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || isLoading}
        className={cn(
          // Base styles
          'group relative inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          
          // Hover and active animations
          'hover:scale-105 active:scale-95',
          'transform-gpu will-change-transform',
          
          // Like button styles
          type === 'like' && [
            'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300',
            'dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900 dark:hover:border-green-700',
            isActive && [
              'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/25',
              'dark:bg-green-600 dark:border-green-600 dark:shadow-green-600/25',
              'hover:bg-green-600 hover:border-green-600 dark:hover:bg-green-700 dark:hover:border-green-700'
            ]
          ],
          
          // Dislike button styles  
          type === 'dislike' && [
            'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300',
            'dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900 dark:hover:border-red-700',
            isActive && [
              'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/25',
              'dark:bg-red-600 dark:border-red-600 dark:shadow-red-600/25',
              'hover:bg-red-600 hover:border-red-600 dark:hover:bg-red-700 dark:hover:border-red-700'
            ]
          ],
          
          className
        )}
        aria-label={`${type === 'like' ? 'Like' : 'Dislike'} this song${showCount ? ` (${count} ${type}s)` : ''}`}
        aria-pressed={isActive}
        role="button"
        {...props}
      >
        {/* Icon with loading state */}
        <Icon 
          className={cn(
            'h-4 w-4 transition-all duration-200',
            isLoading && 'animate-pulse',
            isActive && 'scale-110',
            'group-hover:scale-110'
          )} 
        />
        
        {/* Count with animated updates */}
        {showCount && (
          <span 
            className={cn(
              'min-w-[1.5rem] text-center font-semibold transition-all duration-300',
              'transform-gpu will-change-transform',
              // Animate count changes
              'animate-in fade-in-0 zoom-in-95 duration-300'
            )}
            key={count} // Force re-render on count change for animation
          >
            {count}
          </span>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-current/10 rounded-lg">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        )}
        
        {/* Ripple effect on click */}
        <span 
          className={cn(
            'absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200',
            'group-active:opacity-20',
            type === 'like' ? 'bg-green-500' : 'bg-red-500'
          )}
        />
      </button>
    );
  }
);

VoteButton.displayName = 'VoteButton';

export { VoteButton };