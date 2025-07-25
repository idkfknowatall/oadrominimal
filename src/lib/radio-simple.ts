/**
 * @fileoverview Simplified radio system initialization with proper cleanup
 */

import { SimpleRadioWorker } from './radio-worker-simple';

// Global singleton instance
let globalRadioWorker: SimpleRadioWorker | null = null;
let cleanupHandlers: (() => void)[] = [];

/**
 * Gets or creates the global radio worker instance
 */
export function getRadioWorker(): SimpleRadioWorker {
  if (!globalRadioWorker) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[SINGLETON] Creating new global SimpleRadioWorker instance');
    }
    globalRadioWorker = new SimpleRadioWorker();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[SINGLETON] Starting new global SimpleRadioWorker instance...');
    }
    globalRadioWorker.start().then((result) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SINGLETON] SimpleRadioWorker singleton start() completed with result: ${result}`);
        console.log('[SINGLETON] SimpleRadioWorker singleton initialization complete. This message should appear only once per process.');
      }
    }).catch((error) => {
      console.error('[SINGLETON] Failed to start SimpleRadioWorker:', error);
    });

    // Register cleanup handler
    const cleanup = () => {
      if (globalRadioWorker) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[SINGLETON] Cleaning up global SimpleRadioWorker instance');
        }
        globalRadioWorker.stop();
        globalRadioWorker = null;
      }
    };

    cleanupHandlers.push(cleanup);

    // Register cleanup for various exit scenarios
    if (typeof window !== 'undefined') {
      // Browser environment
      window.addEventListener('beforeunload', cleanup);
      window.addEventListener('unload', cleanup);
      
      // Page visibility API for cleanup when tab becomes hidden
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          cleanup();
        }
      });
    }

    if (typeof process !== 'undefined') {
      // Node.js environment
      process.on('exit', cleanup);
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
      process.on('uncaughtException', (error) => {
        console.error('[SINGLETON] Uncaught exception, cleaning up:', error);
        cleanup();
      });
    }
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log('[SINGLETON] Returning existing global SimpleRadioWorker instance');
    }
  }
  
  return globalRadioWorker;
}

/**
 * Manually cleanup the radio worker instance
 */
export function cleanupRadioWorker(): void {
  cleanupHandlers.forEach(handler => handler());
  cleanupHandlers = [];
}

/**
 * Gets the singleton radio worker instance (lazy initialization)
 * Only creates the instance when actually needed at runtime
 */
export function getRadioWorkerSingleton(): SimpleRadioWorker {
  return getRadioWorker();
}