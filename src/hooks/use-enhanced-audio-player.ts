/**
 * Enhanced Audio Player Hook with Memory Management and Performance Monitoring
 * Implements comprehensive cleanup, circuit breaker pattern, and performance tracking
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useCircuitBreaker } from './use-circuit-breaker';
import { usePerformanceMonitoring } from './use-performance-monitoring';

export interface AudioPlayerState {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  isLoading: boolean;
  error: string | null;
  streamUrl: string;
  isLive: boolean;
}

export interface AudioMetrics {
  bufferHealth: number;
  dropouts: number;
  latency: number;
  quality: 'high' | 'medium' | 'low';
  bitrate: number;
}

export interface AudioPlayerOptions {
  streamUrl: string;
  autoPlay?: boolean;
  volume?: number;
  enableMetrics?: boolean;
  enableCircuitBreaker?: boolean;
  hlsConfig?: Partial<Hls['config']>;
}

const DEFAULT_HLS_CONFIG: Partial<Hls['config']> = {
  debug: false,
  enableWorker: true,
  lowLatencyMode: true,
  backBufferLength: 30,
  maxBufferLength: 60,
  maxMaxBufferLength: 120,
  maxBufferSize: 60 * 1000 * 1000, // 60MB
  maxBufferHole: 0.5,
  highBufferWatchdogPeriod: 2,
  nudgeOffset: 0.1,
  nudgeMaxRetry: 3,
  maxFragLookUpTolerance: 0.25,
  liveSyncDurationCount: 3,
  liveMaxLatencyDurationCount: 10,
  liveDurationInfinity: false,
  enableSoftwareAES: true,
  manifestLoadingTimeOut: 10000,
  manifestLoadingMaxRetry: 3,
  manifestLoadingRetryDelay: 1000,
  levelLoadingTimeOut: 10000,
  levelLoadingMaxRetry: 3,
  levelLoadingRetryDelay: 1000,
  fragLoadingTimeOut: 20000,
  fragLoadingMaxRetry: 6,
  fragLoadingRetryDelay: 1000,
  startFragPrefetch: true,
  testBandwidth: true,
};

export function useEnhancedAudioPlayer(options: AudioPlayerOptions) {
  const {
    streamUrl,
    autoPlay = false,
    volume: initialVolume = 0.7,
    enableMetrics = true,
    enableCircuitBreaker = true,
    hlsConfig = {},
  } = options;

  // State management
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    volume: initialVolume,
    isMuted: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    isLoading: false,
    error: null,
    streamUrl,
    isLive: true,
  });

  const [metrics, setMetrics] = useState<AudioMetrics>({
    bufferHealth: 100,
    dropouts: 0,
    latency: 0,
    quality: 'high',
    bitrate: 0,
  });

  // Refs for cleanup and performance
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();
  const metricsIntervalRef = useRef<NodeJS.Timeout>();
  const cleanupCallbacksRef = useRef<(() => void)[]>([]);

  // Performance monitoring and circuit breaker
  const performanceMonitor = usePerformanceMonitoring({
    enabled: enableMetrics,
    componentName: 'AudioPlayer',
    updateInterval: 2000,
    onAlert: (alert) => {
      console.warn('[Audio Player] Performance alert:', alert);
    },
  });

  const circuitBreaker = useCircuitBreaker({
    name: 'AudioPlayer',
    failureThreshold: 3,
    recoveryTimeout: 30000,
    successThreshold: 2,
  });

  /**
   * Comprehensive cleanup function
   */
  const cleanup = useCallback(() => {
    console.log('[Audio Player] Starting cleanup...');

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    // Clear metrics interval
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = undefined;
    }

    // Cleanup HLS
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
        hlsRef.current = null;
        console.log('[Audio Player] HLS instance destroyed');
      } catch (error) {
        console.error('[Audio Player] Error destroying HLS:', error);
      }
    }

    // Cleanup audio context and nodes
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
        console.log('[Audio Player] Source node disconnected');
      } catch (error) {
        console.error('[Audio Player] Error disconnecting source node:', error);
      }
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
        analyserRef.current = null;
        console.log('[Audio Player] Analyser node disconnected');
      } catch (error) {
        console.error('[Audio Player] Error disconnecting analyser:', error);
      }
    }

    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        audioContextRef.current = null;
        console.log('[Audio Player] Audio context closed');
      } catch (error) {
        console.error('[Audio Player] Error closing audio context:', error);
      }
    }

    // Cleanup audio element
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        console.log('[Audio Player] Audio element cleaned');
      } catch (error) {
        console.error('[Audio Player] Error cleaning audio element:', error);
      }
    }

    // Run additional cleanup callbacks
    cleanupCallbacksRef.current.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[Audio Player] Error in cleanup callback:', error);
      }
    });
    cleanupCallbacksRef.current = [];

    console.log('[Audio Player] Cleanup completed');
  }, []);

  /**
   * Registers a cleanup callback
   */
  const addCleanupCallback = useCallback((callback: () => void) => {
    cleanupCallbacksRef.current.push(callback);
  }, []);

  /**
   * Initializes audio context and analyser
   */
  const initializeAudioContext = useCallback(async () => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(audioRef.current);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;

      console.log('[Audio Player] Audio context initialized');
    } catch (error) {
      console.error('[Audio Player] Failed to initialize audio context:', error);
    }
  }, []);

  /**
   * Updates buffer health metrics
   */
  const updateBufferMetrics = useCallback(() => {
    if (!audioRef.current) return;

    try {
      const audio = audioRef.current;
      const buffered = audio.buffered;
      const currentTime = audio.currentTime;
      
      let bufferHealth = 100;
      let bufferedAmount = 0;

      if (buffered.length > 0) {
        // Find the buffer range that contains current time
        for (let i = 0; i < buffered.length; i++) {
          if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
            bufferedAmount = buffered.end(i) - currentTime;
            break;
          }
        }
        
        // Calculate buffer health (0-100%)
        bufferHealth = Math.min(100, (bufferedAmount / 10) * 100); // 10 seconds = 100%
      }

      setMetrics(prev => ({
        ...prev,
        bufferHealth,
      }));

      // Update performance monitoring
      if (enableMetrics) {
        performanceMonitor.updateAudioMetrics({
          bufferHealth,
          dropouts: metrics.dropouts,
          latency: metrics.latency,
        });
      }
    } catch (error) {
      console.error('[Audio Player] Error updating buffer metrics:', error);
    }
  }, [enableMetrics, performanceMonitor, metrics.dropouts, metrics.latency]);

  /**
   * Initializes HLS with comprehensive error handling
   */
  const initializeHLS = useCallback(async () => {
    if (!audioRef.current || !Hls.isSupported()) {
      console.warn('[Audio Player] HLS not supported, falling back to native playback');
      return;
    }

    try {
      const hls = new Hls({
        ...DEFAULT_HLS_CONFIG,
        ...hlsConfig,
      });

      // HLS event handlers
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('[Audio Player] HLS media attached');
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[Audio Player] HLS manifest parsed');
        if (autoPlay) {
          audioRef.current?.play().catch(console.error);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[Audio Player] HLS error:', data);
        
        if (data.fatal) {
          setState(prev => ({ ...prev, error: `HLS Error: ${data.details}` }));
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[Audio Player] Fatal network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[Audio Player] Fatal media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.log('[Audio Player] Fatal error, destroying HLS...');
              hls.destroy();
              break;
          }
        }
      });

      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        updateBufferMetrics();
      });

      hls.attachMedia(audioRef.current);
      hls.loadSource(streamUrl);
      hlsRef.current = hls;

      console.log('[Audio Player] HLS initialized');
    } catch (error) {
      console.error('[Audio Player] Failed to initialize HLS:', error);
      setState(prev => ({ ...prev, error: 'Failed to initialize audio stream' }));
    }
  }, [streamUrl, autoPlay, hlsConfig, updateBufferMetrics]);

  /**
   * Audio event handlers
   */
  const setupAudioEventHandlers = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const handleLoadStart = () => setState(prev => ({ ...prev, isLoading: true, error: null }));
    const handleCanPlay = () => setState(prev => ({ ...prev, isLoading: false }));
    const handlePlay = () => setState(prev => ({ ...prev, isPlaying: true }));
    const handlePause = () => setState(prev => ({ ...prev, isPlaying: false }));
    const handleEnded = () => setState(prev => ({ ...prev, isPlaying: false }));
    const handleError = (e: Event) => {
      const error = (e.target as HTMLAudioElement).error;
      const errorMessage = error ? `Audio Error: ${error.message}` : 'Unknown audio error';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
    };

    const handleTimeUpdate = () => {
      setState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
      }));
      updateBufferMetrics();
    };

    const handleVolumeChange = () => {
      setState(prev => ({
        ...prev,
        volume: audio.volume,
        isMuted: audio.muted,
      }));
    };

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('volumechange', handleVolumeChange);

    // Register cleanup
    addCleanupCallback(() => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('volumechange', handleVolumeChange);
    });
  }, [addCleanupCallback, updateBufferMetrics]);

  /**
   * Initialize audio player
   */
  const initialize = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      await performanceMonitor.measureOperation(async () => {
        await initializeAudioContext();
        setupAudioEventHandlers();
        await initializeHLS();
      }, 'AudioPlayerInitialization');
    } catch (error) {
      console.error('[Audio Player] Initialization failed:', error);
      setState(prev => ({ ...prev, error: 'Failed to initialize audio player' }));
    }
  }, [performanceMonitor, initializeAudioContext, setupAudioEventHandlers, initializeHLS]);

  /**
   * Play/pause toggle with circuit breaker
   */
  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current || !circuitBreaker.isRequestAllowed()) return;

    try {
      await circuitBreaker.execute(async () => {
        if (state.isPlaying) {
          audioRef.current!.pause();
        } else {
          await audioRef.current!.play();
        }
      });
    } catch (error) {
      console.error('[Audio Player] Play/pause failed:', error);
      setState(prev => ({ ...prev, error: 'Playback failed' }));
    }
  }, [state.isPlaying, circuitBreaker]);

  /**
   * Set volume with validation
   */
  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioRef.current.volume = clampedVolume;
  }, []);

  /**
   * Set muted state
   */
  const setMuted = useCallback((muted: boolean) => {
    if (!audioRef.current) return;
    audioRef.current.muted = muted;
  }, []);

  /**
   * Seek to specific time (for non-live streams)
   */
  const seekTo = useCallback((time: number) => {
    if (!audioRef.current || state.isLive) return;
    audioRef.current.currentTime = Math.max(0, Math.min(state.duration, time));
  }, [state.isLive, state.duration]);

  // Initialize on mount
  useEffect(() => {
    if (audioRef.current) {
      initialize();
    }

    return cleanup;
  }, [initialize, cleanup]);

  // Metrics collection
  useEffect(() => {
    if (!enableMetrics) return;

    const interval = setInterval(() => {
      updateBufferMetrics();
    }, 1000);

    metricsIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [enableMetrics, updateBufferMetrics]);

  return {
    // State
    ...state,
    metrics,
    
    // Actions
    togglePlayPause,
    setVolume,
    setMuted,
    seekTo,
    
    // Refs for external access
    audioRef,
    analyserRef,
    audioContextRef,
    
    // Performance data
    performanceStats: performanceMonitor.getPerformanceSummary(),
    circuitBreakerStats: circuitBreaker.stats,
    
    // Cleanup
    cleanup,
  };
}