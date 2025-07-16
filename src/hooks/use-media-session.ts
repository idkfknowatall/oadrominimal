'use client';

import { useEffect } from 'react';
import type { Song } from '@/lib/types';

/**
 * A custom hook to manage the Media Session API.
 * It updates the browser's media metadata and playback state.
 * @param liveSong The currently playing song.
 * @param isPlaying The current playback state.
 * @param togglePlayPause A function to toggle playback.
 */
export function useMediaSession(
  liveSong: Song | undefined,
  isPlaying: boolean,
  togglePlayPause: () => void
) {
  useEffect(() => {
    if (!('mediaSession' in navigator) || !liveSong) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: liveSong.title,
      artist: liveSong.artist,
      album: 'OADRO Radio',
      artwork: liveSong.albumArt ? [{ src: liveSong.albumArt }] : [],
    });
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    navigator.mediaSession.setActionHandler('play', togglePlayPause);
    navigator.mediaSession.setActionHandler('pause', togglePlayPause);
  }, [liveSong, isPlaying, togglePlayPause]);
}
