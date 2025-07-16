#!/usr/bin/env tsx
/**
 * Demonstration script for the Firestore logging system.
 * This script exercises various Firestore operations to showcase the debugging capabilities.
 *
 * Usage:
 *   npm run demo:firestore-logging
 *   or
 *   npx tsx scripts/test-firestore-logging.ts
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  debuggedGet,
  debuggedQuery,
  debuggedWrite,
  debuggedDelete,
  debuggedBatch,
  debuggedTransaction,
  getSessionStats,
  logSessionSummary,
  resetSessionStats,
} from '../src/lib/firestore-debug-wrapper';
import {
  updateDebugConfig,
  resetDebugConfig,
} from '../src/lib/firestore-debug-config';
import type { QueryFilter } from '../src/types/firestore-debug';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

/**
 * Initialize Firebase Admin SDK for testing
 */
function initializeFirebase() {
  if (getApps().length === 0) {
    // Initialize with default credentials or emulator
    if (process.env.FIREBASE_EMULATOR_RUNNING === 'true') {
      console.log(`${colors.cyan}🔧 Using Firebase Emulator${colors.reset}`);
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    }

    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
    });
  }

  return getFirestore();
}

/**
 * Print section header
 */
function printSection(title: string) {
  console.log(
    `\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`
  );
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(
    `${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`
  );
}

/**
 * Print subsection header
 */
function printSubsection(title: string) {
  console.log(
    `\n${colors.bright}${colors.yellow}--- ${title} ---${colors.reset}\n`
  );
}

/**
 * Wait for a specified duration
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Demonstrate basic CRUD operations
 */
async function demonstrateCrudOperations(db: FirebaseFirestore.Firestore) {
  printSubsection('Basic CRUD Operations');

  const testCollection = db.collection('demo-songs');

  // CREATE - Add a new document
  console.log(`${colors.green}➕ Adding a new song...${colors.reset}`);
  const addResult = await debuggedWrite(
    async () => {
      return testCollection.add({
        title: 'Demo Song',
        artist: 'Demo Artist',
        genre: 'Electronic',
        duration: 180,
        createdAt: new Date(),
        plays: 0,
        likes: 0,
      });
    },
    'add',
    'demo-songs',
    undefined,
    { operationName: 'Add demo song' }
  );

  const docId = addResult.result.id;
  console.log(
    `${colors.green}✅ Added document with ID: ${docId}${colors.reset}`
  );

  await wait(100); // Small delay to show timing differences

  // READ - Get the document
  console.log(`\n${colors.green}📖 Reading the song...${colors.reset}`);
  await debuggedGet(
    async () => {
      return testCollection.doc(docId).get();
    },
    'demo-songs',
    docId,
    { operationName: 'Get demo song by ID' }
  );

  await wait(100);

  // UPDATE - Update the document
  console.log(`\n${colors.green}✏️ Updating the song...${colors.reset}`);
  await debuggedWrite(
    async () => {
      return testCollection.doc(docId).update({
        plays: 1,
        likes: 1,
        lastPlayed: new Date(),
      });
    },
    'update',
    'demo-songs',
    docId,
    { operationName: 'Update song stats' }
  );

  await wait(100);

  // DELETE - Remove the document
  console.log(`\n${colors.green}🗑️ Deleting the song...${colors.reset}`);
  await debuggedDelete(
    async () => {
      return testCollection.doc(docId).delete();
    },
    'demo-songs',
    docId,
    { operationName: 'Delete demo song' }
  );

  console.log(`${colors.green}✅ CRUD operations completed${colors.reset}`);
}

/**
 * Demonstrate query operations with different complexities
 */
async function demonstrateQueryOperations(db: FirebaseFirestore.Firestore) {
  printSubsection('Query Operations');

  const songsCollection = db.collection('demo-songs');

  // First, add some test data
  console.log(`${colors.green}📝 Setting up test data...${colors.reset}`);
  const testSongs = [
    {
      title: 'Song 1',
      artist: 'Artist A',
      genre: 'Rock',
      plays: 100,
      likes: 10,
      createdAt: new Date('2024-01-01'),
    },
    {
      title: 'Song 2',
      artist: 'Artist B',
      genre: 'Pop',
      plays: 200,
      likes: 25,
      createdAt: new Date('2024-02-01'),
    },
    {
      title: 'Song 3',
      artist: 'Artist A',
      genre: 'Rock',
      plays: 150,
      likes: 15,
      createdAt: new Date('2024-03-01'),
    },
    {
      title: 'Song 4',
      artist: 'Artist C',
      genre: 'Electronic',
      plays: 300,
      likes: 40,
      createdAt: new Date('2024-04-01'),
    },
    {
      title: 'Song 5',
      artist: 'Artist B',
      genre: 'Pop',
      plays: 250,
      likes: 30,
      createdAt: new Date('2024-05-01'),
    },
  ];

  const docIds: string[] = [];
  for (const song of testSongs) {
    const docRef = await songsCollection.add(song);
    docIds.push(docRef.id);
  }

  await wait(200);

  // Simple query - Get all songs
  console.log(`\n${colors.green}🔍 Simple query - All songs...${colors.reset}`);
  await debuggedQuery(
    async () => {
      return songsCollection.get();
    },
    'demo-songs',
    undefined,
    { operationName: 'Get all songs (full collection scan)' }
  );

  await wait(100);

  // Filtered query - Songs by genre
  console.log(
    `\n${colors.green}🔍 Filtered query - Rock songs...${colors.reset}`
  );
  const genreFilters: QueryFilter[] = [
    { field: 'genre', operator: '==', value: 'Rock' },
  ];

  await debuggedQuery(
    async () => {
      return songsCollection.where('genre', '==', 'Rock').get();
    },
    'demo-songs',
    genreFilters,
    { operationName: 'Get songs by genre' }
  );

  await wait(100);

  // Complex query - Multiple filters (needs composite index)
  console.log(
    `\n${colors.green}🔍 Complex query - Popular rock songs...${colors.reset}`
  );
  const complexFilters: QueryFilter[] = [
    { field: 'genre', operator: '==', value: 'Rock' },
    { field: 'plays', operator: '>', value: 120 },
  ];

  await debuggedQuery(
    async () => {
      return songsCollection
        .where('genre', '==', 'Rock')
        .where('plays', '>', 120)
        .get();
    },
    'demo-songs',
    complexFilters,
    { operationName: 'Get popular rock songs (composite index needed)' }
  );

  await wait(100);

  // Expensive query - Large result set simulation
  console.log(
    `\n${colors.green}🔍 Expensive query - All songs with high limit...${colors.reset}`
  );
  await debuggedQuery(
    async () => {
      // Simulate a query that would return many documents
      const snapshot = await songsCollection.get();
      // Create a mock result with many documents to trigger cost warnings
      return {
        ...snapshot,
        size: 150, // Simulate 150 documents
        docs: new Array(150).fill(snapshot.docs[0] || {}),
      };
    },
    'demo-songs',
    undefined,
    { operationName: 'Expensive query simulation (150 documents)' }
  );

  // Clean up test data
  console.log(`\n${colors.green}🧹 Cleaning up test data...${colors.reset}`);
  for (const docId of docIds) {
    await songsCollection.doc(docId).delete();
  }

  console.log(`${colors.green}✅ Query operations completed${colors.reset}`);
}

/**
 * Demonstrate batch operations
 */
async function demonstrateBatchOperations(db: FirebaseFirestore.Firestore) {
  printSubsection('Batch Operations');

  console.log(
    `${colors.green}📦 Executing batch write operation...${colors.reset}`
  );

  await debuggedBatch(
    async () => {
      const batch = db.batch();
      const collection = db.collection('demo-batch');

      // Add multiple documents in a batch
      for (let i = 1; i <= 5; i++) {
        const docRef = collection.doc(`batch-doc-${i}`);
        batch.set(docRef, {
          name: `Batch Document ${i}`,
          value: i * 10,
          createdAt: new Date(),
        });
      }

      await batch.commit();
    },
    ['demo-batch'],
    { operationName: 'Batch create 5 documents' }
  );

  await wait(100);

  // Clean up batch documents
  console.log(
    `\n${colors.green}🧹 Cleaning up batch documents...${colors.reset}`
  );
  const cleanupBatch = db.batch();
  for (let i = 1; i <= 5; i++) {
    cleanupBatch.delete(db.collection('demo-batch').doc(`batch-doc-${i}`));
  }
  await cleanupBatch.commit();

  console.log(`${colors.green}✅ Batch operations completed${colors.reset}`);
}

/**
 * Demonstrate transaction operations
 */
async function demonstrateTransactionOperations(
  db: FirebaseFirestore.Firestore
) {
  printSubsection('Transaction Operations');

  console.log(
    `${colors.green}🔄 Executing transaction operation...${colors.reset}`
  );

  // Set up test documents
  const userRef = db.collection('demo-users').doc('user1');
  const songRef = db.collection('demo-songs').doc('song1');

  await userRef.set({ name: 'Test User', credits: 100 });
  await songRef.set({ title: 'Test Song', plays: 0 });

  await wait(100);

  await debuggedTransaction(
    async () => {
      return db.runTransaction(async (transaction) => {
        // Read current values
        const userDoc = await transaction.get(userRef);
        const songDoc = await transaction.get(songRef);

        if (!userDoc.exists || !songDoc.exists) {
          throw new Error('Documents do not exist');
        }

        const userData = userDoc.data()!;
        const songData = songDoc.data()!;

        // Check if user has enough credits
        if (userData.credits < 1) {
          throw new Error('Insufficient credits');
        }

        // Update both documents atomically
        transaction.update(userRef, { credits: userData.credits - 1 });
        transaction.update(songRef, { plays: songData.plays + 1 });

        return {
          success: true,
          newCredits: userData.credits - 1,
          newPlays: songData.plays + 1,
        };
      });
    },
    ['demo-users', 'demo-songs'],
    { operationName: 'Play song transaction (deduct credit, increment plays)' }
  );

  // Clean up transaction test documents
  console.log(
    `\n${colors.green}🧹 Cleaning up transaction documents...${colors.reset}`
  );
  await userRef.delete();
  await songRef.delete();

  console.log(
    `${colors.green}✅ Transaction operations completed${colors.reset}`
  );
}

/**
 * Demonstrate error handling
 */
async function demonstrateErrorHandling(db: FirebaseFirestore.Firestore) {
  printSubsection('Error Handling');

  console.log(
    `${colors.red}❌ Demonstrating error scenarios...${colors.reset}`
  );

  // Try to read a non-existent document
  try {
    await debuggedGet(
      async () => {
        const doc = await db.collection('non-existent').doc('fake-id').get();
        if (!doc.exists) {
          throw new Error('Document does not exist');
        }
        return doc;
      },
      'non-existent',
      'fake-id',
      { operationName: 'Attempt to read non-existent document' }
    );
  } catch (error) {
    console.log(
      `${colors.red}Expected error caught: ${(error as Error).message}${colors.reset}`
    );
  }

  await wait(100);

  // Try a transaction that will fail
  try {
    await debuggedTransaction(
      async () => {
        return db.runTransaction(async (transaction) => {
          // Simulate a transaction failure
          throw new Error('Simulated transaction failure');
        });
      },
      ['demo-collection'],
      { operationName: 'Failing transaction example' }
    );
  } catch (error) {
    console.log(
      `${colors.red}Expected transaction error caught: ${(error as Error).message}${colors.reset}`
    );
  }

  console.log(
    `${colors.green}✅ Error handling demonstration completed${colors.reset}`
  );
}

/**
 * Demonstrate performance scenarios
 */
async function demonstratePerformanceScenarios(
  db: FirebaseFirestore.Firestore
) {
  printSubsection('Performance Scenarios');

  // Simulate a slow operation
  console.log(`${colors.yellow}⏱️ Simulating slow operation...${colors.reset}`);
  await debuggedGet(
    async () => {
      // Simulate network delay
      await wait(1200); // Longer than the default threshold
      return { exists: true, data: () => ({ slow: true }) };
    },
    'demo-collection',
    'slow-doc',
    {
      operationName: 'Simulated slow operation (1.2s delay)',
      performanceThreshold: 1000, // Custom threshold for this operation
    }
  );

  await wait(100);

  // Simulate an expensive operation
  console.log(
    `\n${colors.yellow}💰 Simulating expensive operation...${colors.reset}`
  );
  await debuggedQuery(
    async () => {
      // Simulate a large result set
      return {
        size: 250,
        docs: new Array(250).fill({ data: () => ({ expensive: true }) }),
      };
    },
    'demo-collection',
    undefined,
    { operationName: 'Simulated expensive operation (250 document reads)' }
  );

  console.log(
    `${colors.green}✅ Performance scenarios completed${colors.reset}`
  );
}

/**
 * Show session statistics
 */
function showSessionStatistics() {
  printSubsection('Session Statistics');

  const stats = getSessionStats();

  console.log(`${colors.bright}📊 Current Session Statistics:${colors.reset}`);
  console.log(`Total Operations: ${stats.totalOperations}`);
  console.log(`Total Reads: ${stats.totalReads}`);
  console.log(`Total Writes: ${stats.totalWrites}`);
  console.log(`Total Cost: ${stats.totalCost} units`);
  console.log(`Average Duration: ${stats.averageDuration.toFixed(2)}ms`);
  console.log(`Error Count: ${stats.errorCount}`);

  console.log(`\n${colors.bright}Operations by Type:${colors.reset}`);
  Object.entries(stats.operationsByType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`  ${type}: ${count}`);
    }
  });

  if (stats.slowestOperations.length > 0) {
    console.log(`\n${colors.yellow}Slowest Operations:${colors.reset}`);
    stats.slowestOperations.slice(0, 3).forEach((op, index) => {
      console.log(
        `  ${index + 1}. ${op.operationType} ${op.collectionPath} - ${op.duration}ms`
      );
    });
  }

  if (stats.mostExpensiveOperations.length > 0) {
    console.log(`\n${colors.red}Most Expensive Operations:${colors.reset}`);
    stats.mostExpensiveOperations.slice(0, 3).forEach((op, index) => {
      console.log(
        `  ${index + 1}. ${op.operationType} ${op.collectionPath} - ${op.estimatedCost} units`
      );
    });
  }
}

/**
 * Main demonstration function
 */
async function main() {
  console.log(
    `${colors.bright}${colors.magenta}🚀 Firestore Logging System Demonstration${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.magenta}This script demonstrates the enhanced debugging capabilities${colors.reset}\n`
  );

  // Force enable debugging for demonstration
  updateDebugConfig({
    enabled: true,
    logLevel: 'debug',
    showPerformanceMetrics: true,
    showCostEstimates: true,
    showQueryAnalysis: true,
    performanceThreshold: 1000,
    costThreshold: 100,
  });

  const db = initializeFirebase();

  try {
    // Reset session stats at the beginning
    resetSessionStats();

    printSection('🔧 FIRESTORE LOGGING SYSTEM DEMO');

    // Run all demonstrations
    await demonstrateCrudOperations(db);
    await demonstrateQueryOperations(db);
    await demonstrateBatchOperations(db);
    await demonstrateTransactionOperations(db);
    await demonstrateErrorHandling(db);
    await demonstratePerformanceScenarios(db);

    // Show final statistics
    printSection('📊 FINAL SESSION SUMMARY');
    showSessionStatistics();

    // Log the official session summary
    console.log(
      `\n${colors.bright}${colors.cyan}Official Session Summary:${colors.reset}`
    );
    logSessionSummary();
  } catch (error) {
    console.error(`${colors.red}❌ Demo failed:${colors.reset}`, error);
    process.exit(1);
  } finally {
    // Reset configuration
    resetDebugConfig();
  }

  console.log(
    `\n${colors.bright}${colors.green}✅ Firestore logging demonstration completed successfully!${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.green}Check the console output above to see the rich debugging information.${colors.reset}\n`
  );
}

// Run the demonstration
if (require.main === module) {
  main().catch(console.error);
}

export { main as runFirestoreLoggingDemo };
