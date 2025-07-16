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

export interface PlaylistDocument {
  name: string;
  songCount: number;
  lastPlayedAt: number; // Unix timestamp
  plsUrl: string | null;
  m3uUrl: string | null;
  hidden?: boolean;
}

export interface Playlist {
  id: string; // Document ID (slug)
  name: string;
  songCount: number;
  lastPlayedAt: number; // Unix timestamp
  plsUrl: string | null;
  m3uUrl: string | null;
  hidden?: boolean;
}

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

// Represents the structure of a document in the 'users' collection
export interface UserDocument {
  name: string | null;
  avatar: string | null;
  discordId?: string; // The user's unique Discord ID
  updatedAt: string; // ISO 8601 timestamp
  isGuildMember?: boolean; // Is the user in the official Discord server
  isVip?: boolean; // Does the user have the VIP role in the Discord server
  isModerator?: boolean; // Does the user have the Moderator role
  firstLoginAt?: string; // ISO 8601 timestamp, set on first login
  lastLoginAt?: string; // ISO 8601 timestamp, updated on every login
  lastHeartbeatAt?: number; // Unix timestamp, for presence
  totalListeningSeconds?: number; // Aggregate of active listening time
  commentCount?: number;
  reactionCount?: number;
  socialLinks?: SocialLinks; // User's social media links
}

export interface Reaction {
  id: string; // Document ID
  songId: string;
  emoji: string;
  timestamp: number;
  user: UserInfo;
  createdAt?: number;
}

export interface VisualizerConfig {
  sensitivity: number;
  interval: number;
  speed: number;
  width: number;
  color: string;
}

export interface Comment {
  id: string;
  songId: string;
  text: string;
  timestamp: number;
  user: UserInfo;
  createdAt?: number;
}

export const defaultComment: Comment = {
  id: '',
  songId: '',
  text: '',
  timestamp: 0,
  user: { id: '', name: null, avatar: null, isVip: false, isModerator: false },
};

export interface Report {
  id: string;
  songId: string;
  userId: string;
  reason: string;
  createdAt: number;
}

export interface EnrichedReport {
  id: string;
  reason: string;
  createdAt: number;
  song: Song;
  user: UserInfo;
}

export interface TopRatedSong extends Song {
  interactionCount: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconName: string;
  type: 'user' | 'song';
  category: 'reactions' | 'listening' | 'interactions' | 'age';
  tier: number;
  threshold: number;
}

export interface Tastemaker extends UserInfo {
  interactionScore: number;
  commentCount: number;
  reactionCount: number;
  totalListeningSeconds?: number;
  achievements?: Achievement[];
  socialLinks?: SocialLinks;
}

export interface EnrichedReaction extends Reaction {
  song: Song;
}

export interface EnrichedComment extends Comment {
  song: Song;
}

// Type for the response from the /api/listeners/active endpoint
export interface ActiveListener extends UserInfo {
  lastSeen: number;
}

export interface UserInteraction {
  comments: Comment[];
  reactions: Reaction[];
}

export interface AuthenticatedUser {
  uid: string;
}

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

// For documents that haven't been hydrated with user info
export interface CommentDoc {
  id: string;
  userId: string;
  songId: string;
  text: string;
  timestamp: number;
  createdAt: number; // Unix timestamp
}

export interface ReactionDoc {
  id: string;
  userId: string;
  songId: string;
  emoji: string;
  timestamp: number;
  createdAt: number; // Unix timestamp
}

export interface NowPlaying {
  liveSong: ClientSong | null;
  upNext: ClientSong[];
  recentlyPlayed: ClientSong[];
  listenerCount: number;
}

export interface StreamStatus {
  isOnline: boolean;
}

export interface InteractionUpdate {
  comments: Comment[];
  reactions: Reaction[];
}

export type Interaction =
  | { type: 'now_playing'; data: NowPlaying }
  | { type: 'stream_status'; data: StreamStatus }
  | { type: 'interaction_update'; data: InteractionUpdate };

export interface RadioState {
  hasLock: boolean;
  isStarted: boolean;
  currentShId: number | null;
  currentSongId: string | null;
  lockRenewalTimer: NodeJS.Timeout | null;
  azuracastEventSource: import('eventsource') | null;
  pollingInterval: NodeJS.Timeout | null;
  reconnectAttempts: number;
  lastMetadata: NowPlaying | null;
  lastInteractions: InteractionUpdate | null;
}

export interface StateService {
  getState: () => RadioState;
  setState: (newState: Partial<RadioState>) => void;
}

export interface LoggerService {
  log: (message: string, ...args: unknown[]) => void;
  logWarn: (message: string, ...args: unknown[]) => void;
  logError: (message: string, ...args: unknown[]) => void;
}

export interface UserCache {
  getUsers: (userIds: string[]) => Promise<Map<string, UserInfo>>;
  getUser: (userId: string) => Promise<UserInfo | null>;
  prime: (userIds: string[]) => Promise<void>;
}
