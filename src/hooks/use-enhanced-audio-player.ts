'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { HLS_STREAM_URL, VISUALIZER_FFT_SIZE } from '@/lib/config';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileAudioOptimization } from '@/hooks/use-mobile-audio-optimization';
import { useCircuitBreaker } from '@/hooks/use-circuit-breaker';
import { usePerformanceMonitoring } from '@/hooks/use-performance-monitoring';
import { audioLogger } from '@/lib/logger';
import { featureFlags } from '@/lib/feature-flags';

// Audio player state interface for better type safety
interface AudioPlayerState {
  isPlaying: boolean;
  streamUrl: string;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
}

// Audio connection state for better tracking
interface AudioConnectionState {
  isConnected: boolean;
  connectionAttempts: number;
  lastConnectionTime: number;
}

export function useEnhancedAudioPlayer(forceSseReconnect?: () => void) {
  // Consolidated state management
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    streamUrl: HLS_STREAM_URL,
    volume: 1,
    isMuted: false,
    isLoading: false,
    error: null,
  });
  
  // Mobile detection for optimizations
  const isMobile = useIsMobile();

  // Enhanced error handling and resilience
  const circuitBreaker = useCircuitBreaker({
    threshold: featureFlags.circuitBreakerThreshold,
    timeout: 10000,
    resetTimeout: 30000,
  });

  // Performance monitoring
  const performance = usePerformanceMonitoring();

  // Audio Engine Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Enhanced connection tracking
  const connectionStateRef = useRef<AudioConnectionState>({
    isConnected: false,
    connectionAttempts: 0,
    lastConnectionTime: 0,
  });

  // Ref to track current play promise to avoid interruptions
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Apply mobile audio optimizations
  useMobileAudioOptimization(audioRef, isMobile);

  // Memoized HLS configuration for better performance
  const hlsConfig = useMemo(() => ({
    debug: false,
    maxBufferLength: isMobile ? 15 : 30,
    maxMaxBufferLength: isMobile ? 30 : 60,
    maxBufferSize: isMobile ? 30 * 1000 * 1000 : 60 * 1000 * 1000,
    maxBufferHole: 0.5,
    lowLatencyMode: false,
    backBufferLength: isMobile ? 30 : 90,
    fragLoadingTimeOut: 20000,
    manifestLoadingTimeOut: 10000,
    enableWorker: !isMobile,
    startLevel: -1,
    capLevelToPlayerSize: true,
    liveSyncDurationCount: isMobile ? 2 : 3,
    liveMaxLatencyDurationCount: isMobile ? 5 : 10,
    maxFragLookUpTolerance: 0.25,
    maxSeekHole: 2,
    manifestLoadingMaxRetry: featureFlags.maxRetryAttempts,
    manifestLoadingRetryDelay: 1000,
    levelLoadingMaxRetry: featureFlags.maxRetryAttempts,
    levelLoadingRetryDelay: 1000,
    fragLoadingMaxRetry: featureFlags.maxRetryAttempts,
    fragLoadingRetryDelay: 1000,
  }), [isMobile]);

  // Enhanced error handling with circuit breaker
  const handleError = useCallback((error: string, context?: string, recoverable = true) => {
    const errorObj = {
      message: error,
      context: context || 'Unknown',
      timestamp: Date.now(),
      recoverable,
      circuitState: circuitBreaker.state
    };
    
    audioLogger.error(error, new Error(error), errorObj);
    
    if (featureFlags.enablePerformanceMonitoring) {
      performance.reportMetric('audio_error', 1, errorObj);
    }
    
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, [circuitBreaker.state, performance]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load stream URL from localStorage on mount
  useEffect(() => {
    const savedStreamUrl = localStorage.getItem('oadro_stream_url');
    if (savedStreamUrl) {
      setState(prev => ({ ...prev, streamUrl: savedStreamUrl }));
    }
  }, []);

  // Save stream URL to localStorage on change
  useEffect(() => {
    localStorage.setItem('oadro_stream_url', state.streamUrl);
  }, [state.streamUrl]);

  const initializeAudioGraph = useCallback(async () => {
    if (audioContextRef.current || !audioRef.current) return;
    
    return circuitBreaker.execute(async () => {
      performance.startTimer('audio_graph_init');
      
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContext({
          sampleRate: 44100,
          latencyHint: 'playback',
        });
        audioContextRef.current = context;

        const analyser = context.createAnalyser();
        analyser.fftSize = VISUALIZER_FFT_SIZE;
        analyser.smoothingTimeConstant = 0.6;
        analyserRef.current = analyser;

        const gainNode = context.createGain();
        gainNode.gain.value = state.isMuted ? 0 : state.volume;
        gainRef.current = gainNode;

        const source = context.createMediaElementSource(audioRef.current!);
        sourceRef.current = source;

        source.connect(gainNode);
        gainNode.connect(context.destination);
        source.connect(analyser);

        audioRef.current!.muted = false;
        
        const audio = audioRef.current!;
        audio.preload = 'none';
        audio.crossOrigin = 'anonymous';
        
        if ('playsInline' in audio) {
          audio.playsInline = true;
        }
        
        audioLogger.info('Audio graph initialized successfully');
        performance.endTimer('audio_graph_init', { success: true });
        
      } catch (e) {
        performance.endTimer('audio_graph_init', { success: false, error: e instanceof Error ? e.message : 'Unknown' });
        throw new Error(`Failed to initialize Web Audio API: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    });
  }, [state.volume, state.isMuted, circuitBreaker, performance]);

  const disconnect = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !connectionStateRef.current.isConnected) return;

    performance.startTimer('audio_disconnect');
    connectionStateRef.current.isConnected = false;

    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
        hlsRef.current = null;
        audioLogger.info('HLS instance destroyed');
      } catch (e) {
        audioLogger.warn('Error destroying HLS instance', { error: e });
      }
    }
    
    performance.endTimer('audio_disconnect');
  }, [performance]);

  const togglePlayPause = useCallback(async () => {
    clearError();
    
    try {
      if (!audioContextRef.current) {
        await initializeAudioGraph();
      }
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      setState(prev => {
        const newIsPlaying = !prev.isPlaying;
        if (!newIsPlaying) {
          disconnect();
        }
        return { ...prev, isPlaying: newIsPlaying, isLoading: newIsPlaying };
      });
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Failed to toggle playback', 'Toggle Play/Pause');
    }
  }, [initializeAudioGraph, disconnect, clearError, handleError]);

  const connect = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || connectionStateRef.current.isConnected) {
      return;
    }

    return circuitBreaker.execute(async () => {
      performance.startTimer('audio_connect');
      
      connectionStateRef.current.isConnected = true;
      connectionStateRef.current.connectionAttempts++;
      connectionStateRef.current.lastConnectionTime = Date.now();

      const onCanPlay = async () => {
        if (playPromiseRef.current) {
          playPromiseRef.current = null;
        }

        const playPromise = audio.play();
        playPromiseRef.current = playPromise;

        try {
          await playPromise;
          if (playPromiseRef.current === playPromise) {
            playPromiseRef.current = null;
          }
          setState(prev => ({ ...prev, isLoading: false }));
          
          if (forceSseReconnect) {
            forceSseReconnect();
          }
          
          performance.endTimer('audio_connect', { success: true });
          audioLogger.info('Audio playback started successfully');
        } catch (error) {
          performance.endTimer('audio_connect', { success: false, error: error instanceof Error ? error.message : 'Unknown' });
          throw new Error(`Audio play failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      const fallbackToMp3 = () => {
        audioLogger.info('Falling back to MP3 stream');
        const mp3Url = 'https://radio.oadro.com/listen/oadro/radio.mp3';
        audio.src = `${mp3Url}?_=${Date.now()}`;
        
        if (isMobile) {
          audio.preload = 'none';
          audio.crossOrigin = 'anonymous';
          if ('playsInline' in audio) {
            audio.playsInline = true;
          }
        }
        
        audio.load();
        audio.addEventListener('canplay', onCanPlay, { once: true });
        audio.addEventListener('error', () => {
          throw new Error('MP3 fallback also failed');
        }, { once: true });
      };

      if (state.streamUrl.endsWith('.m3u8')) {
        if (Hls.isSupported()) {
          const hls = new Hls(hlsConfig);
          hlsRef.current = hls;

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              audioLogger.error('Fatal HLS error', new Error(data.details), { type: data.type, details: data.details });
              hls.destroy();
              hlsRef.current = null;
              fallbackToMp3();
            } else {
              audioLogger.warn('Non-fatal HLS warning', { type: data.type, details: data.details });
            }
          });

          hls.loadSource(state.streamUrl);
          hls.attachMedia(audio);
          hls.once(Hls.Events.MANIFEST_PARSED, () => {
            onCanPlay();
          });

          setTimeout(() => {
            if (hlsRef.current && !audio.readyState) {
              audioLogger.warn('HLS loading timeout - falling back to MP3');
              hls.destroy();
              hlsRef.current = null;
              fallbackToMp3();
            }
          }, 10000);

        } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          audio.src = state.streamUrl;
          audio.addEventListener('canplay', onCanPlay, { once: true });
          audio.addEventListener('error', fallbackToMp3, { once: true });
        } else {
          audioLogger.info('HLS not supported - using MP3 fallback');
          fallbackToMp3();
        }
      } else {
        audio.src = `${state.streamUrl}?_=${Date.now()}`;
        
        if (isMobile) {
          audio.preload = 'none';
          audio.crossOrigin = 'anonymous';
          if ('playsInline' in audio) {
            audio.playsInline = true;
          }
        }
        
        audio.load();
        audio.addEventListener('canplay', onCanPlay, { once: true });
        audio.addEventListener('error', () => {
          throw new Error('MP3 stream failed');
        }, { once: true });
      }
    });
  }, [state.streamUrl, forceSseReconnect, hlsConfig, isMobile, circuitBreaker, performance]);

  // Effect to manage connection based on playback state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.isPlaying) {
      if (!connectionStateRef.current.isConnected) {
        connect().catch(error => {
          handleError(error instanceof Error ? error.message : 'Connection failed', 'Connection');
          setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
        });
      } else {
        if (playPromiseRef.current) {
          playPromiseRef.current = null;
        }

        const playPromise = audio.play();
        playPromiseRef.current = playPromise;

        playPromise
          .then(() => {
            if (playPromiseRef.current === playPromise) {
              playPromiseRef.current = null;
            }
            setState(prev => ({ ...prev, isLoading: false }));
          })
          .catch((error) => {
            handleError(error instanceof Error ? error.message : 'Audio resume failed', 'Resume');
            if (playPromiseRef.current === playPromise) {
              playPromiseRef.current = null;
            }
          });
      }
    } else {
      audio.pause();
    }
  }, [state.isPlaying, connect, handleError]);

  // Enhanced cleanup effect
  useEffect(() => {
    return () => {
      // Cancel any pending animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Disconnect audio nodes properly
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          audioLogger.warn('Error disconnecting source node', { error: e });
        }
        sourceRef.current = null;
      }
      
      if (gainRef.current) {
        try {
          gainRef.current.disconnect();
        } catch (e) {
          audioLogger.warn('Error disconnecting gain node', { error: e });
        }
        gainRef.current = null;
      }
      
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect();
        } catch (e) {
          audioLogger.warn('Error disconnecting analyser node', { error: e });
        }
        analyserRef.current = null;
      }
      
      // Close audio context properly
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          audioLogger.warn('Error closing audio context', { error: e });
        }
        audioContextRef.current = null;
      }
      
      // Destroy HLS instance
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (e) {
          audioLogger.warn('Error destroying HLS instance', { error: e });
        }
        hlsRef.current = null;
      }
      
      disconnect();
    };
  }, [disconnect]);

  // Effect to manage volume
  useEffect(() => {
    if (gainRef.current && audioContextRef.current) {
      const targetVolume = state.isMuted ? 0 : state.volume;
      gainRef.current.gain.setTargetAtTime(
        targetVolume,
        audioContextRef.current.currentTime,
        0.015
      );
    }
  }, [state.volume, state.isMuted]);

  // Enhanced visualizer animation with performance monitoring
  useEffect(() => {
    const visualize = () => {
      if (!analyserRef.current || !state.isPlaying) {
        return;
      }

      if (featureFlags.enablePerformanceMonitoring) {
        performance.startTimer('visualizer_frame');
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      document.dispatchEvent(
        new CustomEvent('audiodata', {
          detail: { freqData: dataArray, bufferLength },
        })
      );

      if (featureFlags.enablePerformanceMonitoring) {
        performance.endTimer('visualizer_frame');
      }

      animationFrameRef.current = requestAnimationFrame(visualize);
    };

    if (state.isPlaying) {
      if (!animationFrameRef.current) {
        visualize();
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      const bufferLength = analyserRef.current?.frequencyBinCount || 256;
      document.dispatchEvent(
        new CustomEvent('audiodata', {
          detail: { freqData: new Uint8Array(bufferLength), bufferLength },
        })
      );
    };
  }, [state.isPlaying, performance]);

  // Memoized setter functions for better performance
  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
    if (featureFlags.enablePerformanceMonitoring) {
      performance.reportMetric('volume_change', volume);
    }
  }, [performance]);

  const setIsMuted = useCallback((isMuted: boolean) => {
    setState(prev => ({ ...prev, isMuted }));
    if (featureFlags.enablePerformanceMonitoring) {
      performance.reportMetric('mute_toggle', isMuted ? 1 : 0);
    }
  }, [performance]);

  const setStreamUrl = useCallback((streamUrl: string) => {
    setState(prev => ({ ...prev, streamUrl }));
    audioLogger.info('Stream URL changed', { newUrl: streamUrl });
  }, []);

  // Health status for monitoring
  const getHealthStatus = useCallback(() => {
    const circuitHealth = circuitBreaker.getHealthStatus();
    return {
      ...circuitHealth,
      audioContext: audioContextRef.current?.state,
      isConnected: connectionStateRef.current.isConnected,
      connectionAttempts: connectionStateRef.current.connectionAttempts,
      lastConnectionTime: connectionStateRef.current.lastConnectionTime,
    };
  }, [circuitBreaker]);

  return {
    audioRef,
    analyserRef,
    isPlaying: state.isPlaying,
    volume: state.volume,
    isMuted: state.isMuted,
    streamUrl: state.streamUrl,
    isLoading: state.isLoading,
    error: state.error,
    togglePlayPause,
    setVolume,
    setIsMuted,
    setStreamUrl,
    clearError,
    getHealthStatus,
    circuitBreakerState: circuitBreaker.state,
    performanceReport: featureFlags.enablePerformanceMonitoring ? performance.getReport : undefined,
  };
}