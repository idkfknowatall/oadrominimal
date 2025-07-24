import { renderHook, act } from '@testing-library/react';
import { usePerformanceMonitoring } from '@/hooks/use-performance-monitoring';

describe('usePerformanceMonitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock performance.now
    jest.spyOn(performance, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with empty metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    const report = result.current.getReport();
    expect(report.metrics).toHaveLength(0);
    expect(report.summary.totalEvents).toBe(0);
  });

  it('should report metrics correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    act(() => {
      result.current.reportMetric('test_metric', 100, { context: 'test' });
    });
    
    const report = result.current.getReport();
    expect(report.metrics).toHaveLength(1);
    expect(report.metrics[0]).toEqual({
      name: 'test_metric',
      value: 100,
      timestamp: expect.any(Number),
      metadata: { context: 'test' }
    });
  });

  it('should start and end timers correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    // Mock performance.now to return different values
    jest.spyOn(performance, 'now')
      .mockReturnValueOnce(1000) // Start time
      .mockReturnValueOnce(1500); // End time
    
    act(() => {
      result.current.startTimer('test_timer');
    });
    
    act(() => {
      const duration = result.current.endTimer('test_timer');
      expect(duration).toBe(500);
    });
    
    const report = result.current.getReport();
    expect(report.metrics).toHaveLength(1);
    expect(report.metrics[0].name).toBe('test_timer');
    expect(report.metrics[0].value).toBe(500);
  });

  it('should measure async functions', async () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    const mockAsyncFn = jest.fn().mockResolvedValue('success');
    
    // Mock performance.now to return different values
    jest.spyOn(performance, 'now')
      .mockReturnValueOnce(1000) // Start time
      .mockReturnValueOnce(1200); // End time
    
    await act(async () => {
      const response = await result.current.measureAsync('async_test', mockAsyncFn, { test: true });
      expect(response).toBe('success');
    });
    
    expect(mockAsyncFn).toHaveBeenCalled();
    
    const report = result.current.getReport();
    expect(report.metrics).toHaveLength(1);
    expect(report.metrics[0]).toEqual({
      name: 'async_test',
      value: 200,
      timestamp: expect.any(Number),
      metadata: { test: true, success: true }
    });
  });

  it('should measure sync functions', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    const mockSyncFn = jest.fn().mockReturnValue('sync_result');
    
    // Mock performance.now to return different values
    jest.spyOn(performance, 'now')
      .mockReturnValueOnce(1000) // Start time
      .mockReturnValueOnce(1150); // End time
    
    act(() => {
      const response = result.current.measureSync('sync_test', mockSyncFn, { sync: true });
      expect(response).toBe('sync_result');
    });
    
    expect(mockSyncFn).toHaveBeenCalled();
    
    const report = result.current.getReport();
    expect(report.metrics).toHaveLength(1);
    expect(report.metrics[0]).toEqual({
      name: 'sync_test',
      value: 150,
      timestamp: expect.any(Number),
      metadata: { sync: true, success: true }
    });
  });

  it('should handle async function errors', async () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    const mockAsyncFn = jest.fn().mockRejectedValue(new Error('Test error'));
    
    // Mock performance.now to return different values
    jest.spyOn(performance, 'now')
      .mockReturnValueOnce(1000) // Start time
      .mockReturnValueOnce(1300); // End time
    
    await act(async () => {
      try {
        await result.current.measureAsync('async_error_test', mockAsyncFn);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(new Error('Test error'));
      }
    });
    
    const report = result.current.getReport();
    expect(report.metrics).toHaveLength(1);
    expect(report.metrics[0]).toEqual({
      name: 'async_error_test',
      value: 300,
      timestamp: expect.any(Number),
      metadata: { success: false, error: 'Test error' }
    });
  });

  it('should calculate summary statistics correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    act(() => {
      result.current.reportMetric('load_time', 100);
      result.current.reportMetric('load_time', 200);
      result.current.reportMetric('render_time', 50);
      result.current.reportMetric('error_metric', 10, { success: false });
    });
    
    const report = result.current.getReport();
    
    expect(report.summary.totalEvents).toBe(4);
    expect(report.summary.averageLoadTime).toBe(150); // (100 + 200) / 2
    expect(report.summary.averageRenderTime).toBe(50);
    expect(report.summary.errorRate).toBe(0.25); // 1 error out of 4 total
  });

  it('should clear metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    act(() => {
      result.current.reportMetric('test_metric', 100);
    });
    
    expect(result.current.getReport().metrics).toHaveLength(1);
    
    act(() => {
      result.current.clearMetrics();
    });
    
    expect(result.current.getReport().metrics).toHaveLength(0);
  });

  it('should limit metrics to prevent memory leaks', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    // Add more than 1000 metrics
    act(() => {
      for (let i = 0; i < 1050; i++) {
        result.current.reportMetric(`metric_${i}`, i);
      }
    });
    
    const report = result.current.getReport();
    expect(report.metrics).toHaveLength(1000); // Should be limited to 1000
    
    // Should keep the most recent metrics
    expect(report.metrics[0].name).toBe('metric_50');
    expect(report.metrics[999].name).toBe('metric_1049');
  });
});