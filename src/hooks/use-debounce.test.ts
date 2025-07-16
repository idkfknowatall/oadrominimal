import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce } from './use-debounce';

describe('useDebounce', () => {
  beforeAll(() => {
    // Use fake timers to control time-based logic like setTimeout
    jest.useFakeTimers();
  });

  afterAll(() => {
    // Restore real timers after all tests in this file
    jest.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should not update the value immediately after a change', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    // Change the value
    rerender({ value: 'updated', delay: 500 });

    // The debounced value should still be the initial one
    expect(result.current).toBe('initial');
  });

  it('should update the value after the specified delay', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    rerender({ value: 'updated', delay: 500 });

    // Fast-forward time by the delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Wait for the hook to update and assert the new value
    await waitFor(() => expect(result.current).toBe('updated'));
  });

  it('should only update with the latest value after multiple rapid changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'first', delay: 500 },
      }
    );

    // Fire off multiple updates within the delay period
    rerender({ value: 'second', delay: 500 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ value: 'third', delay: 500 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ value: 'final', delay: 500 });

    // At this point, the value should still be the original
    expect(result.current).toBe('first');

    // Now, advance time past the final debounce timeout
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Assert that the value is the final one, not any of the intermediate ones
    await waitFor(() => expect(result.current).toBe('final'));
  });
});
