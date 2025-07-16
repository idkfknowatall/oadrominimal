'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { HLS_STREAM_URL, VISUALIZER_FFT_SIZE } from '@/lib/config';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileAudioOptimization } from '@/hooks/use-mobile-audio-optimization';

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

export function useAudioPlayer(forceSseReconnect?: () => void) {
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
    manifestLoadingMaxRetry: 3,
    manifestLoadingRetryDelay: 1000,
    levelLoadingMaxRetry: 3,
    levelLoadingRetryDelay: 1000,
    fragLoadingMaxRetry: 3,
    fragLoadingRetryDelay: 1000,
  }), [isMobile]);

  // Enhanced error handling
  const handleError = useCallback((error: string, context?: string) => {
    console.error(`[AudioPlayer] ${context || 'Error'}:`, error);
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

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
  }, []); // Runs once on client mount

  // Save stream URL to localStorage on change
  useEffect(() => {
    localStorage.setItem('oadro_stream_url', state.streamUrl);
  }, [state.streamUrl]);

  const initializeAudioGraph = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContext({
        // Mobile-optimized audio context settings
        sampleRate: 44100, // Standard sample rate
        latencyHint: 'playback', // Optimize for playback rather than interaction
      });
      audioContextRef.current = context;

      const analyser = context.createAnalyser();
      analyser.fftSize = VISUALIZER_FFT_SIZE;
      // Mobile optimization: reduce smoothing for better performance
      analyser.smoothingTimeConstant = 0.6;
      analyserRef.current = analyser;

      const gainNode = context.createGain();
      gainNode.gain.value = state.isMuted ? 0 : state.volume;
      gainRef.current = gainNode;

      const source = context.createMediaElementSource(audioRef.current);
      sourceRef.current = source;

      source.connect(gainNode);
      gainNode.connect(context.destination);
      source.connect(analyser);

      audioRef.current.muted = false; // We control volume via GainNode
      
      // Mobile-specific audio element optimizations
      const audio = audioRef.current;
      audio.preload = 'none'; // Don't preload on mobile to save bandwidth
      audio.crossOrigin = 'anonymous';
      
      // Set mobile-optimized audio attributes
      if ('playsInline' in audio) {
        audio.playsInline = true; // Prevent fullscreen on iOS
      }
      
    } catch (e) {
      handleError('Failed to initialize Web Audio API', 'Audio Graph');
    }
  }, [state.volume, state.isMuted, handleError]);

  const disconnect = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !connectionStateRef.current.isConnected) return;

    connectionStateRef.current.isConnected = false;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    // Removed audio.removeAttribute('src') and audio.load() to preserve media controls
  }, []);

  const togglePlayPause = useCallback(() => {
    clearError();
    
    if (!audioContextRef.current) {
      initializeAudioGraph();
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    setState(prev => {
      const newIsPlaying = !prev.isPlaying;
      if (!newIsPlaying) {
        // When pausing, disconnect the stream to prevent stale content
        disconnect();
      }
      return { ...prev, isPlaying: newIsPlaying, isLoading: newIsPlaying };
    });
  }, [initializeAudioGraph, disconnect, clearError]);

  const connect = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || connectionStateRef.current.isConnected) {
      return;
    }

    connectionStateRef.current.isConnected = true;
    connectionStateRef.current.connectionAttempts++;
    connectionStateRef.current.lastConnectionTime = Date.now();

    const onCanPlay = () => {
      // Cancel any existing play promise to prevent interruptions
      if (playPromiseRef.current) {
        playPromiseRef.current = null;
      }

      const playPromise = audio.play();
      playPromiseRef.current = playPromise;

      playPromise
        .then(() => {
          // Clear the promise ref since it completed successfully
          if (playPromiseRef.current === playPromise) {
            playPromiseRef.current = null;
          }
          setState(prev => ({ ...prev, isLoading: false }));
          // Force SSE reconnection after successful connection to ensure fresh metadata
          if (forceSseReconnect) {
            forceSseReconnect();
          }
        })
        .catch((error) => {
          handleError('Audio play failed', 'Play Promise');
          // Clear the promise ref since it completed (with error)
          if (playPromiseRef.current === playPromise) {
            playPromiseRef.current = null;
          }
          setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
        });
    };

    const fallbackToMp3 = () => {
      console.log('[AudioPlayer] Falling back to MP3 stream');
      // Use MP3 192kbps as fallback, but apply mobile optimizations
      const mp3Url = 'https://radio.oadro.com/listen/oadro/radio.mp3';
      audio.src = `${mp3Url}?_=${Date.now()}`;
      
      // Mobile-specific audio optimizations
      if (isMobile) {
        audio.preload = 'none';
        audio.crossOrigin = 'anonymous';
        // Add mobile-specific attributes to prevent crackling
        if ('playsInline' in audio) {
          audio.playsInline = true;
        }
        // Set buffer size hints for mobile
        if ('mozAudioChannelType' in audio) {
          (audio as any).mozAudioChannelType = 'content';
        }
      }
      
      audio.load();
      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('error', () => {
        handleError('MP3 fallback also failed', 'MP3 Fallback');
        setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
      }, { once: true });
    };

    // Try HLS first, fallback to MP3 if it fails
    if (state.streamUrl.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls(hlsConfig);
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error(
            '[AudioPlayer] HLS error:',
            data.type,
            data.details,
            data
          );
          if (data.fatal) {
            handleError('Fatal HLS error - falling back to MP3', 'HLS Fatal');
            // Destroy HLS instance and fallback to MP3
            hls.destroy();
            hlsRef.current = null;
            fallbackToMp3();
          }
        });

        hls.loadSource(state.streamUrl);
        hls.attachMedia(audio);
        hls.once(Hls.Events.MANIFEST_PARSED, () => {
          onCanPlay();
        });

        // Add timeout fallback in case HLS takes too long
        setTimeout(() => {
          if (hlsRef.current && !audio.readyState) {
            console.log('[AudioPlayer] HLS loading timeout - falling back to MP3');
            hls.destroy();
            hlsRef.current = null;
            fallbackToMp3();
          }
        }, 10000); // 10 second timeout

      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = state.streamUrl;
        audio.addEventListener('canplay', onCanPlay, { once: true });
        audio.addEventListener('error', fallbackToMp3, { once: true });
      } else {
        console.log('[AudioPlayer] HLS not supported - using MP3 fallback');
        fallbackToMp3();
      }
    } else {
      // Direct MP3 stream with mobile optimizations
      audio.src = `${state.streamUrl}?_=${Date.now()}`;
      
      // Apply mobile-specific optimizations for direct MP3 streams
      if (isMobile) {
        audio.preload = 'none';
        audio.crossOrigin = 'anonymous';
        if ('playsInline' in audio) {
          audio.playsInline = true;
        }
        // Set buffer size hints for mobile
        if ('mozAudioChannelType' in audio) {
          (audio as any).mozAudioChannelType = 'content';
        }
      }
      
      audio.load();
      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('error', () => {
        handleError('MP3 stream failed', 'MP3 Stream');
        setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
      }, { once: true });
    }
  }, [state.streamUrl, forceSseReconnect, state.isPlaying, disconnect, hlsConfig, handleError, isMobile]);

  // Effect to manage connection based on playback state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.isPlaying) {
      if (!connectionStateRef.current.isConnected) {
        connect();
      } else {
        // Cancel any existing play promise to prevent interruptions
        if (playPromiseRef.current) {
          playPromiseRef.current = null;
        }

        const playPromise = audio.play();
        playPromiseRef.current = playPromise;

        playPromise
          .then(() => {
            // Clear the promise ref since it completed successfully
            if (playPromiseRef.current === playPromise) {
              playPromiseRef.current = null;
            }
            setState(prev => ({ ...prev, isLoading: false }));
          })
          .catch((error) => {
            handleError('Audio resume failed', 'Resume');
            // Clear the promise ref since it completed (with error)
            if (playPromiseRef.current === playPromise) {
              playPromiseRef.current = null;
            }
          });
      }
    } else {
      // Just pause the audio - disconnection is now handled in togglePlayPause
      audio.pause();
    }
  }, [state.isPlaying, connect, handleError]);

  // Effect to handle cleanup only when the stream URL changes or the component unmounts.
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [state.streamUrl, disconnect]);

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

  // Effect for visualizer animation dispatch
  useEffect(() => {
    const visualize = () => {
      if (!analyserRef.current || !state.isPlaying) {
        return;
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      document.dispatchEvent(
        new CustomEvent('audiodata', {
          detail: { freqData: dataArray, bufferLength },
        })
      );

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
  }, [state.isPlaying]);

  // Memoized setter functions for better performance
  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
  }, []);

  const setIsMuted = useCallback((isMuted: boolean) => {
    setState(prev => ({ ...prev, isMuted }));
  }, []);

  const setStreamUrl = useCallback((streamUrl: string) => {
    setState(prev => ({ ...prev, streamUrl }));
  }, []);

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
  };
}
