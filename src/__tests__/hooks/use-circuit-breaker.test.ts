import { renderHook, act } from '@testing-library/react';
import { useCircuitBreaker } from '@/hooks/use-circuit-breaker';

describe('useCircuitBreaker', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize in closed state', () => {
    const { result } = renderHook(() => useCircuitBreaker());
    
    expect(result.current.state).toBe('closed');
    expect(result.current.stats.failures).toBe(0);
    expect(result.current.stats.successes).toBe(0);
  });

  it('should execute function successfully in closed state', async () => {
    const { result } = renderHook(() => useCircuitBreaker());
    const mockFn = jest.fn().mockResolvedValue('success');

    await act(async () => {
      const response = await result.current.execute(mockFn);
      expect(response).toBe('success');
    });

    expect(result.current.stats.successes).toBe(1);
    expect(result.current.stats.failures).toBe(0);
    expect(result.current.state).toBe('closed');
  });

  it('should open circuit after threshold failures', async () => {
    const { result } = renderHook(() => useCircuitBreaker({ threshold: 2, timeout: 1000, resetTimeout: 5000 }));
    const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

    // First failure
    await act(async () => {
      try {
        await result.current.execute(mockFn);
      } catch (error) {
        // Expected to fail
      }
    });

    expect(result.current.state).toBe('closed');
    expect(result.current.stats.failures).toBe(1);

    // Second failure - should open circuit
    await act(async () => {
      try {
        await result.current.execute(mockFn);
      } catch (error) {
        // Expected to fail
      }
    });

    expect(result.current.state).toBe('open');
    expect(result.current.stats.failures).toBe(2);
  });

  it('should reject requests when circuit is open', async () => {
    const { result } = renderHook(() => useCircuitBreaker({ threshold: 1, timeout: 1000, resetTimeout: 5000 }));
    const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

    // Trigger circuit to open
    await act(async () => {
      try {
        await result.current.execute(mockFn);
      } catch (error) {
        // Expected to fail
      }
    });

    expect(result.current.state).toBe('open');

    // Try to execute when circuit is open
    await act(async () => {
      try {
        await result.current.execute(jest.fn());
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(new Error('Circuit breaker is open - service unavailable'));
      }
    });
  });

  it('should transition to half-open after reset timeout', async () => {
    const { result } = renderHook(() => useCircuitBreaker({ threshold: 1, timeout: 1000, resetTimeout: 5000 }));
    const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

    // Open the circuit
    await act(async () => {
      try {
        await result.current.execute(mockFn);
      } catch (error) {
        // Expected to fail
      }
    });

    expect(result.current.state).toBe('open');

    // Fast forward time to trigger reset
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    // Try to execute - should move to half-open
    const successFn = jest.fn().mockResolvedValue('success');
    await act(async () => {
      const response = await result.current.execute(successFn);
      expect(response).toBe('success');
    });

    expect(result.current.state).toBe('closed');
  });

  it('should handle timeout correctly', async () => {
    const { result } = renderHook(() => useCircuitBreaker({ threshold: 3, timeout: 100, resetTimeout: 5000 }));
    const slowFn = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

    await act(async () => {
      try {
        await result.current.execute(slowFn);
        fail('Should have timed out');
      } catch (error) {
        expect(error).toEqual(new Error('Circuit breaker timeout'));
      }
    });

    expect(result.current.stats.failures).toBe(1);
  });

  it('should reset circuit breaker state', () => {
    const { result } = renderHook(() => useCircuitBreaker());

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('closed');
    expect(result.current.stats.failures).toBe(0);
    expect(result.current.stats.successes).toBe(0);
  });

  it('should provide health status', async () => {
    const { result } = renderHook(() => useCircuitBreaker());
    const mockFn = jest.fn().mockResolvedValue('success');

    await act(async () => {
      await result.current.execute(mockFn);
    });

    const healthStatus = result.current.getHealthStatus();
    
    expect(healthStatus.state).toBe('closed');
    expect(healthStatus.isHealthy).toBe(true);
    expect(healthStatus.successRate).toBe(1);
  });
});