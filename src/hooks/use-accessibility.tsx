'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { featureFlags } from '@/lib/feature-flags';

export interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  announcements: boolean;
}

export interface AccessibilityAnnouncement {
  message: string;
  priority: 'polite' | 'assertive';
  timeout?: number;
}

/**
 * Advanced accessibility hook with WCAG 2.1 AA compliance features
 */
export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReaderOptimized: false,
    keyboardNavigation: true,
    focusIndicators: true,
    announcements: true,
  });

  const liveRegionRef = useRef<HTMLDivElement>(null);
  const announcementTimeoutRef = useRef<NodeJS.Timeout>();

  // Apply accessibility settings to the document
  const applyAccessibilitySettings = useCallback((newSettings: AccessibilitySettings) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Apply CSS custom properties for accessibility
    if (newSettings.reduceMotion) {
      root.style.setProperty('--motion-duration', '0ms');
      root.style.setProperty('--motion-easing', 'linear');
    } else {
      root.style.removeProperty('--motion-duration');
      root.style.removeProperty('--motion-easing');
    }

    if (newSettings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (newSettings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    if (newSettings.screenReaderOptimized) {
      root.classList.add('screen-reader-optimized');
    } else {
      root.classList.remove('screen-reader-optimized');
    }

    if (newSettings.focusIndicators) {
      root.classList.add('enhanced-focus');
    } else {
      root.classList.remove('enhanced-focus');
    }

    // Set ARIA attributes
    document.body.setAttribute('data-reduce-motion', String(newSettings.reduceMotion));
    document.body.setAttribute('data-high-contrast', String(newSettings.highContrast));
    document.body.setAttribute('data-large-text', String(newSettings.largeText));
  }, []);

  // Initialize accessibility settings from system preferences and localStorage
  useEffect(() => {
    if (!featureFlags.enableA11yFeatures) return;

    const initializeSettings = () => {
      const savedSettings = localStorage.getItem('oadro_accessibility_settings');
      let newSettings = { ...settings };

      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          newSettings = { ...newSettings, ...parsed };
        } catch (error) {
          console.warn('Failed to parse saved accessibility settings:', error);
        }
      }

      // Detect system preferences
      if (typeof window !== 'undefined') {
        // Detect reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
          newSettings.reduceMotion = true;
        }

        // Detect high contrast preference
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
        if (prefersHighContrast) {
          newSettings.highContrast = true;
        }

        // Detect screen reader
        const hasScreenReader = window.navigator.userAgent.includes('NVDA') ||
                               window.navigator.userAgent.includes('JAWS') ||
                               window.speechSynthesis !== undefined;
        if (hasScreenReader) {
          newSettings.screenReaderOptimized = true;
        }
      }

      setSettings(newSettings);
      applyAccessibilitySettings(newSettings);
    };

    initializeSettings();
  }, [applyAccessibilitySettings]);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (featureFlags.enableA11yFeatures) {
      localStorage.setItem('oadro_accessibility_settings', JSON.stringify(settings));
      applyAccessibilitySettings(settings);
    }
  }, [settings, applyAccessibilitySettings]);

  // Announce message to screen readers
  const announce = useCallback((announcement: AccessibilityAnnouncement) => {
    if (!settings.announcements || !liveRegionRef.current) return;

    const { message, priority = 'polite', timeout = 5000 } = announcement;

    // Clear previous timeout
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }

    // Set aria-live attribute based on priority
    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = message;

    // Clear the announcement after timeout
    announcementTimeoutRef.current = setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, timeout);
  }, [settings.announcements]);

  // Update specific setting
  const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    const defaultSettings: AccessibilitySettings = {
      reduceMotion: false,
      highContrast: false,
      largeText: false,
      screenReaderOptimized: false,
      keyboardNavigation: true,
      focusIndicators: true,
      announcements: true,
    };
    setSettings(defaultSettings);
  }, []);

  // Keyboard navigation helpers
  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Skip link functionality
  const createSkipLink = useCallback((target: string, label: string) => {
    const skipLink = document.createElement('a');
    skipLink.href = `#${target}`;
    skipLink.textContent = label;
    skipLink.className = 'skip-link';
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const targetElement = document.getElementById(target);
      if (targetElement) {
        targetElement.focus();
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    return skipLink;
  }, []);

  // ARIA live region component
  const LiveRegion = useCallback(() => (
    <div
      ref={liveRegionRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    />
  ), []);

  return {
    settings,
    updateSetting,
    resetSettings,
    announce,
    trapFocus,
    createSkipLink,
    LiveRegion,
    applyAccessibilitySettings,
  };
}

/**
 * Hook for managing focus and keyboard navigation
 */
export function useFocusManagement() {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  const focusFirst = useCallback((container: HTMLElement) => {
    const focusableElement = container.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    
    if (focusableElement) {
      focusableElement.focus();
      setFocusedElement(focusableElement);
    }
  }, []);

  const focusLast = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    if (lastElement) {
      lastElement.focus();
      setFocusedElement(lastElement);
    }
  }, []);

  useEffect(() => {
    const handleFocusChange = () => {
      setFocusedElement(document.activeElement as HTMLElement);
    };

    document.addEventListener('focusin', handleFocusChange);
    return () => document.removeEventListener('focusin', handleFocusChange);
  }, []);

  return {
    focusedElement,
    saveFocus,
    restoreFocus,
    focusFirst,
    focusLast,
  };
}

/**
 * Hook for managing ARIA attributes and states
 */
export function useAriaState() {
  const [ariaStates, setAriaStates] = useState<Record<string, string>>({});

  const setAriaState = useCallback((key: string, value: string) => {
    setAriaStates(prev => ({ ...prev, [key]: value }));
  }, []);

  const removeAriaState = useCallback((key: string) => {
    setAriaStates(prev => {
      const newStates = { ...prev };
      delete newStates[key];
      return newStates;
    });
  }, []);

  const getAriaProps = useCallback(() => {
    const props: Record<string, string> = {};
    Object.entries(ariaStates).forEach(([key, value]) => {
      props[`aria-${key}`] = value;
    });
    return props;
  }, [ariaStates]);

  return {
    ariaStates,
    setAriaState,
    removeAriaState,
    getAriaProps,
  };
}