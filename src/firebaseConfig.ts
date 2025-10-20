/*
  Firestore Security Rules (set these in Firebase Console > Firestore > Rules):

  service cloud.firestore {
    match /databases/{database}/documents {
      // AppSettings collection - public read for global settings
      match /AppSettings/{document} {
        allow read: if true;
        allow write: if request.auth != null && get(/databases/$(database)/documents/Users/$(request.auth.uid)).data.category == 'Organizer';
      }

      // Users collection - authenticated users can read/write their own data
      match /Users/{userId} {
        allow read: if request.auth != null && (
          request.auth.uid == userId ||
          get(/databases/$(database)/documents/Users/$(request.auth.uid)).data.category == 'Agent' ||
          get(/databases/$(database)/documents/Users/$(request.auth.uid)).data.category == 'Organizer'
        );
        allow update: if request.auth != null && (
          request.auth.uid == userId ||
          get(/databases/$(database)/documents/Users/$(request.auth.uid)).data.isAgent == true ||
          get(/databases/$(database)/documents/Users/$(request.auth.uid)).data.category == 'Organizer'
        );
        allow create: if request.auth != null;
      }

      // Events collection - public read, organizers can write
      match /Events/{eventId} {
        allow read: if true;
        allow write: if request.auth != null && get(/databases/$(database)/documents/Users/$(request.auth.uid)).data.category == 'Organizer';
      }

      // Event subcollections - public read for event data
      match /Events/{eventId}/{collection}/{document} {
        allow read: if true;
        allow write: if request.auth != null && get(/databases/$(database)/documents/Users/$(request.auth.uid)).data.category == 'Organizer';
      }

      // CheckIns collection - public read for analytics, authenticated write
      match /CheckIns/{checkInId} {
        allow read: if true;
        allow write: if request.auth != null;
      }

      // Leads collection - authenticated users only
      match /Leads/{leadId} {
        allow read, write: if request.auth != null;
      }

      // Badges collection - authenticated users can read/write badges they own
      match /Badges/{badgeId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
        allow delete: if request.auth != null;
      }

      // Allow public read for essential data, authenticated write for everything else
      match /{document=**} {
        allow read: if true;
        allow write: if request.auth != null;
      }
    }
  }
*/

import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCMjNjOG-rdz7WUJOgPdi9ODWkpHqowbkI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "smart-event-management-d71a4.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "smart-event-management-d71a4",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "smart-event-management-d71a4.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "411158147657",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:411158147657:web:8c302fdfc7be9e682e0598",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-VS4QJY53YE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure auth persistence to use localStorage
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error);
});

// Initialize auth persistence
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('🔥 Firebase Auth: User authenticated:', user.email);
    // Ensure user data is available in localStorage for middleware
    if (typeof window !== 'undefined') {
      localStorage.setItem('firebase_auth_user', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        timestamp: Date.now()
      }));
    }
  } else {
    console.log('🔥 Firebase Auth: User not authenticated');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('firebase_auth_user');
    }
  }
});
// Firestore with long polling to better handle restrictive networks/proxies
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
});
// Reduce Firestore console noise in dev when offline
setLogLevel('error');
export const storage = getStorage(app);

// Analytics - only in browser with full support
export const analytics = 
  typeof window !== 'undefined' && 
  'analytics' in firebaseConfig ? 
  getAnalytics(app) : 
  undefined;

// Messaging - only in browser with service worker support
export const messaging = 
  typeof window !== 'undefined' && 
  'serviceWorker' in navigator && 
  navigator.serviceWorker && 
  typeof navigator.serviceWorker.addEventListener === 'function' ? 
  getMessaging(app) : 
  undefined;
