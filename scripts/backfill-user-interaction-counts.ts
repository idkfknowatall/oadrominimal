/**
 * @fileoverview A one-time script to backfill the `commentCount` and `reactionCount`
 * for all existing users. This is necessary after denormalizing these counts for performance.
 *
 * To run this script:
 * 1. Make sure your `.env.local` file has the correct Firebase Admin credentials.
 * 2. Run `npm install` to ensure all dependencies are installed.
 * 3. Run `npm run migrate:user-counts` from your terminal.
 */

import { getDb } from '../src/lib/firebase-admin';

async function main() {
  console.log('Starting user interaction count backfill...');

  // Get the DB instance without starting the radio listener service.
  const db = getDb();
  if (!db) {
    console.error(
      'Firestore Admin SDK not initialized. Make sure your .env.local file is configured correctly.'
    );
    process.exit(1);
  }

  const usersRef = db.collection('users');
  const usersSnapshot = await usersRef.get();

  if (usersSnapshot.empty) {
    console.log('No users found in the database. Nothing to do.');
    return;
  }

  console.log(`Found ${usersSnapshot.size} users to process.`);
  let processedCount = 0;
  let updatedCount = 0;
  let batch = db.batch();
  let batchCounter = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();

    const reactionsQuery = db
      .collection('reactions')
      .where('userId', '==', userId);
    const commentsQuery = db
      .collection('comments')
      .where('userId', '==', userId);

    // Use efficient count aggregations
    const [reactionsCountSnapshot, commentsCountSnapshot] = await Promise.all([
      reactionsQuery.count().get(),
      commentsQuery.count().get(),
    ]);

    const reactionCount = reactionsCountSnapshot.data().count;
    const commentCount = commentsCountSnapshot.data().count;

    // Only update if the counts are different to avoid unnecessary writes.
    if (
      userData.reactionCount !== reactionCount ||
      userData.commentCount !== commentCount
    ) {
      batch.update(userDoc.ref, { reactionCount, commentCount });
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
    if (processedCount % 50 === 0 || processedCount === usersSnapshot.size) {
      console.log(
        `Progress: ${processedCount}/${usersSnapshot.size} users scanned...`
      );
    }
  }

  if (batchCounter > 0) {
    console.log(`Committing final batch of ${batchCounter} updates...`);
    await batch.commit();
  }

  console.log('\nUser interaction count backfill complete!');
  console.log(`- Total users scanned: ${usersSnapshot.size}`);
  console.log(`- Total users updated: ${updatedCount}`);
}

main().catch((error) => {
  console.error(
    '\nAn error occurred during the user count backfill process:',
    error
  );
  process.exit(1);
});
