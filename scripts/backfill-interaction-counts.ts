/**
 * @fileoverview A one-time script to backfill the `interactionCount` for all existing songs.
 * This script iterates through all songs, counts their associated reactions and comments,
 * and updates the `interactionCount` field in Firestore.
 *
 * To run this script:
 * 1. Make sure your `.env.local` file has the correct Firebase Admin credentials.
 * 2. Run `npm install` to ensure all dependencies are installed.
 * 3. Run `npm run migrate:counts` from your terminal.
 */

import { getDb } from '../src/lib/firebase-admin';

async function main() {
  console.log('Starting interaction count backfill...');

  // Get the DB instance without starting the radio listener service.
  const db = getDb();
  if (!db) {
    console.error(
      'Firestore Admin SDK not initialized. Make sure your .env.local file is configured correctly.'
    );
    process.exit(1);
  }

  const songsRef = db.collection('songs');
  const songsSnapshot = await songsRef.get();

  if (songsSnapshot.empty) {
    console.log('No songs found in the database. Nothing to do.');
    return;
  }

  console.log(`Found ${songsSnapshot.size} songs to process.`);
  let processedCount = 0;
  let updatedCount = 0;
  let batch = db.batch();
  let batchCounter = 0;

  for (const songDoc of songsSnapshot.docs) {
    const songId = songDoc.id;

    const reactionsQuery = db
      .collection('reactions')
      .where('songId', '==', songId);
    const commentsQuery = db
      .collection('comments')
      .where('songId', '==', songId);

    // Use efficient count aggregations which are much faster and cheaper than reading documents.
    const [reactionsCountSnapshot, commentsCountSnapshot] = await Promise.all([
      reactionsQuery.count().get(),
      commentsQuery.count().get(),
    ]);

    const reactionCount = reactionsCountSnapshot.data().count;
    const commentCount = commentsCountSnapshot.data().count;
    const totalInteractions = reactionCount + commentCount;

    // Only update if the count is different to avoid unnecessary writes.
    if (songDoc.data().interactionCount !== totalInteractions) {
      batch.update(songDoc.ref, { interactionCount: totalInteractions });
      batchCounter++;
      updatedCount++;
    }

    // Firestore batches are limited to 500 operations. Commit every 400 to be safe.
    if (batchCounter >= 400) {
      console.log(`Committing batch of ${batchCounter} updates...`);
      await batch.commit();
      batch = db.batch();
      batchCounter = 0;
    }

    processedCount++;
    if (processedCount % 50 === 0 || processedCount === songsSnapshot.size) {
      console.log(
        `Progress: ${processedCount}/${songsSnapshot.size} songs scanned...`
      );
    }
  }

  if (batchCounter > 0) {
    console.log(`Committing final batch of ${batchCounter} updates...`);
    await batch.commit();
  }

  console.log('\nBackfill complete!');
  console.log(`- Total songs scanned: ${songsSnapshot.size}`);
  console.log(`- Total songs updated: ${updatedCount}`);
}

main().catch((error) => {
  console.error('\nAn error occurred during the backfill process:', error);
  process.exit(1);
});
