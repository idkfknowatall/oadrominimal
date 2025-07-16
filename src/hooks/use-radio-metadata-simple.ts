'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import type { Song } from '@/lib/types';
import { API_ROUTES, UI } from '@/lib/constants';
import {
  requestDeduplication,
  createBatchRequestKey,
} from '@/lib/services/request-deduplication';
import { songMetadataCache } from '@/lib/services/cache-service';

// Raw type from the Azuracast API response for better type safety
interface AzuracastSongHistoryItem {
  sh_id: number;
  played_at: number;
  duration: number;
  song: {
    id: string;
    title: string;
    artist: string;
    art: string;
    genre: string;
    custom_fields?: {
      creator_discord_id?: string | null;
    };
  };
}

interface AzuracastNowPlaying {
  station: unknown;
  listeners: { current: number };
  live: unknown;
  now_playing: {
    sh_id: number;
    played_at: number;
    duration: number;
    elapsed: number;
    playlist?: string;
    song: {
      id: string;
      title: string;
      artist: string;
      art: string;
      genre: string;
      custom_fields?: {
        creator_discord_id?: string | null;
      };
    };
    interaction_count?: number;
  };
  playing_next: {
    cued_at: number;
    duration: number;
    song: {
      id: string;
      title: string;
      artist: string;
      art: string;
      genre: string;
      custom_fields?: {
        creator_discord_id?: string | null;
      };
    };
  };
  song_history: AzuracastSongHistoryItem[];
  is_online: boolean;
}

const defaultSong: Song = {
  id: 0,
  songId: 'initial',
  title: 'Loading...',
  artist: 'OADRO Radio',
  genre: 'Electronic',
  duration: 0,
  albumArt: '',
  elapsed: 0,
};

function transformApiData(data: AzuracastNowPlaying) {
  let liveSong: Song | null = null;
  if (data.now_playing?.song) {
    const { now_playing: np } = data;
    liveSong = {
      id: np.sh_id,
      songId: np.song.id,
      title: np.song.title,
      artist: np.song.artist,
      albumArt: np.song.art,
      genre: np.song.genre,
      duration: np.duration,
      elapsed: np.elapsed,
      played_at: np.played_at,
      interactionCount: np.interaction_count || 0,
      creatorDiscordId: np.song.custom_fields?.creator_discord_id || null,
      playlists: np.playlist ? [np.playlist] : [],
    };
  }

  let upNext: Song[] = [];
  if (data.playing_next?.song) {
    const { playing_next: pn } = data;
    upNext = [
      {
        id: pn.cued_at,
        songId: pn.song.id,
        title: pn.song.title,
        artist: pn.song.artist,
        albumArt: pn.song.art,
        genre: pn.song.genre,
        duration: pn.duration,
        creatorDiscordId: pn.song.custom_fields?.creator_discord_id || null,
      },
    ];
  }

  const recentlyPlayed = (data.song_history || [])
    .slice(0, UI.RECENT_SONGS_COUNT)
    .map(
      (item): Song => ({
        id: item.sh_id,
        songId: item.song.id,
        title: item.song.title,
        artist: item.song.artist,
        albumArt: item.song.art,
        genre: item.song.genre,
        duration: item.duration,
        played_at: item.played_at,
        interactionCount: 0,
        creatorDiscordId: item.song.custom_fields?.creator_discord_id || null,
      })
    );

  return {
    liveSong,
    upNext,
    recentlyPlayed,
    listenerCount: data.listeners?.current || 0,
  };
}

export function useRadioMetadata(
  user: null, // Always null for simplified version
  isDatabaseInitialized: boolean
) {
  const [liveSong, setLiveSong] = useState<Song>(defaultSong);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [rawRecentlyPlayed, setRawRecentlyPlayed] = useState<Song[]>([]);
  const [upNext, setUpNext] = useState<Song[]>([]);
  const [listenerCount, setListenerCount] = useState<number>(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const debouncedRecentlyPlayed = useDebounce(rawRecentlyPlayed, 1500);

  // Use raw recently played data immediately without debounce delay
  useEffect(() => {
    setRecentlyPlayed(rawRecentlyPlayed);
  }, [rawRecentlyPlayed]);

  // Main effect for SSE connection and data processing
  const connectSse = useCallback(() => {
    // If there's an existing connection, explicitly close it before creating a new one.
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseUri = API_ROUTES.RADIO_STREAM;
    const eventSource = new EventSource(sseUri);
    eventSourceRef.current = eventSource;

    const processNowPlayingData = (npData: AzuracastNowPlaying) => {
      if (!npData || !npData.is_online) {
        setLiveSong((current) => ({
          ...current,
          title: 'Stream Offline',
          artist: 'OADRO Radio',
        }));
        setUpNext([]);
        setRecentlyPlayed([]);
        setListenerCount(0);
        return;
      }

      const {
        liveSong: newLiveSong,
        upNext: newUpNext,
        recentlyPlayed: newRecentlyPlayed,
        listenerCount: newListenerCount,
      } = transformApiData(npData);

      setListenerCount(newListenerCount);
      setUpNext(newUpNext);
      setRawRecentlyPlayed(newRecentlyPlayed);

      if (newLiveSong) {
        setLiveSong(newLiveSong);
      }
    };

    const handleNowPlaying = (event: Event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        const npData = data.pub?.data?.np;
        if (npData) {
          processNowPlayingData(npData);
        }
      } catch (err) {
        console.error('Error parsing now_playing event:', err);
      }
    };

    // Use only specific event listeners to avoid race conditions
    eventSource.addEventListener('now_playing', handleNowPlaying);

    eventSource.onerror = (error) => {
      const readyState = eventSource.readyState;
      const readyStateText =
        readyState === EventSource.CONNECTING
          ? 'CONNECTING'
          : readyState === EventSource.OPEN
            ? 'OPEN'
            : readyState === EventSource.CLOSED
              ? 'CLOSED'
              : 'UNKNOWN';
      console.warn(
        `[SSE] Connection error (readyState: ${readyStateText}). The browser will attempt to reconnect.`,
        error
      );
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Fetch initial data immediately for faster loading
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch('https://radio.oadro.com/api/nowplaying/oadro');
        if (response.ok) {
          const data = await response.json();
          if (data && data.is_online) {
            const transformedData = transformApiData(data);
            setListenerCount(transformedData.listenerCount);
            setUpNext(transformedData.upNext);
            setRawRecentlyPlayed(transformedData.recentlyPlayed);
            if (transformedData.liveSong) {
              setLiveSong(transformedData.liveSong);
            }
          }
        }
      } catch (error) {
        console.log('[RadioMetadata] Initial data fetch failed, waiting for SSE:', error);
      }
    };

    // Fetch initial data immediately
    fetchInitialData();
  }, []);

  // Initialize SSE connection when the hook mounts
  useEffect(() => {
    // Prevent duplicate connections in React StrictMode/Fast Refresh
    if (
      eventSourceRef.current &&
      eventSourceRef.current.readyState !== EventSource.CLOSED
    ) {
      return;
    }

    connectSse();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connectSse]); // Include connectSse dependency as required by ESLint

  const forceSseReconnect = useCallback(() => {
    connectSse();
  }, [connectSse]);

  return {
    liveSong,
    recentlyPlayed,
    upNext,
    listenerCount,
    forceSseReconnect,
  };
}