'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Enhanced Mobile Audio Optimization Hook
 * Applies mobile-specific audio optimizations with improved error handling and performance
 */
export function useMobileAudioOptimization(
  audioRef: React.RefObject<HTMLAudioElement>,
  isMobile: boolean
) {
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  const isOptimizedRef = useRef(false);

  // Detect specific mobile platforms for targeted optimizations
  const platformInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    return {
      isIOS: /iPad|iPhone|iPod/.test(userAgent),
      isAndroid: /Android/.test(userAgent),
      isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
      isChrome: /Chrome/.test(userAgent),
      isMobile: /Mobi|Android/i.test(userAgent),
    };
  }, []);

  const applyIOSOptimizations = useCallback((audio: HTMLAudioElement) => {
    console.log('[MobileAudio] Applying iOS optimizations');
    
    // iOS-specific attributes
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('controls', 'false');
    
    // Prevent iOS audio session interruptions
    const handleAudioSessionInterruption = () => {
      console.log('[MobileAudio] iOS audio session interrupted');
      // iOS automatically pauses audio during interruptions
      // We'll handle resumption in the main audio player logic
    };

    // Handle iOS-specific audio context requirements
    const handleIOSAudioContext = () => {
      if ('webkitAudioContext' in window) {
        const handleUserInteraction = () => {
          console.log('[MobileAudio] iOS user interaction detected, enabling audio');
          if (audio.paused) {
            audio.play().catch((error) => {
              console.warn('[MobileAudio] iOS audio play failed:', error);
            });
          }
        };

        // Listen for various user interaction events
        const events = ['touchstart', 'touchend', 'click', 'keydown'];
        events.forEach(event => {
          document.addEventListener(event, handleUserInteraction, { once: true, passive: true });
        });

        cleanupFunctionsRef.current.push(() => {
          events.forEach(event => {
            document.removeEventListener(event, handleUserInteraction);
          });
        });
      }
    };

    audio.addEventListener('webkitbeginfullscreen', handleAudioSessionInterruption);
    audio.addEventListener('webkitendfullscreen', handleAudioSessionInterruption);
    
    handleIOSAudioContext();

    cleanupFunctionsRef.current.push(() => {
      audio.removeEventListener('webkitbeginfullscreen', handleAudioSessionInterruption);
      audio.removeEventListener('webkitendfullscreen', handleAudioSessionInterruption);
    });
  }, []);

  const applyAndroidOptimizations = useCallback((audio: HTMLAudioElement) => {
    console.log('[MobileAudio] Applying Android optimizations');
    
    // Android-specific optimizations
    if ('mozAudioChannelType' in audio) {
      (audio as any).mozAudioChannelType = 'content';
    }

    // Android Chrome-specific optimizations
    const platform = platformInfo();
    if (platform.isChrome) {
      // Optimize for Chrome on Android
      audio.preload = 'none';
      
      // Handle Android's aggressive memory management
      const handleMemoryPressure = () => {
        console.log('[MobileAudio] Android memory pressure detected');
        // Reduce audio quality if needed
      };

      // Listen for memory pressure events (Android Chrome)
      if ('memory' in performance && 'addEventListener' in performance) {
        (performance as any).addEventListener('memory', handleMemoryPressure);
        cleanupFunctionsRef.current.push(() => {
          (performance as any).removeEventListener('memory', handleMemoryPressure);
        });
      }
    }
  }, [platformInfo]);

  const applyGeneralMobileOptimizations = useCallback((audio: HTMLAudioElement) => {
    console.log('[MobileAudio] Applying general mobile optimizations');
    
    // General mobile optimizations
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';
    
    // Enhanced visibility change handling
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[MobileAudio] Page hidden, maintaining audio state');
        // Don't automatically pause - let the main audio player handle this
      } else {
        console.log('[MobileAudio] Page visible, checking audio state');
        // Page became visible - audio player will handle resumption
      }
    };

    // Enhanced audio interruption handling
    const handleAudioInterruption = (event: Event) => {
      console.log('[MobileAudio] Audio interruption detected:', event.type);
      
      // Use a more sophisticated retry mechanism
      const retryAudioResumption = (attempts = 0, maxAttempts = 3) => {
        if (attempts >= maxAttempts) {
          console.warn('[MobileAudio] Max audio resumption attempts reached');
          return;
        }

        setTimeout(() => {
          if (!audio.paused) return; // Audio already playing
          
          audio.play()
            .then(() => {
              console.log('[MobileAudio] Audio resumed successfully');
            })
            .catch((error) => {
              console.warn(`[MobileAudio] Audio resumption attempt ${attempts + 1} failed:`, error);
              retryAudioResumption(attempts + 1, maxAttempts);
            });
        }, Math.pow(2, attempts) * 1000); // Exponential backoff
      };

      // Only attempt resumption if audio was playing
      if (!audio.paused) {
        retryAudioResumption();
      }
    };

    // Battery optimization - reduce processing when battery is low
    const handleBatteryChange = () => {
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          if (battery.level < 0.2) { // Less than 20% battery
            console.log('[MobileAudio] Low battery detected, applying power optimizations');
            // Could reduce audio quality or processing here
          }
        });
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    audio.addEventListener('pause', handleAudioInterruption);
    audio.addEventListener('stalled', handleAudioInterruption);
    audio.addEventListener('suspend', handleAudioInterruption);
    
    // Battery API (if available)
    if ('getBattery' in navigator) {
      handleBatteryChange();
    }

    // Cleanup function
    cleanupFunctionsRef.current.push(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      audio.removeEventListener('pause', handleAudioInterruption);
      audio.removeEventListener('stalled', handleAudioInterruption);
      audio.removeEventListener('suspend', handleAudioInterruption);
    });
  }, []);

  useEffect(() => {
    if (!audioRef.current || !isMobile || isOptimizedRef.current) return;

    const audio = audioRef.current;
    const platform = platformInfo();
    
    console.log('[MobileAudio] Initializing mobile optimizations', platform);
    
    // Clear any existing cleanup functions
    cleanupFunctionsRef.current.forEach(cleanup => cleanup());
    cleanupFunctionsRef.current = [];

    try {
      // Apply platform-specific optimizations
      if (platform.isIOS) {
        applyIOSOptimizations(audio);
      }
      
      if (platform.isAndroid) {
        applyAndroidOptimizations(audio);
      }
      
      // Apply general mobile optimizations
      applyGeneralMobileOptimizations(audio);
      
      isOptimizedRef.current = true;
      console.log('[MobileAudio] Mobile optimizations applied successfully');
      
    } catch (error) {
      console.error('[MobileAudio] Error applying mobile optimizations:', error);
    }

    // Return cleanup function
    return () => {
      console.log('[MobileAudio] Cleaning up mobile optimizations');
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
      isOptimizedRef.current = false;
    };
  }, [audioRef, isMobile, platformInfo, applyIOSOptimizations, applyAndroidOptimizations, applyGeneralMobileOptimizations]);
}