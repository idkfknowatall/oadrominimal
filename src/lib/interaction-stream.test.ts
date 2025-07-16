import {
  publish,
  subscribe,
  publishLegacy,
  type PubSubEvent,
  type InteractionUpdate,
} from './interaction-stream';
import type { Comment, Reaction } from './types';

describe('Interaction Stream Pub/Sub', () => {
  it('should allow a subscriber to receive a published event', () => {
    const mockCallback = jest.fn();
    const unsubscribe = subscribe(mockCallback);

    const testEvent: PubSubEvent = {
      type: 'new_reaction',
      data: {
        id: '1',
        userId: 'user1',
        songId: 'song1',
        emoji: '👍',
        timestamp: Date.now(),
        user: {
          id: 'user1',
          name: 'Test User',
          displayName: 'Test User',
          avatar: 'https://example.com/avatar.png',
        },
      } as unknown as Reaction,
    };

    publish(testEvent);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(testEvent);

    unsubscribe();
  });

  it('should notify all subscribers of a published event', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const unsubscribe1 = subscribe(callback1);
    const unsubscribe2 = subscribe(callback2);

    const testEvent: PubSubEvent = {
      type: 'stream_status',
      data: { isOnline: true },
    };

    publish(testEvent);

    expect(callback1).toHaveBeenCalledWith(testEvent);
    expect(callback2).toHaveBeenCalledWith(testEvent);

    unsubscribe1();
    unsubscribe2();
  });

  it('should not notify a subscriber after they have unsubscribed', () => {
    const mockCallback = jest.fn();
    const unsubscribe = subscribe(mockCallback);

    unsubscribe();

    const testEvent: PubSubEvent = {
      type: 'new_reaction',
      data: {
        id: '2',
        userId: 'user2',
        songId: 'song2',
        emoji: '❤️',
        timestamp: Date.now(),
        user: {
          id: 'user2',
          name: 'Another User',
          displayName: 'Another User',
          avatar: 'https://example.com/avatar2.png',
        },
      } as unknown as Reaction,
    };

    publish(testEvent);

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should handle legacy interaction updates correctly', () => {
    const mockCallback = jest.fn();
    const unsubscribe = subscribe(mockCallback);

    const legacyData: InteractionUpdate = {
      comments: [{ id: 'c1', text: 'hello' } as Comment],
      reactions: [{ id: 'r1' } as Reaction],
    };

    publishLegacy(legacyData);

    expect(mockCallback).toHaveBeenCalledWith({
      type: 'interaction_update',
      data: legacyData,
    });

    unsubscribe();
  });
});
