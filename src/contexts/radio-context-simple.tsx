'use client';

import {
  createContext,
  useContext,
  type ReactNode,
  type RefObject,
} from 'react';
import type { Song } from '@/lib/types';
import type { useToast } from '@/hooks/use-toast';

// Simplified context with only core radio functionality
export interface RadioContextType {
  // Metadata State
  liveSong: Song;
  recentlyPlayed: Song[];
  upNext: Song[];
  listenerCount: number;

  // Audio Player State
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  streamUrl: string;
  togglePlayPause: () => void;
  setVolume: (v: number) => void;
  setIsMuted: (m: boolean) => void;
  setStreamUrl: (s: string) => void;
  audioRef: RefObject<HTMLAudioElement>;
  analyserRef: RefObject<AnalyserNode>;

  // Playback Progress
  progress: number;
  historicalWaveform: number[];

  // Utilities
  toast: ReturnType<typeof useToast>['toast'];

  // Simplified auth state (always no user)
  user: null;
  isVip: false;
  isModerator: false;
  isGuildMember: false;
  isLoggedIn: false;
  isRefreshing: false;
}

const RadioContext = createContext<RadioContextType | undefined>(undefined);

export function RadioProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: RadioContextType;
}) {
  return (
    <RadioContext.Provider value={value}>{children}</RadioContext.Provider>
  );
}

export function useRadio() {
  const context = useContext(RadioContext);
  if (context === undefined) {
    throw new Error('useRadio must be used within a RadioProvider');
  }
  return context;
}