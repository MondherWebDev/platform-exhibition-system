import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

async function cleanupAndCreateCurrentEvent() {
  try {
    console.log('🔍 Checking existing events...');

    // Get all events
    const eventsSnapshot = await getDocs(collection(db, 'Events'));
    const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log('📋 Found events:', events.map(e => e.id));

    // Create new current event
    const currentEventId = 'current-event';
    console.log('🏗️ Creating/updating current event...');

    await setDoc(doc(db, 'Events', currentEventId), {
      name: 'Current Event',
      description: 'Welcome to the Current Active Event',
      active: true,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      startTime: '09:00',
      endTime: '18:00',
      location: 'Event Venue',
      createdAt: new Date().toISOString(),
      theme: {
        primary: '#0d6efd',
        secondary: '#fd7e14'
      }
    }, { merge: true });

    console.log('✅ Current event created/updated');

    // Update global settings to point to the current event
    console.log('🔧 Updating global settings...');
    await setDoc(doc(db, 'AppSettings', 'global'), {
      eventId: currentEventId,
      appName: 'EventPlatform',
      logoUrl: '/logo.svg',
      logoSize: 32,
      showComingSoon: false,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log('✅ Global settings updated to point to current event');

    console.log('✅ Setup completed successfully');
    console.log('🎉 Current event setup complete!');
    console.log(`📍 Active event: ${currentEventId}`);

  } catch (error) {
    console.error('❌ Error during setup:', error);
  }
}

cleanupAndCreateCurrentEvent();
