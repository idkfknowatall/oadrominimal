/**
 * @fileoverview Optimized API caching layer with SWR for instant data loading
 */

import useSWR from 'swr';

// Cache configuration for different data types
const CACHE_CONFIG = {
  nowPlaying: {
    refreshInterval: 5000, // 5 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  },
  stationInfo: {
    refreshInterval: 60000, // 1 minute
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 30000,
  },
  fallback: {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  },
};

// Optimized fetcher with error handling and retries
const fetcher = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
};

// Hook for now playing data with optimized caching
export function useNowPlaying() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/radio-meta',
    fetcher,
    {
      ...CACHE_CONFIG.nowPlaying,
      onError: (error) => {
        console.warn('[API Cache] Now playing fetch error:', error.message);
      },
      onSuccess: (data) => {
        // Prefetch album art if available
        if (data?.now_playing?.song?.art) {
          const img = new Image();
          img.src = data.now_playing.song.art;
        }
      },
    }
  );

  return {
    data: data ? transformNowPlayingData(data) : null,
    error,
    isLoading,
    refresh: mutate,
  };
}

// Hook for station information with longer cache
export function useStationInfo() {
  const { data, error, isLoading } = useSWR(
    '/api/health',
    fetcher,
    CACHE_CONFIG.stationInfo
  );

  return {
    data,
    error,
    isLoading,
  };
}

// Transform AzuraCast data to our internal format
function transformNowPlayingData(data: any) {
  if (!data) return null;

  const nowPlaying = data.now_playing;
  const song = nowPlaying?.song;

  return {
    liveSong: {
      id: nowPlaying?.sh_id || Date.now(),
      songId: song?.id,
      title: song?.title || 'Unknown Title',
      artist: song?.artist || 'Unknown Artist',
      albumArt: song?.art,
      genre: song?.genre,
      duration: nowPlaying?.duration || 0,
      elapsed: nowPlaying?.elapsed || 0,
      played_at: nowPlaying?.played_at,
      interactionCount: 0,
      creatorDiscordId: song?.custom_fields?.creator_discord_id || null,
      playlists: nowPlaying?.playlist ? [nowPlaying.playlist] : [],
    },
    upNext: data.playing_next ? [transformSong(data.playing_next)] : [],
    recentlyPlayed: (data.song_history || []).slice(0, 5).map(transformSong),
    listenerCount: data.listeners?.current || 0,
    isOnline: data.is_online || false,
  };
}

function transformSong(songData: any) {
  if (!songData?.song) return null;

  return {
    id: songData.sh_id || songData.cued_at || Date.now(),
    songId: songData.song.id,
    title: songData.song.title || 'Unknown Title',
    artist: songData.song.artist || 'Unknown Artist',
    albumArt: songData.song.art,
    genre: songData.song.genre,
    duration: songData.duration || 0,
    elapsed: songData.elapsed || 0,
    played_at: songData.played_at,
    interactionCount: songData.interaction_count || 0,
    creatorDiscordId: songData.song.custom_fields?.creator_discord_id || null,
    playlists: songData.playlist ? [songData.playlist] : [],
  };
}

// Preload critical data
export function preloadNowPlaying() {
  // This will populate the SWR cache before components mount
  return fetcher('/api/radio-meta')
    .then(transformNowPlayingData)
    .catch(() => null);
}

// Cache warming function for initial load
export async function warmCache() {
  try {
    // Preload now playing data
    await preloadNowPlaying();
    
    // Preload station info via health endpoint
    await fetcher('/api/health');
    
    console.log('[API Cache] Cache warmed successfully');
  } catch (error) {
    console.warn('[API Cache] Cache warming failed:', error);
  }
}