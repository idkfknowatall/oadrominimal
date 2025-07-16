import {
  formatDuration,
  formatListeningTime,
  sanitizeText,
  slugify,
  calculateInfluenceScore,
} from './utils';

describe('utils', () => {
  describe('formatDuration', () => {
    it('should format undefined or NaN to 0:00', () => {
      expect(formatDuration(undefined)).toBe('0:00');
      expect(formatDuration(NaN)).toBe('0:00');
    });

    it('should handle seconds less than a minute', () => {
      expect(formatDuration(59)).toBe('0:59');
    });

    it('should handle exact minutes', () => {
      expect(formatDuration(120)).toBe('2:00');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatDuration(155)).toBe('2:35');
    });

    it('should pad seconds with a leading zero', () => {
      expect(formatDuration(65)).toBe('1:05');
    });
  });

  describe('formatListeningTime', () => {
    it('should return 0m for less than a minute', () => {
      expect(formatListeningTime(undefined)).toBe('0m');
      expect(formatListeningTime(59)).toBe('0m');
    });

    it('should format minutes only', () => {
      expect(formatListeningTime(60)).toBe('1m');
      expect(formatListeningTime(3599)).toBe('59m');
    });

    it('should format hours and minutes', () => {
      expect(formatListeningTime(3600)).toBe('1h 0m');
      expect(formatListeningTime(3661)).toBe('1h 1m');
      expect(formatListeningTime(7322)).toBe('2h 2m');
    });
  });

  describe('sanitizeText', () => {
    it('should return an empty string for nullish input', () => {
      expect(sanitizeText(null as unknown as string)).toBe('');
      expect(sanitizeText(undefined as unknown as string)).toBe('');
    });

    it('should not change a clean string', () => {
      expect(sanitizeText('Hello world')).toBe('Hello world');
    });

    it('should strip script tags', () => {
      expect(sanitizeText('Hello <script>alert("xss")</script> world')).toBe(
        'Hello  world'
      );
    });

    it('should strip all HTML tags', () => {
      expect(sanitizeText('<b>Bold</b> and <i>italic</i>')).toBe(
        'Bold and italic'
      );
    });

    it('should trim whitespace', () => {
      expect(sanitizeText('  leading and trailing spaces  ')).toBe(
        'leading and trailing spaces'
      );
    });
  });

  describe('slugify', () => {
    it('should convert spaces to dashes', () => {
      expect(slugify('hello world')).toBe('hello-world');
    });

    it('should convert to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('hello!@#$world%^&*()')).toBe('helloworld');
    });

    it('should handle multiple dashes', () => {
      expect(slugify('hello--world')).toBe('hello-world');
    });

    it('should handle leading/trailing dashes and spaces', () => {
      expect(slugify('  -hello world-  ')).toBe('hello-world');
    });
  });

  describe('calculateInfluenceScore', () => {
    it('should return 0 for no activity', () => {
      expect(calculateInfluenceScore({})).toBe(0);
      expect(
        calculateInfluenceScore({
          commentCount: 0,
          reactionCount: 0,
          totalListeningSeconds: 0,
        })
      ).toBe(0);
    });

    it('should correctly sum up interactions', () => {
      expect(
        calculateInfluenceScore({ commentCount: 5, reactionCount: 10 })
      ).toBe(15);
    });

    it('should correctly calculate points for listening time', () => {
      // 10 minutes = 1 point
      expect(calculateInfluenceScore({ totalListeningSeconds: 600 })).toBe(1);
      // 1 hour = 6 points
      expect(calculateInfluenceScore({ totalListeningSeconds: 3600 })).toBe(6);
    });

    it('should handle fractional points for listening time', () => {
      // 5 minutes = 0.5 points
      expect(
        calculateInfluenceScore({ totalListeningSeconds: 300 })
      ).toBeCloseTo(0.5);
    });

    it('should combine interactions and listening time correctly', () => {
      const score = calculateInfluenceScore({
        commentCount: 5,
        reactionCount: 10,
        totalListeningSeconds: 1200, // 20 minutes = 2 points
      });
      expect(score).toBeCloseTo(17); // 5 + 10 + 2
    });

    it('should handle undefined or null values gracefully', () => {
      const score = calculateInfluenceScore({
        commentCount: 5,
        reactionCount: undefined,
        totalListeningSeconds: null as unknown as number,
      });
      expect(score).toBe(5);
    });
  });
});
