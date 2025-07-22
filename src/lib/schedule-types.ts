/**
 * Types for AzuraCast schedule data
 */

export interface ScheduleEntry {
  id: number;
  type: string;
  name: string;
  title: string;
  description: string;
  start_timestamp: number;
  start: string;
  end_timestamp: number;
  end: string;
  is_now: boolean;
}

export interface ScheduleData {
  entries: ScheduleEntry[];
  currentEntry?: ScheduleEntry;
  nextEntry?: ScheduleEntry;
  lastUpdated: number;
}

export interface ScheduleViewProps {
  className?: string;
}

// Helper functions for schedule data
export function getCurrentScheduleEntry(entries: ScheduleEntry[]): ScheduleEntry | undefined {
  return entries.find(entry => entry.is_now);
}

export function getNextScheduleEntry(entries: ScheduleEntry[]): ScheduleEntry | undefined {
  const now = Date.now() / 1000;
  return entries
    .filter(entry => entry.start_timestamp > now)
    .sort((a, b) => a.start_timestamp - b.start_timestamp)[0];
}

export function formatScheduleTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatScheduleDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }
}

export function getScheduleDuration(entry: ScheduleEntry): string {
  const durationMs = (entry.end_timestamp - entry.start_timestamp) * 1000;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export function getTimeUntilNext(entry: ScheduleEntry): string {
  const now = Date.now() / 1000;
  const timeUntil = entry.start_timestamp - now;
  
  if (timeUntil <= 0) return 'Now';
  
  const hours = Math.floor(timeUntil / 3600);
  const minutes = Math.floor((timeUntil % 3600) / 60);
  
  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  } else {
    return `in ${minutes}m`;
  }
}

export function simplifyPlaylistName(name: string): string {
  // Remove "Playlist: " prefix if present
  const cleaned = name.replace(/^Playlist:\s*/, '');
  
  // Split on common separators and take the first few genres
  const genres = cleaned.split(/[\/,&]+/).map(g => g.trim());
  
  if (genres.length <= 2) {
    return cleaned;
  }
  
  // Return first 2 genres + "& more" if there are many
  return `${genres.slice(0, 2).join(' & ')} & more`;
}