/**
 * Integration tests for Firebase initialization
 * These tests verify that Firebase can be initialized with proper configuration
 */

// Mock Firebase modules to avoid actual Firebase connections in tests
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'test-app' })),
  getApps: jest.fn(() => [])
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ _delegate: { _databaseId: 'test-db' } })),
  connectFirestoreEmulator: jest.fn()
}));

import { getFirebaseApp, getFirestore, checkFirebaseConnection } from '../firebase';

describe('Firebase Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    
    // Set up valid Firebase configuration
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef123456';
    process.env.NODE_ENV = 'test';

    // Clear module cache to ensure fresh imports
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getFirebaseApp', () => {
    it('should initialize Firebase app successfully', () => {
      const app = getFirebaseApp();
      expect(app).toBeDefined();
      expect(app.name).toBe('test-app');
    });
  });

  describe('getFirestore', () => {
    it('should initialize Firestore successfully', () => {
      const db = getFirestore();
      expect(db).toBeDefined();
      expect(db._delegate._databaseId).toBe('test-db');
    });
  });

  describe('checkFirebaseConnection', () => {
    it('should return true for successful connection', async () => {
      const isConnected = await checkFirebaseConnection();
      expect(isConnected).toBe(true);
    });

    it('should handle connection check gracefully', async () => {
      // This test verifies the function exists and returns a boolean
      const isConnected = await checkFirebaseConnection();
      expect(typeof isConnected).toBe('boolean');
    });
  });
});