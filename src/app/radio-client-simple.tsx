'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// Removed unused imports: dynamic, AnimatePresence
import Link from 'next/link';
import { Info } from 'lucide-react';

import RadioView from '@/components/views/radio-view-simple';
import ErrorBoundary from '@/components/error-boundary';
import AsyncBoundary from '@/components/async-boundary';
import PlayerErrorBoundary from '@/components/player-error-boundary';

import { useRadioMetadata } from '@/hooks/use-radio-metadata-simple';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useMediaSession } from '@/hooks/use-media-session';
import { RadioProvider } from '@/contexts/radio-context-simple';
import { AudioProvider } from '@/contexts/audio-context';
import { MetadataProvider } from '@/contexts/metadata-context';
import { useToast } from '@/hooks/use-toast';
import { TIME } from '@/lib/constants';
// Development banner removed
import { useIsMobile } from '@/hooks/use-mobile';

interface RadioClientProps {
  children?: React.ReactNode;
}

export default function RadioClient({ children }: RadioClientProps) {
  // --- STATE & HOOKS ---
  const isMobile = useIsMobile();

  // Custom Hooks for Core Logic (no auth needed)
  const radio = useRadioMetadata(null, true); // No user, always initialized
  const audioPlayer = useAudioPlayer(radio.forceSseReconnect);

  useMediaSession(
    radio.liveSong,
    audioPlayer.isPlaying,
    audioPlayer.togglePlayPause
  );

  // Playback Progress State
  const [progress, setProgress] = useState(0);
  const [historicalWaveform, setHistoricalWaveform] = useState<number[]>([]);

  // Visualizer functionality removed

  const { toast } = useToast();

  // --- EFFECTS ---
  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          audioPlayer.togglePlayPause();
          break;
        case 'ArrowUp':
          event.preventDefault();
          audioPlayer.setVolume(Math.min(1, audioPlayer.volume + 0.1));
          break;
        case 'ArrowDown':
          event.preventDefault();
          audioPlayer.setVolume(Math.max(0, audioPlayer.volume - 0.1));
          break;
        case 'KeyM':
          event.preventDefault();
          audioPlayer.setIsMuted(!audioPlayer.isMuted);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [audioPlayer]);

  // Visualizer config removed for simplified version

  // Store previous song ID to properly detect song changes
  const previousSongIdRef = useRef<string | number | null>(null);

  // Reset progress when the song changes
  useEffect(() => {
    const currentSongId = radio.liveSong.id;
    const currentDuration = radio.liveSong.duration;
    const currentElapsed = radio.liveSong.elapsed ?? 0;

    if (currentSongId && currentSongId !== previousSongIdRef.current) {
      previousSongIdRef.current = currentSongId;

      if (!currentDuration) {
        setProgress(0);
        setHistoricalWaveform([]);
      } else {
        setProgress(currentElapsed);
        setHistoricalWaveform(Array(Math.floor(currentElapsed)).fill(0.01));
      }
    } else if (
      !currentDuration &&
      previousSongIdRef.current === currentSongId
    ) {
      setProgress(0);
      setHistoricalWaveform([]);
    }
  }, [radio.liveSong.id, radio.liveSong.duration, radio.liveSong.elapsed]);

  // Progress timer and waveform
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (!radio.liveSong.duration || !radio.liveSong.id) return;

    progressTimerRef.current = setInterval(() => {
      setProgress((currentProgress) => {
        const newProgress = currentProgress + 1;
        if (newProgress >= radio.liveSong.duration) {
          return radio.liveSong.duration;
        }
        return newProgress;
      });

      // Waveform processing
      if (audioPlayer.analyserRef.current) {
        const analyser = audioPlayer.analyserRef.current;
        const timeDomainData = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(timeDomainData);

        let sum = 0;
        let isSilence = true;
        const dataLength = timeDomainData.length;

        for (let i = 0; i < dataLength; i++) {
          const sample = timeDomainData[i];
          if (sample !== 128) isSilence = false;
          const v = (sample - 128) / 128;
          sum += v * v;
        }

        const rmsValue = isSilence
          ? 0.01
          : Math.max(0.01, Math.sqrt(sum / dataLength));
        setHistoricalWaveform((prev) => {
          const newWaveform = [...prev, rmsValue];
          // Keep only last 300 seconds (5 minutes) of waveform data to prevent memory leaks
          return newWaveform.length > 300 ? newWaveform.slice(-300) : newWaveform;
        });
      } else {
        setHistoricalWaveform((prev) => [...prev, 0.01]);
      }
    }, TIME.SECOND);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [
    radio.liveSong.id,
    radio.liveSong.duration,
    audioPlayer.analyserRef,
  ]);

  // Split context values for better performance
  const audioContextValue = useMemo(
    () => ({
      isPlaying: audioPlayer.isPlaying,
      volume: audioPlayer.volume,
      isMuted: audioPlayer.isMuted,
      streamUrl: audioPlayer.streamUrl,
      setVolume: audioPlayer.setVolume,
      setIsMuted: audioPlayer.setIsMuted,
      setStreamUrl: audioPlayer.setStreamUrl,
      togglePlayPause: audioPlayer.togglePlayPause,
      audioRef: audioPlayer.audioRef,
      analyserRef: audioPlayer.analyserRef,
      progress,
      historicalWaveform,
    }),
    [
      audioPlayer.isPlaying,
      audioPlayer.volume,
      audioPlayer.isMuted,
      audioPlayer.streamUrl,
      audioPlayer.setVolume,
      audioPlayer.setIsMuted,
      audioPlayer.setStreamUrl,
      audioPlayer.togglePlayPause,
      audioPlayer.audioRef,
      audioPlayer.analyserRef,
      progress,
      historicalWaveform,
    ]
  );

  const metadataContextValue = useMemo(
    () => ({
      liveSong: radio.liveSong,
      recentlyPlayed: radio.recentlyPlayed,
      upNext: radio.upNext,
      listenerCount: radio.listenerCount,
    }),
    [
      radio.liveSong,
      radio.recentlyPlayed,
      radio.upNext,
      radio.listenerCount,
    ]
  );

  // Legacy context value for backward compatibility
  const contextValue = useMemo(
    () => ({
      // Radio data
      liveSong: radio.liveSong,
      recentlyPlayed: radio.recentlyPlayed,
      upNext: radio.upNext,
      listenerCount: radio.listenerCount,
      // Audio controls
      isPlaying: audioPlayer.isPlaying,
      volume: audioPlayer.volume,
      isMuted: audioPlayer.isMuted,
      streamUrl: audioPlayer.streamUrl,
      setVolume: audioPlayer.setVolume,
      setIsMuted: audioPlayer.setIsMuted,
      setStreamUrl: audioPlayer.setStreamUrl,
      togglePlayPause: audioPlayer.togglePlayPause,
      audioRef: audioPlayer.audioRef,
      analyserRef: audioPlayer.analyserRef,
      // UI state
      progress,
      historicalWaveform,
      toast,
      // No auth needed
      user: null,
      isVip: false as const,
      isModerator: false as const,
      isGuildMember: false as const,
      isLoggedIn: false as const,
      isRefreshing: false as const,
    }),
    [
      radio.liveSong,
      radio.recentlyPlayed,
      radio.upNext,
      radio.listenerCount,
      audioPlayer.isPlaying,
      audioPlayer.volume,
      audioPlayer.isMuted,
      audioPlayer.streamUrl,
      audioPlayer.setVolume,
      audioPlayer.setIsMuted,
      audioPlayer.setStreamUrl,
      audioPlayer.togglePlayPause,
      audioPlayer.audioRef,
      audioPlayer.analyserRef,
      progress,
      historicalWaveform,
      toast,
    ]
  );

  return (
    <MetadataProvider value={metadataContextValue}>
      <AudioProvider value={audioContextValue}>
        <RadioProvider value={contextValue}>
          {/* Audio player with error boundary */}
          <PlayerErrorBoundary
            onRetry={() => {
              audioPlayer.setStreamUrl(audioPlayer.streamUrl);
            }}
            showMiniPlayer={false}
          >
            <audio
              ref={audioPlayer.audioRef}
              crossOrigin="anonymous"
              playsInline
              preload="none"
              controls={false}
              style={{ display: 'none' }}
            />
          </PlayerErrorBoundary>

          {/* Visualizer components removed for simplified version */}

          <div className="flex flex-col text-foreground h-svh overflow-hidden selection:bg-primary/40 selection:text-foreground">
            {/* Header with navigation */}
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <h1 className="text-2xl font-bold">OADRO Radio</h1>
              <Link
                href="/about"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="About OADRO Radio"
              >
                <Info className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">About</span>
              </Link>
            </div>

            {/* Main radio view */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-4">
              <ErrorBoundary isolate={true}>
                <AsyncBoundary maxRetries={1}>
                  <PlayerErrorBoundary showMiniPlayer={false}>
                    <RadioView />
                  </PlayerErrorBoundary>
                </AsyncBoundary>
              </ErrorBoundary>
            </div>
          </div>
        </RadioProvider>
      </AudioProvider>
    </MetadataProvider>
  );
}