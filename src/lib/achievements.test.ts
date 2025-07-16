import {
  calculateSongAchievements,
  calculateUserAchievements,
} from './achievements';
import type { Song, Tastemaker } from './types';
import { subMonths, subYears } from 'date-fns';

describe('achievements', () => {
  describe('calculateSongAchievements', () => {
    // Helper to create a base song object for testing
    const createMockSong = (overrides: Partial<Song> = {}): Song => {
      const defaults: Song = {
        id: 1,
        songId: 'test-song',
        title: 'Test Song',
        artist: 'Test Artist',
        albumArt: '',
        genre: 'Test',
        duration: 180,
        interactionCount: 0,
        firstPlayedAt: Math.floor(Date.now() / 1000), // Default to now
      };
      return { ...defaults, ...overrides };
    };

    it('should return no achievements for a new song with no interactions', () => {
      const song = createMockSong();
      const achievements = calculateSongAchievements(song);
      expect(achievements).toHaveLength(0);
    });

    it('should return the correct interaction achievement based on count', () => {
      const song = createMockSong({ interactionCount: 15 });
      const achievements = calculateSongAchievements(song);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].id).toBe('song_interact_10');
    });

    it('should only return the highest tier of interaction achievement', () => {
      const song = createMockSong({ interactionCount: 150 });
      const achievements = calculateSongAchievements(song);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].id).toBe('song_interact_100'); // Station Anthem, not Banger Alert
      expect(achievements[0].name).toBe('Station Anthem');
    });

    it('should return the correct age achievement', () => {
      const firstPlayedAt = subMonths(new Date(), 4);
      const song = createMockSong({
        firstPlayedAt: Math.floor(firstPlayedAt.getTime() / 1000),
      });
      const achievements = calculateSongAchievements(song);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].id).toBe('song_age_3mo');
    });

    it('should only return the highest tier of age achievement', () => {
      const firstPlayedAt = subYears(new Date(), 6);
      const song = createMockSong({
        firstPlayedAt: Math.floor(firstPlayedAt.getTime() / 1000),
      });
      const achievements = calculateSongAchievements(song);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].id).toBe('song_age_5y'); // Ancient Artifact, not Golden Oldie
      expect(achievements[0].name).toBe('Ancient Artifact');
    });

    it('should return one of each category if both thresholds are met', () => {
      const firstPlayedAt = subYears(new Date(), 2);
      const song = createMockSong({
        interactionCount: 30,
        firstPlayedAt: Math.floor(firstPlayedAt.getTime() / 1000),
      });
      const achievements = calculateSongAchievements(song);
      expect(achievements).toHaveLength(2);

      const achievementIds = achievements.map((a) => a.id);
      expect(achievementIds).toContain('song_interact_25'); // Fan Favorite
      expect(achievementIds).toContain('song_age_1y'); // Golden Oldie
    });

    it('should return no age achievement if firstPlayedAt is missing', () => {
      const song = createMockSong({
        firstPlayedAt: undefined,
        interactionCount: 10,
      });
      const achievements = calculateSongAchievements(song);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].category).toBe('interactions');
    });
  });

  describe('calculateUserAchievements', () => {
    const createMockStats = (
      overrides: Partial<Omit<Tastemaker, 'achievements'>> = {}
    ): Omit<Tastemaker, 'achievements'> => {
      const defaults = {
        id: 'test-user',
        name: 'Test User',
        avatar: '',
        commentCount: 0,
        reactionCount: 0,
        interactionScore: 0,
        totalListeningSeconds: 0,
      };
      return { ...defaults, ...overrides };
    };

    it('should return no achievements for a new user', () => {
      const stats = createMockStats();
      const achievements = calculateUserAchievements(stats);
      expect(achievements).toHaveLength(0);
    });

    it('should return the correct reaction achievement', () => {
      const stats = createMockStats({ reactionCount: 100 });
      const achievements = calculateUserAchievements(stats);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].id).toBe('react_100'); // Centurion
    });

    it('should return the correct listening achievement', () => {
      const stats = createMockStats({ totalListeningSeconds: 8 * 60 * 60 }); // 8 hours
      const achievements = calculateUserAchievements(stats);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].id).toBe('listen_8h'); // All-Nighter
    });

    it('should only return the highest tier for each category', () => {
      const stats = createMockStats({
        reactionCount: 1500, // Qualifies for all reaction tiers
        totalListeningSeconds: 35 * 24 * 60 * 60, // 35 days, qualifies for multiple listening tiers
      });
      const achievements = calculateUserAchievements(stats);
      expect(achievements).toHaveLength(2);
      const achievementIds = achievements.map((a) => a.id).sort();
      expect(achievementIds).toEqual(['listen_30d', 'react_1000']);
    });

    it('should handle combined reaction and comment counts', () => {
      const stats = createMockStats({ reactionCount: 150, commentCount: 101 }); // Total 251
      const achievements = calculateUserAchievements(stats);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].id).toBe('react_250'); // Tastemaker
    });

    it('should handle undefined or zero stats gracefully', () => {
      const stats = createMockStats({
        reactionCount: undefined,
        totalListeningSeconds: 0,
      });
      const achievements = calculateUserAchievements(stats);
      expect(achievements).toHaveLength(0);
    });
  });
});
