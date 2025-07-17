'use client';

import {
  createContext,
  useContext,
  type ReactNode,
  type RefObject,
} from 'react';

// Audio-specific context for better performance
export interface AudioContextType {
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
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AudioContextType;
}) {
  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}