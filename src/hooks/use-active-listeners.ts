'use client';

import { useState, useEffect } from 'react';
import type { ActiveListener } from '@/lib/types';

// Module-level cache to prevent re-fetching on rapid component remounts
let lastFetchTimestamp = 0;
let cachedListeners: ActiveListener[] = [];
const CACHE_DURATION = 60 * 1000; // 1 minute

/**
 * FOR TESTING PURPOSES ONLY.
 * Clears the internal module cache.
 */
export function clearCacheForTesting() {
  lastFetchTimestamp = 0;
  cachedListeners = [];
}

export function useActiveListeners() {
  const [listeners, setListeners] = useState<ActiveListener[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Always start in a loading state
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchListeners = async () => {
      const now = Date.now();
      if (
        now - lastFetchTimestamp < CACHE_DURATION &&
        cachedListeners.length > 0
      ) {
        // Use cached data if it's fresh enough
        if (isMounted) {
          setListeners(cachedListeners);
          setIsLoading(false);
        }
        return;
      }

      // No valid cache, proceed to fetch. isLoading is already true.

      try {
        const response = await fetch('/api/listeners/active');
        if (!isMounted) return;

        if (!response.ok) {
          throw new Error('Failed to fetch active listeners.');
        }
        const data = await response.json();
        if (isMounted) {
          setListeners(data);
          // Update the cache
          cachedListeners = data;
          lastFetchTimestamp = now;
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'An unknown error occurred.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchListeners();

    return () => {
      isMounted = false;
    };
  }, []);

  return { listeners, isLoading, error };
}
