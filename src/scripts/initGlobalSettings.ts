import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

async function initializeGlobalSettings() {
  try {
    // Set up global settings without hardcoded event ID
    await setDoc(doc(db, 'AppSettings', 'global'), {
      appName: 'EventPlatform',
      logoUrl: '/logo.svg',
      logoSize: 32,
      showComingSoon: false,
      createdAt: new Date().toISOString()
    }, { merge: true });

    console.log('✅ Global settings initialized successfully');

    // Create a default event
    await setDoc(doc(db, 'Events', 'default'), {
      name: 'Default Event',
      description: 'Welcome to the Event Platform',
      active: true,
      startDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    }, { merge: true });

    console.log('✅ Default event created successfully');

  } catch (error) {
    console.error('❌ Error initializing global settings:', error);
  }
}

initializeGlobalSettings();
