'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  avatar: string;
  avatarUrl: string;
}

export default function UserSession() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
          const data = await response.json();
          if (data.isLoggedIn) {
            setUser(data.user);
            setIsLoggedIn(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user session:', error);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/discord/logout', { method: 'POST' });
      setUser(null);
      setIsLoggedIn(false);
      // Use router.refresh() instead of window.location.reload() to avoid hard refresh
      router.refresh();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  if (!isLoggedIn) {
    return (
      <Button
        variant="outline"
        className="w-full h-10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30 hover:border-indigo-400/50 hover:bg-gradient-to-r hover:from-indigo-500/20 hover:to-purple-500/20 transition-all duration-300 group"
        onClick={() => {
          window.location.href = '/api/auth/discord/login';
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <span className="text-sm font-medium text-foreground group-hover:text-indigo-300 transition-colors">
            Login to vote
          </span>
        </div>
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        {user && (
          <>
            <Image
              src={user.avatarUrl}
              alt={user.username}
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-sm font-medium">{user.username}</span>
          </>
        )}
      </div>
      <Button variant="outline" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
}
