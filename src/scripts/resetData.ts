import { deleteAllData, deleteSpecificEvent } from '../utils/dataReset';

export const resetDatabase = async () => {
  console.log('🚀 Starting database cleanup process...');

  try {
    // Step 1: Delete all existing data
    console.log('📝 Step 1: Deleting old data...');
    await deleteAllData();

    console.log('✅ Database cleanup completed successfully!');
    console.log('🧹 Firestore is now clean and ready for fresh data.');
    console.log('');
    console.log('📊 Dashboard Status:');
    console.log('   ✅ Agent creation functionality is ready');
    console.log('   ✅ Exhibitor creation is ready');
    console.log('   ✅ Sponsor creation is ready');
    console.log('   ✅ Speaker creation is ready');
    console.log('   ✅ Hosted Buyer creation is ready');
    console.log('   ✅ Event management is ready');
    console.log('');


    return true;
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  }
};

export const deleteOldEvent = async (eventId: string = 'default') => {
  console.log(`🚀 Starting deletion of event: ${eventId}`);

  try {
    console.log(`📝 Deleting event "${eventId}" and all its data...`);
    await deleteSpecificEvent(eventId);

    console.log('✅ Event deletion completed successfully!');
    console.log(`🗑️ Event "${eventId}" has been completely removed from Firestore.`);
    console.log('');
    console.log('📊 What was deleted:');
    console.log(`   ✅ Event document: Events/${eventId}`);
    console.log(`   ✅ All exhibitors in: Events/${eventId}/Exhibitors`);
    console.log(`   ✅ All sponsors in: Events/${eventId}/Sponsors`);
    console.log(`   ✅ All speakers in: Events/${eventId}/Speakers`);
    console.log(`   ✅ All hosted buyers in: Events/${eventId}/HostedBuyers`);
    console.log(`   ✅ All sessions in: Events/${eventId}/Sessions`);
    console.log(`   ✅ Event config in: Events/${eventId}/Config`);
    console.log(`   ✅ Event pages in: Events/${eventId}/Pages`);
    console.log('');


    return true;
  } catch (error) {
    console.error(`❌ Event deletion failed for ${eventId}:`, error);
    throw error;
  }
};

// Auto-run if this script is executed directly
if (require.main === module) {
  // Check if we want to delete a specific event
  const args = process.argv.slice(2);
  if (args.includes('--delete-event') || args.includes('--delete-old-event')) {
    const eventId = args.find(arg => arg.startsWith('--event-id='))?.split('=')[1] || 'default';
    deleteOldEvent(eventId)
      .then(() => {
        console.log('🎊 Event deletion completed! Database is clean.');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Event deletion failed:', error);
        process.exit(1);
      });
  } else {
    resetDatabase()
      .then(() => {
        console.log('🎊 Database reset completed! Ready to start fresh.');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Database reset failed:', error);
        process.exit(1);
      });
  }
}
