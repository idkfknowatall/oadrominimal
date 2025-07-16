// This file centralizes the in-memory data stores for the application.
// This is for demonstration purposes and data will be lost on server restart.
// In a production environment, this would be replaced with a database connection.
import type { Song, Reaction, Comment } from './types';

// Centralized stores
export const reactionsStore: Record<string, Reaction[]> = {};
export const commentsStore: Record<string, Comment[]> = {};
export const songDetailsStore = new Map<string, Song>();

/**
 * Adds a song's details to the cache if it doesn't already exist.
 * This is used to ensure that even if a song is no longer in the "recently played"
 * list, we can still retrieve its details for the "top-rated" page.
 * @param song The song object to add.
 */
export function addSongDetails(song: Song | undefined | null) {
  if (song && song.songId && !songDetailsStore.has(song.songId)) {
    // We only need a subset of the song details, let's not store everything
    // to keep memory usage down. We keep the `id` (sh_id) but discard
    // properties that change over time like `elapsed` and `played_at`.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { elapsed, played_at, ...essentialDetails } = song;
    songDetailsStore.set(song.songId, essentialDetails as Song);
  }
}
