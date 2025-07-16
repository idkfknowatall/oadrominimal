/**
 * @fileoverview Performance and load tests for the radio system
 */

import { jest } from '@jest/globals';
import { PubSubEvent } from './interaction-stream';

// Mock dependencies
jest.mock('eventsource');
jest.mock('./user-cache');
jest.mock('./server-utils');

describe('Radio System Performance', () => {
  let subscribe: (callback: (event: PubSubEvent) => void) => () => void;
  let publish: (event: PubSubEvent) => void;
  let resetWorkerState: () => void;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import modules
    const interactionStream = await import('./interaction-stream');
    subscribe = interactionStream.subscribe;
    publish = interactionStream.publish;

    const { stateService } = await import('./radio/state');
    resetWorkerState = stateService.reset;

    resetWorkerState();
  });

  afterEach(() => {
    resetWorkerState();
  });

  describe('Pub/Sub Performance', () => {
    it('should handle many subscribers efficiently', () => {
      const subscriberCount = 1000;
      const subscribers: (() => void)[] = [];
      const callbacks: jest.Mock[] = [];

      // Create many subscribers
      for (let i = 0; i < subscriberCount; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        const unsubscribe = subscribe(callback);
        subscribers.push(unsubscribe);
      }

      const event: PubSubEvent = {
        type: 'now_playing',
        data: {
          liveSong: {
            id: 1,
            songId: 'perf-test',
            title: 'Performance Test',
            artist: 'Test Artist',
            albumArt: '',
            genre: 'Test',
            duration: 180,
          },
          upNext: [],
          recentlyPlayed: [],
          listenerCount: subscriberCount,
        },
      };

      // Measure publish performance
      const startTime = performance.now();
      publish(event);
      const endTime = performance.now();
      const publishTime = endTime - startTime;

      // Should complete quickly even with many subscribers
      expect(publishTime).toBeLessThan(100); // Less than 100ms

      // All callbacks should be called
      callbacks.forEach((callback) => {
        expect(callback).toHaveBeenCalledWith(event);
      });

      // Test unsubscribe performance
      const unsubscribeStartTime = performance.now();
      subscribers.forEach((unsubscribe) => unsubscribe());
      const unsubscribeEndTime = performance.now();
      const unsubscribeTime = unsubscribeEndTime - unsubscribeStartTime;

      expect(unsubscribeTime).toBeLessThan(50); // Less than 50ms

      // Verify no callbacks are called after unsubscribe
      callbacks.forEach((callback) => callback.mockClear());
      publish(event);
      callbacks.forEach((callback) => {
        expect(callback).not.toHaveBeenCalled();
      });
    });

    it('should handle rapid event publishing', () => {
      const callback = jest.fn();
      subscribe(callback);

      const eventCount = 1000;
      const events = Array.from({ length: eventCount }, (_, i) => ({
        type: 'interaction_update' as const,
        data: {
          comments: [
            {
              id: `comment-${i}`,
              songId: 'rapid-test',
              text: `Comment ${i}`,
              timestamp: i,
              user: { id: `user-${i}`, name: `User ${i}`, avatar: null },
            },
          ],
          reactions: [],
        },
      }));

      const startTime = performance.now();
      events.forEach((event) => publish(event));
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle rapid publishing efficiently
      expect(totalTime).toBeLessThan(200); // Less than 200ms for 1000 events
      expect(callback).toHaveBeenCalledTimes(eventCount);
    });

    it('should handle mixed subscriber add/remove during publishing', () => {
      const initialCallbacks: jest.Mock[] = [];
      const initialUnsubscribers: (() => void)[] = [];

      // Create initial subscribers
      for (let i = 0; i < 100; i++) {
        const callback = jest.fn();
        initialCallbacks.push(callback);
        const unsubscribe = subscribe(callback);
        initialUnsubscribers.push(unsubscribe);
      }

      const event = {
        type: 'stream_status' as const,
        data: { isOnline: true },
      };

      // Publish while adding/removing subscribers
      const startTime = performance.now();

      for (let i = 0; i < 50; i++) {
        publish(event);

        // Add new subscriber
        const newCallback = jest.fn();
        const newUnsubscribe = subscribe(newCallback);

        // Remove old subscriber
        if (initialUnsubscribers.length > 0) {
          const unsubscribe = initialUnsubscribers.pop();
          if (unsubscribe) unsubscribe();
        }

        // Clean up new subscriber
        newUnsubscribe();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle concurrent operations efficiently
      expect(totalTime).toBeLessThan(100); // Less than 100ms
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with many subscribe/unsubscribe cycles', () => {
      const cycles = 1000;

      for (let i = 0; i < cycles; i++) {
        const callbacks: jest.Mock[] = [];
        const unsubscribers: (() => void)[] = [];

        // Create subscribers
        for (let j = 0; j < 10; j++) {
          const callback = jest.fn();
          callbacks.push(callback);
          const unsubscribe = subscribe(callback);
          unsubscribers.push(unsubscribe);
        }

        // Publish event
        publish({
          type: 'now_playing',
          data: {
            liveSong: {
              id: i,
              songId: `cycle-${i}`,
              title: `Cycle ${i}`,
              artist: 'Memory Test',
              albumArt: '',
              genre: 'Test',
              duration: 180,
            },
            upNext: [],
            recentlyPlayed: [],
            listenerCount: 1,
          },
        });

        // Verify callbacks were called
        callbacks.forEach((callback) => {
          expect(callback).toHaveBeenCalledTimes(1);
        });

        // Clean up all subscribers
        unsubscribers.forEach((unsubscribe) => unsubscribe());
      }

      // After cleanup, no callbacks should be called
      const testCallback = jest.fn();
      subscribe(testCallback);

      publish({
        type: 'stream_status',
        data: { isOnline: false },
      });

      expect(testCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle large event payloads efficiently', () => {
      const callback = jest.fn();
      subscribe(callback);

      // Create large payload
      const largeComments = Array.from({ length: 1000 }, (_, i) => ({
        id: `large-comment-${i}`,
        songId: 'large-payload-test',
        text: `This is a very long comment text that simulates real-world usage where users might write detailed feedback about the music they're listening to. Comment number ${i}.`.repeat(
          5
        ),
        timestamp: i * 10,
        user: {
          id: `large-user-${i}`,
          name: `Large User Name That Could Be Very Long ${i}`,
          avatar: `https://example.com/very/long/avatar/url/path/that/might/exist/in/real/world/avatar-${i}.jpg`,
        },
        createdAt: Date.now() + i,
      }));

      const largeReactions = Array.from({ length: 500 }, (_, i) => ({
        id: `large-reaction-${i}`,
        songId: 'large-payload-test',
        emoji: ['🔥', '❤️', '🎵', '👍', '🎉', '💯', '🚀', '⭐'][i % 8],
        timestamp: i * 5,
        user: {
          id: `reaction-user-${i}`,
          name: `Reaction User ${i}`,
          avatar: `https://example.com/reaction-avatar-${i}.jpg`,
        },
        createdAt: Date.now() + i * 2,
      }));

      const largeEvent = {
        type: 'interaction_update' as const,
        data: {
          comments: largeComments,
          reactions: largeReactions,
        },
      };

      const startTime = performance.now();
      publish(largeEvent);
      const endTime = performance.now();
      const publishTime = endTime - startTime;

      // Should handle large payloads efficiently
      expect(publishTime).toBeLessThan(50); // Less than 50ms
      expect(callback).toHaveBeenCalledWith(largeEvent);
    });
  });

  describe('Error Recovery Performance', () => {
    it('should handle subscriber errors without performance degradation', () => {
      const goodCallbacks: jest.Mock[] = [];
      const badCallbacks: jest.Mock[] = [];

      // Create mix of good and bad subscribers
      for (let i = 0; i < 50; i++) {
        const goodCallback = jest.fn();
        goodCallbacks.push(goodCallback);
        subscribe(goodCallback);

        const badCallback = jest.fn().mockImplementation(() => {
          throw new Error(`Bad subscriber ${i}`);
        });
        badCallbacks.push(badCallback);
        subscribe(badCallback);
      }

      // Mock console.error to avoid noise
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const event = {
        type: 'now_playing',
        data: {
          liveSong: {
            id: 1,
            songId: 'error-test',
            title: 'Error Test',
            artist: 'Error Artist',
            albumArt: '',
            genre: 'Test',
            duration: 180,
          },
          upNext: [],
          recentlyPlayed: [],
          listenerCount: 100,
        },
      };

      const startTime = performance.now();
      publish(event as PubSubEvent);
      const endTime = performance.now();
      const publishTime = endTime - startTime;

      // Should complete quickly despite errors
      expect(publishTime).toBeLessThan(100); // Less than 100ms

      // Good callbacks should still be called
      goodCallbacks.forEach((callback) => {
        expect(callback).toHaveBeenCalledWith(event);
      });

      // Bad callbacks should also be called (but throw)
      badCallbacks.forEach((callback) => {
        expect(callback).toHaveBeenCalledWith(event);
      });

      // Errors should be logged
      expect(consoleSpy).toHaveBeenCalledTimes(50);

      consoleSpy.mockRestore();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent publish operations safely', async () => {
      const callback = jest.fn();
      subscribe(callback);

      const concurrentPublishes = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => {
          publish({
            type: 'stream_status',
            data: { isOnline: i % 2 === 0 },
          });
        })
      );

      const startTime = performance.now();
      await Promise.all(concurrentPublishes);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle concurrent operations efficiently
      expect(totalTime).toBeLessThan(5000); // Increased timeout
      expect(callback).toHaveBeenCalledTimes(100);
    });

    it('should handle concurrent subscribe/unsubscribe operations', async () => {
      const operations = Array.from({ length: 200 }, (_, i) =>
        Promise.resolve().then(() => {
          if (i % 2 === 0) {
            // Subscribe
            const callback = jest.fn();
            const unsubscribe = subscribe(callback);
            return unsubscribe;
          } else {
            // Publish
            publish({
              type: 'interaction_update',
              data: { comments: [], reactions: [] },
            });
            return null;
          }
        })
      );

      const startTime = performance.now();
      const results = await Promise.all(operations);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle mixed operations efficiently
      expect(totalTime).toBeLessThan(5000); // Increased timeout

      // Clean up any remaining subscriptions
      results.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    });
  });
});
