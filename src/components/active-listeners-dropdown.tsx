'use client';

import { useRadio } from '@/contexts/radio-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ServerCrash, UserX } from 'lucide-react';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useActiveListeners } from '@/hooks/use-active-listeners';

const MAX_LISTENERS_TO_SHOW = 10;

export default function ActiveListenersDropdown() {
  const { openUserProfile, listenerCount } = useRadio();
  const { listeners, isLoading, error } = useActiveListeners();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-destructive text-sm text-center">
          <ServerCrash className="h-6 w-6 mb-2" />
          <p>Could not load listeners.</p>
        </div>
      );
    }

    const listenersToShow = listeners.slice(0, MAX_LISTENERS_TO_SHOW);
    const remainingCount = listenerCount - listenersToShow.length;

    if (listenerCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-muted-foreground text-sm text-center">
          <UserX className="h-6 w-6 mb-2" />
          <p>No active listeners found.</p>
        </div>
      );
    }

    return (
      <div className="space-y-1 p-1">
        {listenersToShow.map((listener) => (
          <DropdownMenuItem
            key={listener.id}
            onSelect={(e) => {
              e.preventDefault();
              openUserProfile(listener.id);
            }}
          >
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={listener.avatar ?? undefined}
                  alt={listener.name ?? 'User'}
                />
                <AvatarFallback>
                  {listener.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{listener.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
        {remainingCount > 0 && (
          <DropdownMenuItem
            disabled
            className="opacity-100 cursor-default justify-center text-xs text-muted-foreground"
          >
            ...and {remainingCount} other listener
            {remainingCount > 1 ? 's' : ''}
          </DropdownMenuItem>
        )}
      </div>
    );
  };

  return (
    <>
      <DropdownMenuLabel>Listeners ({listenerCount})</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {renderContent()}
    </>
  );
}
