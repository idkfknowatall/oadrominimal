/**
 * Types for AzuraCast song request functionality
 */

export interface RequestableSong {
  request_id: string;
  request_url: string;
  song: {
    id: string;
    art: string;
    length?: number; // Duration in seconds
    length_text?: string; // Formatted duration like "3:45"
    custom_fields: {
      creator_discord_id?: string | null;
      song_bandcamp?: string | null;
      song_riffusion?: string | null;
      song_soundcloud?: string | null;
      song_spotify?: string | null;
      song_suno?: string | null;
      song_youtube?: string | null;
    };
    text: string;
    artist: string;
    title: string;
    album: string;
    genre: string;
    isrc: string;
    lyrics: string;
  };
}

export interface RequestData {
  songs: RequestableSong[];
  totalCount: number;
  lastUpdated: number;
}

export interface RequestFilters {
  search: string;
}

export interface RequestSubmission {
  request_id: string;
  success: boolean;
  message?: string;
}

// Helper functions for request data
export function filterSongs(songs: RequestableSong[], filters: Partial<RequestFilters>): RequestableSong[] {
  let filtered = [...songs];

  // Search filter - searches by song title, artist name, or both
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(song =>
      song.song.title.toLowerCase().includes(searchTerm) ||
      song.song.artist.toLowerCase().includes(searchTerm)
    );
  }

  // Sort alphabetically by title for consistent results
  filtered.sort((a, b) => a.song.title.toLowerCase().localeCompare(b.song.title.toLowerCase()));

  return filtered;
}


export function formatSongDuration(duration?: number): string {
  if (!duration || duration <= 0) return 'Unknown';
  
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function cleanGenreString(genre: string): string {
  return genre
    .replace(/^Genre:\s*/i, '') // Remove "Genre:" prefix
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export function extractPlatformLinks(song: RequestableSong): Array<{platform: string, url: string, icon: string}> {
  const links: Array<{platform: string, url: string, icon: string}> = [];
  const fields = song.song.custom_fields;

  if (fields.song_spotify) {
    links.push({ platform: 'Spotify', url: fields.song_spotify, icon: '🎵' });
  }
  if (fields.song_youtube) {
    links.push({ platform: 'YouTube', url: fields.song_youtube, icon: '📺' });
  }
  if (fields.song_soundcloud) {
    links.push({ platform: 'SoundCloud', url: fields.song_soundcloud, icon: '🔊' });
  }
  if (fields.song_bandcamp) {
    links.push({ platform: 'Bandcamp', url: fields.song_bandcamp, icon: '🎼' });
  }
  if (fields.song_suno) {
    links.push({ platform: 'Suno', url: fields.song_suno, icon: '🎶' });
  }

  return links;
}

export function getCreatorInfo(song: RequestableSong): { hasCreator: boolean, creatorId?: string } {
  const creatorId = song.song.custom_fields.creator_discord_id;
  return {
    hasCreator: Boolean(creatorId && creatorId.trim()),
    creatorId: creatorId || undefined
  };
}

export function getSongDisplayText(song: RequestableSong): string {
  return `${song.song.artist} - ${song.song.title}`;
}

export function isValidRequestId(requestId: string): boolean {
  return /^[a-f0-9]{24}$/.test(requestId);
}

// Default filters
export const DEFAULT_FILTERS: RequestFilters = {
  search: ''
};

// Pagination helpers
export function paginateSongs(songs: RequestableSong[], page: number, pageSize: number): {
  songs: RequestableSong[];
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(songs.length / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    songs: songs.slice(startIndex, endIndex),
    totalPages,
    currentPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
}