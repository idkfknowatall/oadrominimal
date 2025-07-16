import { renderHook, waitFor } from '@testing-library/react';
import {
  useActiveListeners,
  clearCacheForTesting,
} from './use-active-listeners';

// Mock the global fetch function
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('useActiveListeners hook', () => {
  beforeEach(() => {
    // Reset the cache and fetch mocks before each test
    clearCacheForTesting();
    mockFetch.mockClear();
  });

  it('should return loading state initially and then data on success', async () => {
    const mockListeners = [{ id: 'user1', name: 'Test User', avatar: null }];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockListeners,
    });

    const { result } = renderHook(() => useActiveListeners());

    // Initially, it should be loading
    expect(result.current.isLoading).toBe(true);

    // After the fetch resolves...
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.listeners).toEqual(mockListeners);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    const { result } = renderHook(() => useActiveListeners());

    // Wait for the hook to finish loading
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Check that the error state is set correctly
    expect(result.current.error).toBe('Failed to fetch active listeners.');
    expect(result.current.listeners).toEqual([]);
  });

  it('should use cached data on subsequent calls within the cache duration', async () => {
    const mockListeners = [{ id: 'user1', name: 'Test User', avatar: null }];
    mockFetch.mockResolvedValue({
      // Use mockResolvedValue, not mockResolvedValueOnce
      ok: true,
      json: async () => mockListeners,
    });

    // First render, should fetch
    const { result: firstResult } = renderHook(() => useActiveListeners());
    await waitFor(() => expect(firstResult.current.isLoading).toBe(false));
    expect(firstResult.current.listeners).toEqual(mockListeners);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second render immediately after, should use cache
    const { result: secondResult } = renderHook(() => useActiveListeners());
    // It should not be loading and should immediately have the data
    expect(secondResult.current.isLoading).toBe(false);
    expect(secondResult.current.listeners).toEqual(mockListeners);
    // Fetch should NOT have been called again
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
