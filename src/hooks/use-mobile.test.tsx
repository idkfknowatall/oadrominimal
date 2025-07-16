import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

describe('useIsMobile', () => {
  // Store the original matchMedia implementation to restore it after tests
  const originalMatchMedia = window.matchMedia;
  let listeners: (() => void)[] = [];

  beforeAll(() => {
    // Mock window.matchMedia before all tests in this suite
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addEventListener: (event: string, listener: () => void) => {
          if (event === 'change') listeners.push(listener);
        },
        removeEventListener: (event: string, listener: () => void) => {
          if (event === 'change') {
            const index = listeners.indexOf(listener);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        },
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterAll(() => {
    // Restore the original implementation after all tests
    window.matchMedia = originalMatchMedia;
  });

  beforeEach(() => {
    // Clear listeners before each test to ensure isolation
    listeners = [];
  });

  // Helper to simulate a resize and trigger the media query change event
  const simulateResize = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    // Manually trigger all captured listeners, simulating the browser firing the 'change' event
    listeners.forEach((listener) => listener());
  };

  it('should return true on initial render for mobile width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('should return false on initial render for desktop width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('should update from desktop to mobile on resize', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    act(() => {
      simulateResize(400);
    });

    expect(result.current).toBe(true);
  });

  it('should update from mobile to desktop on resize', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 400,
    });
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);

    act(() => {
      simulateResize(1200);
    });

    expect(result.current).toBe(false);
  });
});
