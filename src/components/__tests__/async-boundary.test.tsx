import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AsyncBoundary, { useAsyncErrorHandler, withAsyncErrorHandling } from '../async-boundary';

// Mock PromiseRejectionEvent for Jest environment
class MockPromiseRejectionEvent extends Event {
  promise: Promise<any>;
  reason: any;

  constructor(type: string, eventInitDict: { promise: Promise<any>; reason: any }) {
    super(type);
    this.promise = eventInitDict.promise;
    this.reason = eventInitDict.reason;
  }
}

// Make PromiseRejectionEvent available globally
(global as any).PromiseRejectionEvent = MockPromiseRejectionEvent;

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleGroup = console.group;
const originalConsoleGroupEnd = console.groupEnd;

beforeAll(() => {
  console.error = jest.fn();
  console.group = jest.fn();
  console.groupEnd = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.group = originalConsoleGroup;
  console.groupEnd = originalConsoleGroupEnd;
});

// Simple test component
const TestComponent = () => <div>Test content</div>;

describe('AsyncBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('renders children when there is no error', () => {
    render(
      <AsyncBoundary>
        <TestComponent />
      </AsyncBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('handles unhandled promise rejections', async () => {
    render(
      <AsyncBoundary>
        <TestComponent />
      </AsyncBoundary>
    );

    // Trigger unhandled rejection event
    const rejectedPromise = Promise.reject(new Error('Test async error'));
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: rejectedPromise,
      reason: new Error('Test async error'),
    });

    // Catch the promise to prevent Jest from seeing it as unhandled
    rejectedPromise.catch(() => {});

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(screen.getByText('Async Operation Failed')).toBeInTheDocument();
    });
  });

  it('shows network error UI for network-related errors', async () => {
    render(
      <AsyncBoundary>
        <div>Content</div>
      </AsyncBoundary>
    );

    // Simulate network error
    const networkError = new Error('Network connection failed');
    const rejectedPromise = Promise.reject(networkError);
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: rejectedPromise,
      reason: networkError,
    });

    // Catch the promise to prevent Jest from seeing it as unhandled
    rejectedPromise.catch(() => {});

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Network Connection Problem')).toBeInTheDocument();
    });
  });

  it('shows timeout error UI for timeout-related errors', async () => {
    render(
      <AsyncBoundary>
        <div>Content</div>
      </AsyncBoundary>
    );

    const timeoutError = new Error('Request timeout occurred');
    const rejectedPromise = Promise.reject(timeoutError);
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: rejectedPromise,
      reason: timeoutError,
    });

    // Catch the promise to prevent Jest from seeing it as unhandled
    rejectedPromise.catch(() => {});

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(screen.getByText('Request Timeout')).toBeInTheDocument();
      expect(screen.getByText('Operation Timed Out')).toBeInTheDocument();
    });
  });

  it('shows auth error UI for authentication-related errors', async () => {
    render(
      <AsyncBoundary>
        <div>Content</div>
      </AsyncBoundary>
    );

    const authError = new Error('Unauthorized access');
    const rejectedPromise = Promise.reject(authError);
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: rejectedPromise,
      reason: authError,
    });

    // Catch the promise to prevent Jest from seeing it as unhandled
    rejectedPromise.catch(() => {});

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });
  });

  it('shows network status when enabled', async () => {
    render(
      <AsyncBoundary showNetworkStatus={true}>
        <div>Content</div>
      </AsyncBoundary>
    );

    const error = new Error('Test error');
    const rejectedPromise = Promise.reject(error);
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: rejectedPromise,
      reason: error,
    });

    // Catch the promise to prevent Jest from seeing it as unhandled
    rejectedPromise.catch(() => {});

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });

  it('shows offline status when network is offline', async () => {
    // Mock offline status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(
      <AsyncBoundary showNetworkStatus={true}>
        <div>Content</div>
      </AsyncBoundary>
    );

    const error = new Error('Test error');
    const rejectedPromise = Promise.reject(error);
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: rejectedPromise,
      reason: error,
    });

    // Catch the promise to prevent Jest from seeing it as unhandled
    rejectedPromise.catch(() => {});

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  it('handles retry functionality', async () => {
    jest.useFakeTimers();

    render(
      <AsyncBoundary retryDelay={1000} maxRetries={2}>
        <div>Content</div>
      </AsyncBoundary>
    );

    const error = new Error('Test error');
    const rejectedPromise = Promise.reject(error);
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: rejectedPromise,
      reason: error,
    });

    // Catch the promise to prevent Jest from seeing it as unhandled
    rejectedPromise.catch(() => {});

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(screen.getByText('Retry (0/2)')).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /retry \(0\/2\)/i }));

    expect(screen.getByText('Retrying...')).toBeInTheDocument();

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    jest.useRealTimers();
  });

  it('disables retry when max retries reached', async () => {
    render(
      <AsyncBoundary maxRetries={0}>
        <div>Content</div>
      </AsyncBoundary>
    );

    const error = new Error('Test error');
    const rejectedPromise = Promise.reject(error);
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: rejectedPromise,
      reason: error,
    });

    // Catch the promise to prevent Jest from seeing it as unhandled
    rejectedPromise.catch(() => {});

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(screen.getByText('Maximum retry attempts reached. Please reload the page or try again later.')).toBeInTheDocument();
    });
  });

  it('calls onAsyncError callback when error occurs', async () => {
    const onAsyncError = jest.fn();

    render(
      <AsyncBoundary onAsyncError={onAsyncError}>
        <div>Content</div>
      </AsyncBoundary>
    );

    const error = new Error('Test error');
    const rejectedPromise = Promise.reject(error);
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: rejectedPromise,
      reason: error,
    });

    // Catch the promise to prevent Jest from seeing it as unhandled
    rejectedPromise.catch(() => {});

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(onAsyncError).toHaveBeenCalledWith(error, undefined);
    });
  });

  it('renders custom fallback when provided', async () => {
    const customFallback = <div>Custom async error message</div>;

    render(
      <AsyncBoundary fallback={customFallback}>
        <div>Content</div>
      </AsyncBoundary>
    );

    const error = new Error('Test error');
    const rejectedPromise = Promise.reject(error);
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: rejectedPromise,
      reason: error,
    });

    // Catch the promise to prevent Jest from seeing it as unhandled
    rejectedPromise.catch(() => {});

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(screen.getByText('Custom async error message')).toBeInTheDocument();
    });
  });

  it('handles reload page button click', async () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <AsyncBoundary>
        <div>Content</div>
      </AsyncBoundary>
    );

    const error = new Error('Test error');
    const rejectedPromise = Promise.reject(error);
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: rejectedPromise,
      reason: error,
    });

    // Catch the promise to prevent Jest from seeing it as unhandled
    rejectedPromise.catch(() => {});

    act(() => {
      window.dispatchEvent(rejectionEvent);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /reload page/i }));
    expect(mockReload).toHaveBeenCalled();
  });
});

describe('useAsyncErrorHandler', () => {
  it('should catch and enhance async errors', async () => {
    const TestComponent = () => {
      const handleAsyncError = useAsyncErrorHandler();
      
      React.useEffect(() => {
        const failingPromise = Promise.reject(new Error('Test async error'));
        // Properly handle the promise to prevent Jest from seeing it as unhandled
        handleAsyncError(failingPromise, { operation: 'fetchData', component: 'TestComponent' })
          .catch(() => {
            // This prevents Jest from seeing it as unhandled
          });
      }, [handleAsyncError]);
      
      return <div>Test</div>;
    };

    render(<TestComponent />);
    
    // The error should be caught and logged, not thrown to the test
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});

describe('withAsyncErrorHandling', () => {
  it('should wrap async operations with error handling', async () => {
    const failingAsyncFn = () => Promise.reject(new Error('Test error'));
    
    const wrappedFn = withAsyncErrorHandling(failingAsyncFn, {
      operation: 'testOperation',
      component: 'TestComponent'
    });

    await expect(wrappedFn).rejects.toThrow('testOperation failed: Test error');
  });

  it('should pass through successful operations', async () => {
    const successfulAsyncFn = () => Promise.resolve('success');
    
    const wrappedFn = withAsyncErrorHandling(successfulAsyncFn, {
      operation: 'testOperation',
      component: 'TestComponent'
    });

    await expect(wrappedFn).resolves.toBe('success');
  });
});