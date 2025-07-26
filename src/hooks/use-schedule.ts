'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import type { ScheduleData, ScheduleEntry } from '@/lib/schedule-types';
// Schedule utility functions are available but not currently used

const SCHEDULE_REFRESH_INTERVAL = 60000; // 1 minute

// Fetcher function for SWR
const fetcher = async (url: string): Promise<ScheduleData> => {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

export function useSchedule() {
  const { data, error, isLoading, mutate } = useSWR<ScheduleData>(
    '/api/schedule',
    fetcher,
    {
      refreshInterval: SCHEDULE_REFRESH_INTERVAL,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onError: (error) => {
        console.warn('[Schedule] Fetch error:', error.message);
      },
    }
  );

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    scheduleData: data,
    entries: data?.entries || [],
    currentEntry: data?.currentEntry,
    nextEntry: data?.nextEntry,
    isLoading,
    error,
    refresh,
    lastUpdated: data?.lastUpdated,
  };
}

// Hook for getting upcoming schedule entries (next 24 hours)
export function useUpcomingSchedule() {
  const { scheduleData, isLoading, error, refresh } = useSchedule();
  const [upcomingEntries, setUpcomingEntries] = useState<ScheduleEntry[]>([]);

  useEffect(() => {
    if (!scheduleData?.entries) {
      setUpcomingEntries([]);
      return;
    }

    const now = Date.now() / 1000;
    const next24Hours = now + (24 * 60 * 60); // 24 hours from now

    const upcoming = scheduleData.entries
      .filter(entry => entry.start_timestamp >= now && entry.start_timestamp <= next24Hours)
      .sort((a, b) => a.start_timestamp - b.start_timestamp)
      .slice(0, 10); // Limit to next 10 entries

    setUpcomingEntries(upcoming);
  }, [scheduleData]);

  return {
    upcomingEntries,
    isLoading,
    error,
    refresh,
  };
}

// Hook for current schedule status
export function useCurrentSchedule() {
  const { scheduleData, isLoading, error, refresh } = useSchedule();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!scheduleData?.currentEntry) {
      setTimeRemaining(0);
      return;
    }

    const updateTimeRemaining = () => {
      const now = Date.now() / 1000;
      const remaining = scheduleData.currentEntry!.end_timestamp - now;
      setTimeRemaining(Math.max(0, remaining));
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [scheduleData?.currentEntry]);

  return {
    currentEntry: scheduleData?.currentEntry,
    nextEntry: scheduleData?.nextEntry,
    timeRemaining,
    isLoading,
    error,
    refresh,
  };
}