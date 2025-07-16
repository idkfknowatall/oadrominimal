/**
 * @fileoverview Enhanced in-memory pub/sub system for broadcasting radio events
 * from the singleton radio worker to all active SSE stream connections.
 */

import type { Comment, Reaction, ClientSong } from './types';
import mitt, { WildcardHandler } from 'mitt';

// Event types for the pub/sub system
export interface NowPlayingEvent {
  type: 'now_playing';
  data: {
    liveSong: ClientSong;
    upNext: ClientSong[];
    recentlyPlayed: ClientSong[];
    listenerCount: number;
  };
}

export interface InteractionUpdateEvent {
  type: 'interaction_update';
  data: {
    comments: Comment[];
    reactions: Reaction[];
  };
}

export interface StreamStatusEvent {
  type: 'stream_status';
  data: {
    isOnline: boolean;
    error?: string;
  };
}

export interface NewReactionEvent {
  type: 'new_reaction';
  data: Reaction;
}

export interface NewSuperReactionEvent {
  type: 'new_super_reaction';
  data: Comment;
}

export type PubSubEvent =
  | NowPlayingEvent
  | InteractionUpdateEvent
  | StreamStatusEvent
  | NewReactionEvent
  | NewSuperReactionEvent;

type Events = {
  [key: string]: PubSubEvent;
};

const emitter = mitt<Events>();

export function subscribe(callback: (event: PubSubEvent) => void): () => void {
  const handler: WildcardHandler<Events> = (type, event) => {
    callback(event);
  };
  emitter.on('*', handler);
  return () => emitter.off('*', handler);
}

// Configuration for deduplication
const DEDUP_WINDOW_MS = 3000; // 3 seconds window for deduplication
const CLEANUP_THRESHOLD = 100; // Clean up when we have more than 100 events
const CLEANUP_RETENTION_MS = 10000; // Keep events for 10 seconds max

// Track published events to identify duplicates
const recentEvents = new Map<
  string,
  {
    count: number;
    timestamp: number;
    hash: string;
  }
>();

/**
 * Creates a more precise fingerprint for an event to improve duplicate detection
 */
function createEventFingerprint(event: PubSubEvent): {
  key: string;
  hash: string;
} {
  let key = event.type;
  let hash = '';

  switch (event.type) {
    case 'now_playing':
      // Include song ID in the key for basic grouping
      key += `-${event.data.liveSong.id}`;
      // Create a hash excluding elapsed time to reduce duplicate events during song playback
      // Only include fields that represent meaningful changes
      hash = JSON.stringify({
        id: event.data.liveSong.id,
        songId: event.data.liveSong.songId,
        title: event.data.liveSong.title,
        artist: event.data.liveSong.artist,
        listenerCount: event.data.listenerCount,
        // Exclude elapsed time as it changes frequently and causes unnecessary events
      });
      break;

    case 'interaction_update':
      // For interactions, create a hash of the actual content
      const commentIds = event.data.comments
        .map((c) => c.id)
        .sort()
        .join(',');
      const reactionIds = event.data.reactions
        .map((r) => r.id)
        .sort()
        .join(',');
      key += `-${event.data.comments.length}-${event.data.reactions.length}`;
      hash = `comments:${commentIds}|reactions:${reactionIds}`;
      break;

    case 'new_reaction':
    case 'new_super_reaction':
      // For individual reactions, use their IDs
      key += `-${event.data.id}`;
      hash = event.data.id;
      break;

    case 'stream_status':
      // For status updates, use the online state
      key += `-${event.data.isOnline}`;
      hash = JSON.stringify(event.data);
      break;

    default:
      // Fallback for any other event types - stringify the whole event
      hash = JSON.stringify(event).slice(0, 100);
  }

  return { key, hash };
}

/**
 * Cleans up old event entries to prevent memory leaks
 */
function cleanupOldEvents(now: number) {
  if (recentEvents.size <= CLEANUP_THRESHOLD) return;

  for (const [key, value] of recentEvents.entries()) {
    if (now - value.timestamp > CLEANUP_RETENTION_MS) {
      recentEvents.delete(key);
    }
  }
}

export function publish(event: PubSubEvent) {
  // Create a fingerprint of the event for more precise duplicate detection
  const { key, hash } = createEventFingerprint(event);

  // Check if this is a duplicate event
  const now = Date.now();
  const recent = recentEvents.get(key);

  // A duplicate must match both the key and the detailed hash,
  // and be within the deduplication time window
  const isDuplicate =
    recent && recent.hash === hash && now - recent.timestamp < DEDUP_WINDOW_MS;

  if (isDuplicate) {
    recent.count++;
    recent.timestamp = now;
    console.log(
      `[InteractionStream] ⚠️ DUPLICATE EVENT DETECTED #${recent.count}: ${event.type}`
    );

    // Skip emitting duplicate events for both interaction_update and now_playing
    // This reduces unnecessary network traffic and database costs
    if (event.type === 'interaction_update' && recent.count > 1) {
      console.log(
        `[InteractionStream] Skipping duplicate interaction_update event`
      );
      return; // Exit without emitting the event
    }

    if (event.type === 'now_playing' && recent.count > 1) {
      console.log(`[InteractionStream] Skipping duplicate now_playing event`);
      return; // Exit without emitting the event
    }
  } else {
    recentEvents.set(key, { count: 1, timestamp: now, hash });
  }

  // Clean up old entries to prevent memory leaks
  cleanupOldEvents(now);

  // For now_playing events, only log the liveSong part to keep logs cleaner
  if (event.type === 'now_playing') {
    // Only log essential song info to reduce log verbosity
    const { id, title, artist } = event.data.liveSong;
    console.log(
      `[InteractionStream] Publishing event: now_playing - Song: "${title}" by ${artist} (${id})${isDuplicate ? ' (DUPLICATE)' : ''}`
    );
  } else {
    // Condense logging for interaction_update events to avoid verbose object dumps
    if (event.type === 'interaction_update') {
      const { comments, reactions } = event.data;
      console.log(
        `[InteractionStream] Publishing event: ${event.type}${isDuplicate ? ' (DUPLICATE)' : ''} - ${comments.length} comments, ${reactions.length} reactions`
      );
    } else {
      console.log(
        `[InteractionStream] Publishing event: ${event.type}${isDuplicate ? ' (DUPLICATE)' : ''}`
      );
    }
  }

  // Emit the event to all subscribers
  emitter.emit(event.type, event);
}

// Legacy support for existing code
export interface InteractionUpdate {
  comments: Comment[];
  reactions: Reaction[];
}

export function publishLegacy(data: InteractionUpdate) {
  publish({
    type: 'interaction_update',
    data,
  });
}
