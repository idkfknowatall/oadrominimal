'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import type { RequestData, RequestableSong, RequestFilters, RequestSubmission } from '@/lib/request-types';
import { filterSongs, paginateSongs, DEFAULT_FILTERS } from '@/lib/request-types';

const REQUESTS_REFRESH_INTERVAL = 300000; // 5 minutes

// Fetcher function for SWR
const fetcher = async (url: string): Promise<RequestData> => {
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

export function useRequests() {
  const { data, error, isLoading, mutate } = useSWR<RequestData>(
    '/api/requests',
    fetcher,
    {
      refreshInterval: REQUESTS_REFRESH_INTERVAL,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onError: (error) => {
        console.warn('[Requests] Fetch error:', error.message);
      },
    }
  );

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    requestData: data,
    songs: data?.songs || [],
    totalCount: data?.totalCount || 0,
    isLoading,
    error,
    refresh,
    lastUpdated: data?.lastUpdated,
  };
}

// Hook for filtered and paginated requests
export function useFilteredRequests(pageSize: number = 20) {
  const { requestData, isLoading, error, refresh } = useRequests();
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Memoized filtered and paginated results
  const filteredResults = useMemo(() => {
    if (!requestData?.songs) {
      return {
        songs: [],
        totalPages: 0,
        currentPage: 1,
        hasNext: false,
        hasPrev: false,
        totalFiltered: 0,
      };
    }

    const filtered = filterSongs(requestData.songs, filters);
    const paginated = paginateSongs(filtered, currentPage, pageSize);

    return {
      ...paginated,
      totalFiltered: filtered.length,
    };
  }, [requestData?.songs, filters, currentPage, pageSize]);


  const updateFilters = useCallback((newFilters: Partial<RequestFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const nextPage = useCallback(() => {
    if (filteredResults.hasNext) {
      setCurrentPage(prev => prev + 1);
    }
  }, [filteredResults.hasNext]);

  const prevPage = useCallback(() => {
    if (filteredResults.hasPrev) {
      setCurrentPage(prev => prev - 1);
    }
  }, [filteredResults.hasPrev]);

  return {
    songs: filteredResults.songs,
    totalPages: filteredResults.totalPages,
    currentPage: filteredResults.currentPage,
    hasNext: filteredResults.hasNext,
    hasPrev: filteredResults.hasPrev,
    totalFiltered: filteredResults.totalFiltered,
    totalCount: requestData?.totalCount || 0,
    filters,
    updateFilters,
    goToPage,
    nextPage,
    prevPage,
    isLoading,
    error,
    refresh,
  };
}

// Hook for submitting song requests
export function useRequestSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<RequestSubmission | null>(null);

  const submitRequest = useCallback(async (requestUrl: string): Promise<RequestSubmission> => {
    setIsSubmitting(true);
    setLastSubmission(null);

    try {
      const response = await fetch('/api/requests/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_url: requestUrl }),
      });

      const result = await response.json();

      const submission: RequestSubmission = {
        request_id: requestUrl.split('/').pop() || '',
        success: response.ok && result.success,
        message: result.message || (response.ok ? 'Request submitted successfully!' : result.error?.message || 'Failed to submit request'),
      };

      setLastSubmission(submission);
      return submission;

    } catch (error) {
      const submission: RequestSubmission = {
        request_id: '',
        success: false,
        message: error instanceof Error ? error.message : 'Network error occurred',
      };

      setLastSubmission(submission);
      return submission;

    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const clearLastSubmission = useCallback(() => {
    setLastSubmission(null);
  }, []);

  return {
    submitRequest,
    isSubmitting,
    lastSubmission,
    clearLastSubmission,
  };
}

// Hook for search functionality with debouncing
export function useRequestSearch(delay: number = 300) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
  };
}