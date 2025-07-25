'use client';

import { useState, useEffect, useCallback } from 'react';
import { isOnline, setupNetworkListeners } from '@/lib/service-worker';

/**
 * Hook for managing offline state and providing user feedback
 */
export interface UseOfflineStateReturn {
  isOffline: boolean;
  isOnline: boolean;
  wasOffline: boolean;
  reconnectAttempts: number;
  lastOnlineTime: number | null;
  checkConnection: () => boolean;
}

/**
 * Custom hook for offline state management with enhanced feedback
 */
export function useOfflineState(): UseOfflineStateReturn {
  const [isOfflineState, setIsOfflineState] = useState(!isOnline());
  const [wasOffline, setWasOffline] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastOnlineTime, setLastOnlineTime] = useState<number | null>(
    isOnline() ? Date.now() : null
  );

  // Manual connection check
  const checkConnection = useCallback((): boolean => {
    const online = isOnline();
    setIsOfflineState(!online);
    
    if (online && isOfflineState) {
      // Just came back online
      setWasOffline(true);
      setLastOnlineTime(Date.now());
      setReconnectAttempts(0);
      
      // Clear wasOffline flag after a delay
      setTimeout(() => setWasOffline(false), 3000);
    }
    
    return online;
  }, [isOfflineState]);

  // Set up network event listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineState] Back online');
      setIsOfflineState(false);
      setWasOffline(true);
      setLastOnlineTime(Date.now());
      setReconnectAttempts(0);
      
      // Clear wasOffline flag after showing reconnection message
      setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      console.log('[OfflineState] Gone offline');
      setIsOfflineState(true);
      setReconnectAttempts(prev => prev + 1);
    };

    const cleanup = setupNetworkListeners(handleOnline, handleOffline);

    // Initialize state
    const initialOnline = isOnline();
    setIsOfflineState(!initialOnline);
    if (initialOnline) {
      setLastOnlineTime(Date.now());
    }

    return cleanup;
  }, []);

  return {
    isOffline: isOfflineState,
    isOnline: !isOfflineState,
    wasOffline,
    reconnectAttempts,
    lastOnlineTime,
    checkConnection,
  };
}