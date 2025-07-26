'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import type { DiscordUser } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface UserProfileProps {
  /**
   * Discord user information
   */
  user: DiscordUser;
  
  /**
   * Callback when logout is clicked
   */
  onLogout?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Component that displays the authenticated user's profile with avatar and logout button
 */
export const UserProfile = React.forwardRef<HTMLDivElement, UserProfileProps>(
  ({ user, onLogout, className }, ref) => {
    // Generate Discord avatar URL
    const avatarUrl = user.avatar 
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
      : null;

    // Generate fallback initials from username
    const fallbackInitials = user.username
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || user.username.charAt(0).toUpperCase();

    const handleLogout = React.useCallback(() => {
      onLogout?.();
    }, [onLogout]);

    return (
      <div 
        ref={ref}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border',
          className
        )}
      >
        {/* User Avatar */}
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={avatarUrl || undefined} 
            alt={`${user.username}'s avatar`}
          />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {fallbackInitials}
          </AvatarFallback>
        </Avatar>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {user.username}
          </p>
          <p className="text-xs text-muted-foreground">
            Authenticated with Discord
          </p>
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Sign out</span>
        </Button>
      </div>
    );
  }
);

UserProfile.displayName = 'UserProfile';