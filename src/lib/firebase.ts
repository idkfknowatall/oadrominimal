/**
 * Firebase configuration and initialization
 * Handles Firebase app initialization and Firestore setup for the voting system
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore as getFirestoreInstance, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { isDevelopment } from './env';

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Validate Firebase configuration from environment variables
function validateFirebaseConfig(): FirebaseConfig {
  // In development, try to get config directly from process.env first
  if (process.env.NODE_ENV === 'development') {
    const directConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    // Check if all values are present
    const allPresent = Object.values(directConfig).every(val => val && val.trim().length > 0);
    
    if (allPresent) {
      console.log('[Firebase] Using direct environment variables in development');
      return directConfig as FirebaseConfig;
    }
  }

  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ] as const;

  const config: Partial<FirebaseConfig> = {};
  const missing: string[] = [];

  // Check each required environment variable
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim().length === 0) {
      missing.push(varName);
    } else {
      // Map environment variable names to config keys
      const configKey = varName
        .replace('NEXT_PUBLIC_FIREBASE_', '')
        .toLowerCase()
        .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) as keyof FirebaseConfig;
      
      (config as any)[configKey] = value.trim();
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required Firebase environment variables: ${missing.join(', ')}\n` +
      'Please add these to your .env.local file.'
    );
  }

  return config as FirebaseConfig;
}

// Initialize Firebase app
function initializeFirebaseApp(): FirebaseApp {
  try {
    // Check if Firebase app is already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      return existingApps[0];
    }

    // Validate configuration
    const firebaseConfig = validateFirebaseConfig();

    // Initialize Firebase app
    const app = initializeApp(firebaseConfig);

    if (isDevelopment) {
      console.log('[Firebase] App initialized successfully');
    }

    return app;
  } catch (error) {
    console.error('[Firebase] Failed to initialize app:', error);
    throw new Error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Initialize Firestore
function initializeFirestore(app: FirebaseApp): Firestore {
  try {
    const db = getFirestoreInstance(app);

    // Connect to Firestore emulator in development if configured
    if (isDevelopment && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost';
      const emulatorPort = parseInt(process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PORT || '8080', 10);
      
      try {
        connectFirestoreEmulator(db, emulatorHost, emulatorPort);
        console.log(`[Firebase] Connected to Firestore emulator at ${emulatorHost}:${emulatorPort}`);
      } catch (emulatorError) {
        // Emulator connection might fail if already connected
        console.warn('[Firebase] Firestore emulator connection failed (might already be connected):', emulatorError);
      }
    }

    if (isDevelopment) {
      console.log('[Firebase] Firestore initialized successfully');
    }

    return db;
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firestore:', error);
    throw new Error(`Firestore initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Initialize Firebase services
let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let initializationError: Error | null = null;

// Check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  try {
    // Always return true if we're in development and have the basic config
    if (process.env.NODE_ENV === 'development') {
      const hasBasicConfig = !!(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      );
      
      if (hasBasicConfig) {
        console.log('[Firebase] Development mode - configuration available');
        return true;
      }
    }
    
    // Direct check of environment variables that should be available at build time
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

    const isConfigured = !!(apiKey && authDomain && projectId && storageBucket && messagingSenderId && appId);
    
    if (isDevelopment) {
      console.log('[Firebase] Configuration check:', {
        apiKey: !!apiKey,
        authDomain: !!authDomain,
        projectId: !!projectId,
        storageBucket: !!storageBucket,
        messagingSenderId: !!messagingSenderId,
        appId: !!appId,
        isConfigured
      });
    }
    
    return isConfigured;
  } catch (error) {
    console.error('[Firebase] Configuration check failed:', error);
    return false;
  }
}

// Lazy initialization to avoid issues with SSR
export function getFirebaseApp(): FirebaseApp {
  if (initializationError) {
    throw initializationError;
  }
  
  if (!firebaseApp) {
    try {
      firebaseApp = initializeFirebaseApp();
    } catch (error) {
      initializationError = error as Error;
      throw error;
    }
  }
  return firebaseApp;
}

export function getFirestore(): Firestore {
  if (initializationError) {
    throw initializationError;
  }
  
  if (!firestoreDb) {
    try {
      const app = getFirebaseApp();
      firestoreDb = initializeFirestore(app);
    } catch (error) {
      initializationError = error as Error;
      throw error;
    }
  }
  return firestoreDb;
}

// Export Firebase configuration validation for testing
export { validateFirebaseConfig };

// Collection names as constants
export const FIREBASE_COLLECTIONS = {
  VOTES: 'votes',
  VOTE_AGGREGATES: 'vote-aggregates'
} as const;

// Firebase error handling helper
export function isFirebaseError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as any).code === 'string' &&
    typeof (error as any).message === 'string'
  );
}

// Firebase connection health check
export async function checkFirebaseConnection(): Promise<boolean> {
  try {
    const db = getFirestore();
    // Try to perform a simple operation to verify connection
    // This is a basic check - in a real app you might want to do a simple read operation
    return db !== null && db !== undefined;
  } catch (error) {
    console.error('[Firebase] Connection check failed:', error);
    return false;
  }
}