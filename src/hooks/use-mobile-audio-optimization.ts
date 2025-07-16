'use client';

import { useEffect } from 'react';

/**
 * Mobile Audio Optimization Hook
 * Applies mobile-specific audio optimizations to prevent crackling and improve performance
 */
export function useMobileAudioOptimization(audioRef: React.RefObject<HTMLAudioElement>, isMobile: boolean) {
  useEffect(() => {
    if (!audioRef.current || !isMobile) return;

    const audio = audioRef.current;

    // Apply mobile-specific audio optimizations
    const optimizeForMobile = () => {
      // Prevent iOS audio session interruptions
      if ('webkitAudioContext' in window) {
        // iOS-specific optimizations
        audio.setAttribute('webkit-playsinline', 'true');
        audio.setAttribute('playsinline', 'true');
      }

      // Android-specific optimizations
      if (navigator.userAgent.includes('Android')) {
        // Reduce buffer size for Android to prevent crackling
        if ('mozAudioChannelType' in audio) {
          (audio as any).mozAudioChannelType = 'content';
        }
      }

      // General mobile optimizations
      audio.preload = 'none';
      audio.crossOrigin = 'anonymous';
      
      // Prevent audio interruptions on mobile
      const handleVisibilityChange = () => {
        if (document.hidden && !audio.paused) {
          // Don't pause audio when tab becomes hidden on mobile
          audio.play().catch(() => {
            // Ignore play errors when tab is hidden
          });
        }
      };

      // Handle audio interruptions (phone calls, notifications, etc.)
      const handleAudioInterruption = () => {
        if (!audio.paused) {
          // Try to resume audio after interruption
          setTimeout(() => {
            audio.play().catch(() => {
              // Ignore errors if user interaction is required
            });
          }, 1000);
        }
      };

      // Add event listeners for mobile-specific scenarios
      document.addEventListener('visibilitychange', handleVisibilityChange);
      audio.addEventListener('pause', handleAudioInterruption);
      
      // iOS-specific audio session handling
      if ('webkitAudioContext' in window) {
        const handleTouchStart = () => {
          // Resume audio context on user interaction (iOS requirement)
          if (audio.paused) {
            audio.play().catch(() => {
              // User interaction required
            });
          }
          document.removeEventListener('touchstart', handleTouchStart);
        };
        
        document.addEventListener('touchstart', handleTouchStart, { once: true });
      }

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        audio.removeEventListener('pause', handleAudioInterruption);
      };
    };

    const cleanup = optimizeForMobile();

    return cleanup;
  }, [audioRef, isMobile]);
}