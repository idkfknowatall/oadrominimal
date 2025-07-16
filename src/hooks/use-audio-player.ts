'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { HLS_STREAM_URL, VISUALIZER_FFT_SIZE } from '@/lib/config';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileAudioOptimization } from '@/hooks/use-mobile-audio-optimization';

export function useAudioPlayer(forceSseReconnect?: () => void) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamUrl, setStreamUrl] = useState(HLS_STREAM_URL);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
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

  // Ref to track if we're currently connected to avoid redundant setups.
  const isConnectedRef = useRef(false);

  // Ref to track current play promise to avoid interruptions
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Apply mobile audio optimizations
  useMobileAudioOptimization(audioRef, isMobile);

  // Load stream URL from localStorage on mount
  useEffect(() => {
    const savedStreamUrl = localStorage.getItem('oadro_stream_url');
    if (savedStreamUrl) {
      setStreamUrl(savedStreamUrl);
    }
  }, []); // Runs once on client mount

  // Save stream URL to localStorage on change
  useEffect(() => {
    localStorage.setItem('oadro_stream_url', streamUrl);
  }, [streamUrl]);

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
      gainNode.gain.value = isMuted ? 0 : volume;
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
      console.error('Failed to initialize Web Audio API', e);
    }
  }, [volume, isMuted]);

  const disconnect = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isConnectedRef.current) return;

    isConnectedRef.current = false;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    // Removed audio.removeAttribute('src') and audio.load() to preserve media controls
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!audioContextRef.current) {
      initializeAudioGraph();
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setIsPlaying((prevIsPlaying) => {
      const newIsPlaying = !prevIsPlaying;
      if (!newIsPlaying) {
        // When pausing, disconnect the stream to prevent stale content
        disconnect();
      }
      // Removed unnecessary SSE reconnection on play - SSE should stay connected
      return newIsPlaying;
    });
  }, [initializeAudioGraph, disconnect]);

  const connect = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isConnectedRef.current) {
      return;
    }

    isConnectedRef.current = true;

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
          // Force SSE reconnection after successful connection to ensure fresh metadata
          if (forceSseReconnect) {
            forceSseReconnect();
          }
        })
        .catch((error) => {
          console.error('[AudioPlayer] Audio play failed:', error);
          // Clear the promise ref since it completed (with error)
          if (playPromiseRef.current === playPromise) {
            playPromiseRef.current = null;
          }
          setIsPlaying(false);
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
        console.error('[AudioPlayer] MP3 fallback also failed');
        setIsPlaying(false);
      }, { once: true });
    };

    // Try HLS first, fallback to MP3 if it fails
    if (streamUrl.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: false,
          // Mobile-optimized HLS settings to reduce crackling
          maxBufferLength: isMobile ? 15 : 30, // Smaller buffer on mobile
          maxMaxBufferLength: isMobile ? 30 : 60, // Maximum buffer length
          maxBufferSize: isMobile ? 30 * 1000 * 1000 : 60 * 1000 * 1000, // Smaller buffer size on mobile
          maxBufferHole: 0.5, // Allow small gaps in buffer
          lowLatencyMode: false, // Disable low latency for stability
          backBufferLength: isMobile ? 30 : 90, // Smaller back buffer on mobile
          // Fragment loading optimizations
          fragLoadingTimeOut: 20000, // 20 second timeout
          manifestLoadingTimeOut: 10000, // 10 second timeout
          // Mobile-specific optimizations
          enableWorker: !isMobile, // Disable worker on mobile for stability
          startLevel: -1, // Auto-select quality
          capLevelToPlayerSize: true, // Match quality to player size
          // Additional mobile optimizations
          liveSyncDurationCount: isMobile ? 2 : 3, // Reduce sync duration on mobile
          liveMaxLatencyDurationCount: isMobile ? 5 : 10, // Reduce max latency on mobile
          maxFragLookUpTolerance: 0.25, // Tolerance for fragment lookup
          maxSeekHole: 2, // Maximum seek hole
          // Network optimizations for mobile
          manifestLoadingMaxRetry: 3,
          manifestLoadingRetryDelay: 1000,
          levelLoadingMaxRetry: 3,
          levelLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 3,
          fragLoadingRetryDelay: 1000,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error(
            '[AudioPlayer] HLS error:',
            data.type,
            data.details,
            data
          );
          if (data.fatal) {
            console.error(
              '[AudioPlayer] Fatal HLS error - falling back to MP3'
            );
            // Destroy HLS instance and fallback to MP3
            hls.destroy();
            hlsRef.current = null;
            fallbackToMp3();
          }
        });

        hls.loadSource(streamUrl);
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
        audio.src = streamUrl;
        audio.addEventListener('canplay', onCanPlay, { once: true });
        audio.addEventListener('error', fallbackToMp3, { once: true });
      } else {
        console.log('[AudioPlayer] HLS not supported - using MP3 fallback');
        fallbackToMp3();
      }
    } else {
      // Direct MP3 stream with mobile optimizations
      audio.src = `${streamUrl}?_=${Date.now()}`;
      
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
        console.error('[AudioPlayer] MP3 stream failed');
        setIsPlaying(false);
      }, { once: true });
    }
  }, [streamUrl, forceSseReconnect, isPlaying, disconnect]);

  // Effect to manage connection based on playback state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      if (!isConnectedRef.current) {
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
          })
          .catch((error) => {
            console.error('[AudioPlayer] Audio resume failed:', error);
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
  }, [isPlaying, connect]);

  // Effect to handle cleanup only when the stream URL changes or the component unmounts.
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [streamUrl, disconnect]);

  // Effect to manage volume
  useEffect(() => {
    if (gainRef.current && audioContextRef.current) {
      const targetVolume = isMuted ? 0 : volume;
      gainRef.current.gain.setTargetAtTime(
        targetVolume,
        audioContextRef.current.currentTime,
        0.015
      );
    }
  }, [volume, isMuted]);

  // Effect for visualizer animation dispatch
  useEffect(() => {
    const visualize = () => {
      if (!analyserRef.current || !isPlaying) {
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

    if (isPlaying) {
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
  }, [isPlaying]);

  return {
    audioRef,
    analyserRef,
    isPlaying,
    volume,
    isMuted,
    streamUrl,
    togglePlayPause,
    setVolume,
    setIsMuted,
    setStreamUrl,
  };
}
