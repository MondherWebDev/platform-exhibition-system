import { collection, getDocs, deleteDoc, doc, writeBatch, setDoc, addDoc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const deleteAllData = async () => {
  console.log('🗑️ Starting data deletion process...');

  const collections = [
    'Users',
    'Events',
    'CheckIns',
    'Leads',
    'Badges',
    'Notifications',
    'UserCredentials'
  ];

  const eventCollections = [
    'Exhibitors',
    'Sponsors',
    'Speakers',
    'HostedBuyers',
    'Sessions',
    'Config',
    'Pages'
  ];

  try {
    // Delete from main collections
    for (const collectionName of collections) {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);
      let count = 0;

      querySnapshot.forEach((document) => {
        batch.delete(document.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
        console.log(`✅ Deleted ${count} documents from ${collectionName}`);
      }
    }

    // Delete from event subcollections (if any events exist)
    const eventsSnapshot = await getDocs(collection(db, 'Events'));
    for (const eventDoc of eventsSnapshot.docs) {
      const eventId = eventDoc.id;

      for (const subCollection of eventCollections) {
        const subCollectionRef = collection(db, 'Events', eventId, subCollection);
        const subSnapshot = await getDocs(subCollectionRef);
        const batch = writeBatch(db);
        let count = 0;

        subSnapshot.forEach((document) => {
          batch.delete(document.ref);
          count++;
        });

        if (count > 0) {
          await batch.commit();
          console.log(`✅ Deleted ${count} documents from Events/${eventId}/${subCollection}`);
        }
      }
    }

    console.log('🎉 Data deletion completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error deleting data:', error);
    throw error;
  }
};

export const deleteSpecificEvent = async (eventId: string) => {
  console.log(`🗑️ Deleting specific event: ${eventId}`);

  const eventCollections = [
    'Exhibitors',
    'Sponsors',
    'Speakers',
    'HostedBuyers',
    'Sessions',
    'Config',
    'Pages'
  ];

  try {
    // First, check if this event is referenced in global settings
    const globalSettingsRef = doc(db, 'AppSettings', 'global');
    const globalSettingsSnapshot = await getDoc(globalSettingsRef);

    if (globalSettingsSnapshot.exists()) {
      const globalData = globalSettingsSnapshot.data();
      if (globalData.eventId === eventId) {
        console.log(`🔧 Clearing global settings reference to deleted event: ${eventId}`);

        // Find a replacement active event
        const eventsSnapshot = await getDocs(collection(db, 'Events'));
        const remainingEvents = eventsSnapshot.docs.filter(doc => doc.id !== eventId);

        if (remainingEvents.length > 0) {
          // Find an active event or use the first available event
          const activeEvent = remainingEvents.find(doc => doc.data().active === true);
          const replacementEventId = activeEvent ? activeEvent.id : remainingEvents[0].id;

          await setDoc(globalSettingsRef, { eventId: replacementEventId }, { merge: true });
          console.log(`✅ Updated global settings to use event: ${replacementEventId}`);
        } else {
          // No other events exist, remove the eventId from global settings
          await updateDoc(globalSettingsRef, {
            eventId: deleteField()
          });
          console.log(`✅ Removed eventId from global settings (no other events exist)`);
        }
      }
    }

    // Delete the main event document
    const eventRef = doc(db, 'Events', eventId);
    await deleteDoc(eventRef);
    console.log(`✅ Deleted event document: ${eventId}`);

    // Delete from event subcollections
    for (const subCollection of eventCollections) {
      const subCollectionRef = collection(db, 'Events', eventId, subCollection);
      const subSnapshot = await getDocs(subCollectionRef);
      const batch = writeBatch(db);
      let count = 0;

      subSnapshot.forEach((document) => {
        batch.delete(document.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
        console.log(`✅ Deleted ${count} documents from Events/${eventId}/${subCollection}`);
      }
    }

    console.log(`🎉 Event "${eventId}" deletion completed successfully!`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting event ${eventId}:`, error);
    throw error;
  }
};

export const createSampleData = async () => {
  console.log('🌱 Creating sample data...');

  try {
    // Create a default event
    const eventRef = doc(db, 'Events', 'default');
    await setDoc(eventRef, {
      id: 'default',
      title: 'Sample Event 2025',
      description: 'A showcase event with sample exhibitors, sponsors, speakers, and hosted buyers',
      startAt: new Date('2025-01-15T09:00:00'),
      endAt: new Date('2025-01-15T18:00:00'),
      venue: 'Grand Convention Center',
      status: 'published',
      createdBy: 'system'
    });

    console.log('✅ Created default event');

    // Create sample exhibitors
    const exhibitors = [
      {
        name: 'TechFlow Solutions',
        description: 'Leading provider of cloud infrastructure and AI solutions for enterprises',
        boothId: 'A1',
        tags: ['technology', 'cloud', 'AI', 'enterprise'],
        logoUrl: 'https://via.placeholder.com/150x100/4F46E5/FFFFFF?text=TF',
        contactEmail: 'contact@techflow.com',
        contactPhone: '+1-555-0101',
        website: 'https://techflow.com',
        address: '123 Tech Street, Silicon Valley, CA',
        companySize: '500-1000',
        industry: 'Technology'
      },
      {
        name: 'Green Energy Corp',
        description: 'Sustainable energy solutions for a better tomorrow',
        boothId: 'B2',
        tags: ['energy', 'sustainability', 'green', 'renewable'],
        logoUrl: 'https://via.placeholder.com/150x100/10B981/FFFFFF?text=GE',
        contactEmail: 'info@greenenergy.com',
        contactPhone: '+1-555-0102',
        website: 'https://greenenergy.com',
        address: '456 Eco Avenue, Green City, CA',
        companySize: '100-500',
        industry: 'Energy'
      },
      {
        name: 'MedTech Innovations',
        description: 'Revolutionary medical technology and healthcare solutions',
        boothId: 'C3',
        tags: ['healthcare', 'medical', 'innovation', 'technology'],
        logoUrl: 'https://via.placeholder.com/150x100/EF4444/FFFFFF?text=MT',
        contactEmail: 'hello@medtech.com',
        contactPhone: '+1-555-0103',
        website: 'https://medtech.com',
        address: '789 Health Blvd, Medical District, CA',
        companySize: '50-100',
        industry: 'Healthcare'
      }
    ];

    for (const exhibitor of exhibitors) {
      await addDoc(collection(db, 'Events', 'default', 'Exhibitors'), {
        ...exhibitor,
        createdAt: new Date(),
        createdBy: 'system'
      });
    }

    console.log(`✅ Created ${exhibitors.length} sample exhibitors`);

    // Create sample sponsors
    const sponsors = [
      {
        name: 'Premium Sponsor Corp',
        tier: 'gold',
        logoUrl: 'https://via.placeholder.com/150x100/F59E0B/FFFFFF?text=PS',
        description: 'Gold sponsor providing premium support',
        contactEmail: 'sponsor@premium.com',
        contactPhone: '+1-555-0201',
        website: 'https://premiumsponsor.com',
        address: 'Premium Plaza, Business District'
      },
      {
        name: 'Silver Partner Inc',
        tier: 'silver',
        logoUrl: 'https://via.placeholder.com/150x100/6B7280/FFFFFF?text=SP',
        description: 'Silver sponsor supporting the event',
        contactEmail: 'contact@silverpartner.com',
        contactPhone: '+1-555-0202',
        website: 'https://silverpartner.com',
        address: 'Silver Street, Commerce City'
      }
    ];

    for (const sponsor of sponsors) {
      await addDoc(collection(db, 'Events', 'default', 'Sponsors'), {
        ...sponsor,
        createdAt: new Date(),
        createdBy: 'system'
      });
    }

    console.log(`✅ Created ${sponsors.length} sample sponsors`);

    // Create sample speakers
    const speakers = [
      {
        name: 'Dr. Sarah Johnson',
        title: 'Chief Technology Officer',
        company: 'TechFlow Solutions',
        photoUrl: 'https://via.placeholder.com/150x150/E11D48/FFFFFF?text=SJ',
        tags: ['AI', 'Machine Learning', 'Innovation', 'Leadership'],
        bio: 'Leading expert in artificial intelligence with over 15 years of experience in tech innovation.',
        email: 'sarah.johnson@techflow.com',
        phone: '+1-555-0301',
        linkedin: 'https://linkedin.com/in/sarahjohnson',
        twitter: 'https://twitter.com/sarahjtech'
      },
      {
        name: 'Michael Chen',
        title: 'Sustainability Director',
        company: 'Green Energy Corp',
        photoUrl: 'https://via.placeholder.com/150x150/059669/FFFFFF?text=MC',
        tags: ['Sustainability', 'Renewable Energy', 'Climate', 'Policy'],
        bio: 'Pioneer in renewable energy solutions and environmental policy advocacy.',
        email: 'michael.chen@greenenergy.com',
        phone: '+1-555-0302',
        linkedin: 'https://linkedin.com/in/michaelchen',
        twitter: 'https://twitter.com/michaelcgreen'
      }
    ];

    for (const speaker of speakers) {
      await addDoc(collection(db, 'Events', 'default', 'Speakers'), {
        ...speaker,
        createdAt: new Date(),
        createdBy: 'system'
      });
    }

    console.log(`✅ Created ${speakers.length} sample speakers`);

    // Create sample hosted buyers
    const hostedBuyers = [
      {
        name: 'Jennifer Martinez',
        company: 'Global Enterprises Ltd',
        notes: 'Interested in cloud solutions and AI integration for large-scale operations',
        photoUrl: 'https://via.placeholder.com/150x150/7C3AED/FFFFFF?text=JM',
        email: 'j.martinez@globalent.com',
        phone: '+1-555-0401',
        industry: 'Manufacturing',
        companySize: '1000+',
        interests: 'Cloud Computing, AI, Automation',
        budget: '$500K-$1M'
      },
      {
        name: 'Robert Kim',
        company: 'Healthcare Systems Inc',
        notes: 'Looking for medical technology solutions and healthcare innovation',
        photoUrl: 'https://via.placeholder.com/150x150/DC2626/FFFFFF?text=RK',
        email: 'r.kim@healthcaresys.com',
        phone: '+1-555-0402',
        industry: 'Healthcare',
        companySize: '500-1000',
        interests: 'Medical Technology, Healthcare Innovation, Digital Health',
        budget: '$250K-$500K'
      }
    ];

    for (const buyer of hostedBuyers) {
      await addDoc(collection(db, 'Events', 'default', 'HostedBuyers'), {
        ...buyer,
        createdAt: new Date(),
        createdBy: 'system'
      });
    }

    console.log(`✅ Created ${hostedBuyers.length} sample hosted buyers`);

    // Create sample sessions
    const sessions = [
      {
        title: 'Future of AI in Business',
        description: 'Exploring how artificial intelligence is transforming business operations',
        day: '2025-01-15',
        start: '10:00',
        end: '11:00',
        room: 'Main Hall',
        speakerIds: []
      },
      {
        title: 'Sustainable Energy Solutions',
        description: 'Latest innovations in renewable energy and sustainability practices',
        day: '2025-01-15',
        start: '14:00',
        end: '15:00',
        room: 'Conference Room A',
        speakerIds: []
      }
    ];

    for (const session of sessions) {
      await addDoc(collection(db, 'Events', 'default', 'Sessions'), {
        ...session,
        createdAt: new Date()
      });
    }

    console.log(`✅ Created ${sessions.length} sample sessions`);

    console.log('🎉 Sample data creation completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
};
