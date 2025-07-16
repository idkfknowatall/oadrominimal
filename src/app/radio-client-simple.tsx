'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';

import RadioView from '@/components/views/radio-view-simple';
import ErrorBoundary from '@/components/error-boundary';
import AsyncBoundary from '@/components/async-boundary';
import PlayerErrorBoundary from '@/components/player-error-boundary';
import ListenerCount from '@/components/listener-count';

import { useRadioMetadata } from '@/hooks/use-radio-metadata-simple';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useMediaSession } from '@/hooks/use-media-session';
import { RadioProvider } from '@/contexts/radio-context-simple';
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
  // Visualizer config removed for simplified version

  // Hotkeys removed for simplified version

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
        setHistoricalWaveform((prev) => [...prev, rmsValue]);
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

  // Context value with only radio functionality
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
      isVip: false,
      isModerator: false,
      isGuildMember: false,
      isLoggedIn: false,
      isRefreshing: false,
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
    <RadioProvider value={contextValue}>
      <ListenerCount />
      
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
        {/* Simple header */}
        <div className="flex items-center justify-center p-4 border-b border-border/40">
          <h1 className="text-2xl font-bold">OADRO Radio</h1>
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
  );
}