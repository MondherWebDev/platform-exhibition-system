import { collection, getDocs, deleteDoc, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';

async function deleteCollection(collectionRef: any) {
  const snapshot = await getDocs(collectionRef);
  const batch = writeBatch(db);
  let count = 0;

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });

  if (count > 0) {
    await batch.commit();
    console.log(`   ✅ Deleted ${count} documents`);
  } else {
    console.log(`   ℹ️ Collection already empty`);
  }
}

async function completeCleanup() {
  try {
    console.log('🔥 Starting COMPLETE Firestore cleanup...');
    console.log('🗑️ This will delete ALL data from ALL collections');

    // List of all collections to clean
    const collections = [
      'Events', 'Users', 'AppSettings', 'CheckIns', 'Leads', 'Badges'
    ];

    // Clean each collection
    for (const collectionName of collections) {
      console.log(`\n🧹 Cleaning collection: ${collectionName}`);

      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);

        if (!snapshot.empty) {
          console.log(`   📋 Found ${snapshot.docs.length} documents in ${collectionName}`);

          // Delete all documents in this collection
          for (const docSnapshot of snapshot.docs) {
            console.log(`   🗑️ Deleting: ${collectionName}/${docSnapshot.id}`);
            await deleteDoc(docSnapshot.ref);
          }

          console.log(`   ✅ Deleted ${snapshot.docs.length} documents from ${collectionName}`);
        } else {
          console.log(`   ℹ️ Collection ${collectionName} is already empty`);
        }
      } catch (error) {
        console.log(`   ⚠️ Could not access ${collectionName} (might not exist):`, error instanceof Error ? error.message : String(error));
      }
    }

    // Specifically delete known old events
    console.log('\n🗑️ Deleting specific old events...');
    const oldEventIds = ['default', 'qtm-2025', 'qtm-25', 'current-event'];

    for (const eventId of oldEventIds) {
      try {
        const eventRef = doc(db, 'Events', eventId);
        await deleteDoc(eventRef);
        console.log(`   ✅ Deleted old event: ${eventId}`);
      } catch (error) {
        console.log(`   ℹ️ Event ${eventId} doesn't exist or already deleted`);
      }
    }

    // Also clean any event subcollections
    console.log('\n🧹 Cleaning event subcollections...');
    try {
      const eventsSnapshot = await getDocs(collection(db, 'Events'));
      for (const eventDoc of eventsSnapshot.docs) {
        const eventId = eventDoc.id;
        const subcollections = ['Exhibitors', 'Sponsors', 'Speakers', 'HostedBuyers', 'Sessions', 'Config', 'Pages'];

        for (const subcollection of subcollections) {
          try {
            const subcollectionRef = collection(db, 'Events', eventId, subcollection);
            const subSnapshot = await getDocs(subcollectionRef);

            if (!subSnapshot.empty) {
              console.log(`   🗑️ Deleting ${subSnapshot.docs.length} documents from Events/${eventId}/${subcollection}`);

              for (const docSnapshot of subSnapshot.docs) {
                await deleteDoc(docSnapshot.ref);
              }
            }
          } catch (error) {
            // Subcollection might not exist, that's fine
          }
        }
      }
    } catch (error) {
      console.log('   ℹ️ No events found to clean subcollections');
    }

    // Create fresh current event
    const currentEventId = 'current-event';
    console.log('\n🏗️ Creating fresh current event...');

    await setDoc(doc(db, 'Events', currentEventId), {
      name: 'Current Event',
      description: 'Welcome to the Current Active Event',
      active: true,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '18:00',
      location: 'Event Venue',
      createdAt: new Date().toISOString(),
      theme: {
        primary: '#0d6efd',
        secondary: '#fd7e14'
      }
    });

    console.log('✅ Fresh current event created');

    // Update global settings
    console.log('🔧 Updating global settings...');
    await setDoc(doc(db, 'AppSettings', 'global'), {
      eventId: currentEventId,
      appName: 'EventPlatform',
      logoUrl: '/logo.svg',
      logoSize: 32,
      showComingSoon: false,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log('✅ Global settings updated');

    // Final verification
    console.log('\n🔍 Final verification...');

    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        console.log(`   📋 ${collectionName}: ${snapshot.docs.length} documents`);
      } catch (error) {
        console.log(`   📋 ${collectionName}: 0 documents (collection may not exist)`);
      }
    }

    console.log('\n🎉 COMPLETE CLEANUP FINISHED!');
    console.log('✅ All old data has been removed');
    console.log('✅ Fresh current event created');
    console.log(`📍 Active event: ${currentEventId}`);
    console.log('\n🚀 You can now create new data from your dashboard!');

  } catch (error) {
    console.error('❌ Error during complete cleanup:', error);
  }
}

completeCleanup();
