// Using simple types for data structures

export interface Song {
  id: number; // Unique ID for a specific play instance (sh_id)
  songId: string; // Unique ID for the song itself
  title: string;
  artist: string;
  albumArt: string;
  genre: string;
  duration: number;
  played_at?: number;
  elapsed?: number;
  interactionCount?: number;
  playCount?: number;
  firstPlayedAt?: number;
  creatorDiscordId?: string | null;
  creatorId?: string | null; // The creator ID
  creatorName?: string | null; // Denormalized creator name
  creatorAvatar?: string | null; // Denormalized creator avatar URL
  playlists?: string[];
  onDemand?: OnDemandLinks | null;
}

// A version of the Song type that is safe for client-side consumption
export type ClientSong = Song;

export const defaultSong: Song = {
  id: 0,
  songId: '',
  title: '',
  artist: '',
  albumArt: '',
  genre: '',
  duration: 0,
  playlists: [],
};

// Removed unused playlist types: PlaylistDocument, Playlist
// These are not needed in the simplified version

export interface SocialLinks {
  twitter?: string | null;
  instagram?: string | null;
  twitch?: string | null;
  youtube?: string | null;
  github?: string | null;
  website?: string | null;
  [key: string]: string | null | undefined; // Allow for additional platforms in future
}

export interface UserInfo {
  id: string;
  name: string | null;
  avatar: string | null;
  isVip?: boolean;
  isModerator?: boolean;
  socialLinks?: SocialLinks;
}

// Removed unused UserDocument type - not needed in simplified version

export interface VisualizerConfig {
  sensitivity: number;
  interval: number;
  speed: number;
  width: number;
  color: string;
}

// Removed unused types: Reaction, Comment, Report, Achievement, Tastemaker, etc.
// These are not needed in the simplified version

export interface OnDemandLinks {
  song_suno?: string | null;
  song_youtube?: string | null;
  song_spotify?: string | null;
  song_soundcloud?: string | null;
  song_bandcamp?: string | null;
  // More platforms can be added in the future
}

export interface AzuracastNowPlayingSong {
  id: string;
  title: string;
  artist: string;
  art: string;
  genre: string;
  custom_fields?: {
    creator_discord_id?: string | null;
    song_suno?: string | null;
    song_youtube?: string | null;
    song_spotify?: string | null;
    song_soundcloud?: string | null;
    song_bandcamp?: string | null;
    [key: string]: string | null | undefined;
  };
}

export interface AzuracastNowPlaying {
  station: {
    playlist_pls_url?: string;
    playlist_m3u_url?: string;
  };
  listeners: { current: number };
  live: unknown;
  now_playing: {
    sh_id: number;
    played_at: number;
    duration: number;
    elapsed: number;
    playlist?: string;
    song: AzuracastNowPlayingSong;
    interaction_count?: number;
  };
  playing_next: {
    cued_at: number;
    duration: number;
    song: AzuracastNowPlayingSong;
  };
  song_history: Array<{
    sh_id: number;
    played_at: number;
    duration: number;
    song: AzuracastNowPlayingSong;
  }>;
  is_online: boolean;
}

// Removed unused document types: CommentDoc, ReactionDoc
// These are not needed in the simplified version

export interface NowPlaying {
  liveSong: ClientSong | null;
  upNext: ClientSong[];
  recentlyPlayed: ClientSong[];
  listenerCount: number;
}

export interface StreamStatus {
  isOnline: boolean;
  listenerCount?: number;
  lastUpdate?: number;
}

// Enhanced error handling types
export interface RadioError {
  readonly code: string;
  readonly message: string;
  readonly context?: string;
  readonly timestamp: number;
  readonly recoverable: boolean;
}

// Connection health and metrics
export type ConnectionHealth = 'healthy' | 'degraded' | 'unhealthy';

export interface ConnectionMetrics {
  readonly totalConnections: number;
  readonly successfulConnections: number;
  readonly failedConnections: number;
  readonly lastConnectionTime: number;
  readonly lastSuccessfulConnection: number;
  readonly averageReconnectTime: number;
}

export interface HealthStatus {
  readonly status: ConnectionHealth;
  readonly details: string;
  readonly metrics: ConnectionMetrics;
  readonly timestamp: number;
}

// Audio player state types
export interface AudioPlayerState {
  readonly isPlaying: boolean;
  readonly volume: number;
  readonly isMuted: boolean;
  readonly streamUrl: string;
  readonly isLoading: boolean;
  readonly error: string | null;
}

// Enhanced interaction stream event types
export type InteractionEventType =
  | 'now_playing'
  | 'stream_status'
  | 'connection_failed'
  | 'connection_restored'
  | 'health_check';

export interface BaseInteractionEvent<T extends InteractionEventType, D = unknown> {
  readonly type: T;
  readonly data: D;
  readonly timestamp?: number;
}

export type InteractionEvent =
  | BaseInteractionEvent<'now_playing', {
      liveSong: Song;
      upNext: readonly Song[];
      recentlyPlayed: readonly Song[];
      listenerCount: number;
    }>
  | BaseInteractionEvent<'stream_status', {
      isOnline: boolean;
      listenerCount?: number;
    }>
  | BaseInteractionEvent<'connection_failed', {
      reason: string;
      metrics: ConnectionMetrics;
    }>
  | BaseInteractionEvent<'connection_restored', {
      metrics: ConnectionMetrics;
    }>
  | BaseInteractionEvent<'health_check', HealthStatus>;

// Platform detection types
export interface PlatformInfo {
  readonly isIOS: boolean;
  readonly isAndroid: boolean;
  readonly isSafari: boolean;
  readonly isChrome: boolean;
  readonly isMobile: boolean;
  readonly userAgent: string;
}

// Type guards for runtime validation
export const isSong = (obj: unknown): obj is Song => {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const song = obj as Record<string, unknown>;
  
  return (
    typeof song.id === 'number' &&
    typeof song.songId === 'string' &&
    typeof song.title === 'string' &&
    typeof song.artist === 'string' &&
    typeof song.duration === 'number' &&
    typeof song.albumArt === 'string' &&
    typeof song.genre === 'string' &&
    song.title.length > 0 &&
    song.artist.length > 0 &&
    song.duration >= 0
  );
};

export const isStreamStatus = (obj: unknown): obj is StreamStatus => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'isOnline' in obj &&
    typeof (obj as StreamStatus).isOnline === 'boolean'
  );
};

export const isInteractionEvent = (obj: unknown): obj is InteractionEvent => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'data' in obj &&
    typeof (obj as InteractionEvent).type === 'string'
  );
};

// Constants for type validation
export const SUPPORTED_AUDIO_FORMATS = ['mp3', 'm3u8', 'aac'] as const;
export const SUPPORTED_PLATFORMS = ['spotify', 'youtube', 'soundcloud', 'bandcamp', 'suno'] as const;

export type AudioFormat = typeof SUPPORTED_AUDIO_FORMATS[number];
export type SupportedPlatform = typeof SUPPORTED_PLATFORMS[number];

// Utility types for better type safety
export type NonEmptyArray<T> = [T, ...T[]];
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Removed unused types for simplified version:
// InteractionUpdate, Interaction, RadioState, StateService, LoggerService, UserCache
// These are not needed in the client-only simplified version


// ActiveListener type for the simplified version
export interface ActiveListener {
  id: string;
  name: string;
  avatar?: string;
  joinedAt: number;
}