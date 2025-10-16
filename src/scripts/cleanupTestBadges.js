/**
 * Cleanup Script for Test Badges
 * This script removes all test badges from the database
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, query, where, writeBatch } = require('firebase/firestore');

// Firebase config - you'll need to add your actual config
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function cleanupTestBadges() {
  try {
    console.log('🧹 Starting cleanup of test badges...');

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Get all badges
    const badgesQuery = query(collection(db, 'Badges'));
    const badgesSnapshot = await getDocs(badgesQuery);

    const testBadges = [];
    const badgesToDelete = [];

    badgesSnapshot.forEach((doc) => {
      const badgeData = doc.data();
      const badgeId = doc.id;
      const name = badgeData.name || '';
      const email = badgeData.email || '';

      // Identify test badges
      if (
        name.toLowerCase().includes('test') ||
        name.toLowerCase().includes('john doe') ||
        name.toLowerCase().includes('jane smith') ||
        name.toLowerCase().includes('test user') ||
        email.toLowerCase().includes('example.com') ||
        name.includes('Mondher Mechi') ||
        name.includes('Test User')
      ) {
        testBadges.push({ id: badgeId, name, email });
        badgesToDelete.push(badgeId);
      }
    });

    if (testBadges.length === 0) {
      console.log('✅ No test badges found to clean up.');
      return;
    }

    console.log(`📋 Found ${testBadges.length} test badges to delete:`);
    testBadges.forEach(badge => {
      console.log(`  - ${badge.name} (${badge.id})`);
    });

    // Delete test badges in batches
    const batchSize = 10;
    let deletedCount = 0;

    for (let i = 0; i < badgesToDelete.length; i += batchSize) {
      const batch = writeBatch(db);
      const currentBatch = badgesToDelete.slice(i, i + batchSize);

      currentBatch.forEach(badgeId => {
        batch.delete(doc(db, 'Badges', badgeId));
        console.log(`🗑️ Marked for deletion: ${badgeId}`);
      });

      await batch.commit();
      deletedCount += currentBatch.length;
      console.log(`✅ Deleted batch: ${deletedCount}/${badgesToDelete.length} badges`);
    }

    console.log(`🎉 Successfully cleaned up ${deletedCount} test badges!`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupTestBadges()
    .then(() => {
      console.log('🏁 Cleanup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupTestBadges };
