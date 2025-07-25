/**
 * Tests for Firebase configuration and initialization
 */

import { validateFirebaseConfig, isFirebaseError, FIREBASE_COLLECTIONS } from '../firebase';

// Mock environment variables for testing
const mockEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abcdef123456'
};

describe('Firebase Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateFirebaseConfig', () => {
    it('should validate complete Firebase configuration', () => {
      // Set up mock environment
      Object.assign(process.env, mockEnv);

      const config = validateFirebaseConfig();

      expect(config).toEqual({
        apiKey: 'test-api-key',
        authDomain: 'test-project.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test-project.appspot.com',
        messagingSenderId: '123456789',
        appId: '1:123456789:web:abcdef123456'
      });
    });

    it('should throw error for missing required variables', () => {
      // Set up incomplete environment
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
      // Missing other required variables

      expect(() => validateFirebaseConfig()).toThrow(
        /Missing required Firebase environment variables/
      );
    });

    it('should throw error for empty variables', () => {
      // Set up environment with empty values
      Object.assign(process.env, {
        ...mockEnv,
        NEXT_PUBLIC_FIREBASE_API_KEY: '   ' // Empty/whitespace only
      });

      expect(() => validateFirebaseConfig()).toThrow(
        /Missing required Firebase environment variables/
      );
    });

    it('should handle all missing variables', () => {
      // No Firebase environment variables set
      expect(() => validateFirebaseConfig()).toThrow();
      
      try {
        validateFirebaseConfig();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
        expect(errorMessage).toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
        expect(errorMessage).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
        expect(errorMessage).toContain('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
        expect(errorMessage).toContain('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
        expect(errorMessage).toContain('NEXT_PUBLIC_FIREBASE_APP_ID');
      }
    });
  });

  describe('Firebase constants', () => {
    it('should export correct collection names', () => {
      expect(FIREBASE_COLLECTIONS.VOTES).toBe('votes');
      expect(FIREBASE_COLLECTIONS.VOTE_AGGREGATES).toBe('vote-aggregates');
    });
  });

  describe('isFirebaseError', () => {
    it('should identify Firebase errors correctly', () => {
      const firebaseError = {
        code: 'permission-denied',
        message: 'Missing or insufficient permissions.'
      };

      expect(isFirebaseError(firebaseError)).toBe(true);
    });

    it('should reject non-Firebase errors', () => {
      expect(isFirebaseError(new Error('Regular error'))).toBe(false);
      expect(isFirebaseError('string error')).toBe(false);
      expect(isFirebaseError(null)).toBe(false);
      expect(isFirebaseError(undefined)).toBe(false);
      expect(isFirebaseError({})).toBe(false);
      expect(isFirebaseError({ code: 'test' })).toBe(false); // Missing message
      expect(isFirebaseError({ message: 'test' })).toBe(false); // Missing code
    });
  });
});