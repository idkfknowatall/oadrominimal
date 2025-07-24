/**
 * @fileoverview Simplified radio system initialization
 */

import { SimpleRadioWorker } from './radio-worker-simple';

// Global singleton instance
let globalRadioWorker: SimpleRadioWorker | null = null;

/**
 * Gets or creates the global radio worker instance
 */
export function getRadioWorker(): SimpleRadioWorker {
  if (!globalRadioWorker) {
    console.log('[SINGLETON] Creating new global SimpleRadioWorker instance');
    globalRadioWorker = new SimpleRadioWorker();
    
    console.log('[SINGLETON] Starting new global SimpleRadioWorker instance...');
    globalRadioWorker.start().then((result) => {
      console.log(`[SINGLETON] SimpleRadioWorker singleton start() completed with result: ${result}`);
      console.log('[SINGLETON] SimpleRadioWorker singleton initialization complete. This message should appear only once per process.');
    }).catch((error) => {
      console.error('[SINGLETON] Failed to start SimpleRadioWorker:', error);
    });
  } else {
    console.log('[SINGLETON] Returning existing global SimpleRadioWorker instance');
  }
  
  return globalRadioWorker;
}

// Export the singleton instance
/**
 * Gets the singleton radio worker instance (lazy initialization)
 * Only creates the instance when actually needed at runtime
 */
export function getRadioWorkerSingleton(): SimpleRadioWorker {
  return getRadioWorker();
}