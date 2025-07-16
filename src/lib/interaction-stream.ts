/**
 * Simple pub/sub system for the simplified version
 */

import type { NowPlaying, StreamStatus } from './types';

export type PubSubEvent =
  | { type: 'now_playing'; data: NowPlaying }
  | { type: 'stream_status'; data: StreamStatus };

type EventHandler = (event: PubSubEvent) => void;

const subscribers: Set<EventHandler> = new Set();

export function subscribe(handler: EventHandler): () => void {
  subscribers.add(handler);
  
  return () => {
    subscribers.delete(handler);
  };
}

export function publish(event: PubSubEvent): void {
  subscribers.forEach(handler => {
    try {
      handler(event);
    } catch (error) {
      console.error('[PubSub] Error in event handler:', error);
    }
  });
}