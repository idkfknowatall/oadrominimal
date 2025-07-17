'use client';

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import type { Song } from '@/lib/types';

// Metadata-specific context for better performance
export interface MetadataContextType {
  // Metadata State
  liveSong: Song;
  recentlyPlayed: Song[];
  upNext: Song[];
  listenerCount: number;
}

const MetadataContext = createContext<MetadataContextType | undefined>(undefined);

export function MetadataProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: MetadataContextType;
}) {
  return (
    <MetadataContext.Provider value={value}>{children}</MetadataContext.Provider>
  );
}

export function useMetadata() {
  const context = useContext(MetadataContext);
  if (context === undefined) {
    throw new Error('useMetadata must be used within a MetadataProvider');
  }
  return context;
}