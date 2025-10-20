import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../firebaseConfig';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { SentryService } from '../../../utils/sentryConfig';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId') || 'default';
    const category = searchParams.get('category');
    const limitCount = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    const constraints: any[] = [];

    // Add event filter if specified
    if (eventId && eventId !== 'all') {
      constraints.push(where('eventId', '==', eventId));
    }

    // Add category filter if specified
    if (category && category !== 'All') {
      constraints.push(where('category', '==', category));
    }

    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(limitCount));

    const q = query(collection(db, 'Users'), ...constraints);
    const querySnapshot = await getDocs(q);

    let users: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        ...data,
        // Don't expose sensitive information
        email: data.email,
        fullName: data.fullName,
        company: data.company,
        category: data.category,
        position: data.position,
        industry: data.industry,
        badgeId: data.badgeId,
        checkInStatus: data.checkInStatus,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      });
    });

    // Client-side search filter if specified
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user =>
        user.fullName?.toLowerCase().includes(searchLower) ||
        user.company?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });

  } catch (error) {
    console.error('Users retrieval error:', error);
    SentryService.reportUserError(
      error as Error,
      'Failed to retrieve users',
      undefined,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user data first to find which event collections need to be cleaned up
    const userDoc = await getDoc(doc(db, 'Users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const category = userData.category;

    // Start a batch write for atomic operations
    const batch = writeBatch(db);

    // Delete from main Users collection
    batch.delete(doc(db, 'Users', userId));

    // Delete from event-specific collections based on category
    if (category === 'Exhibitor') {
      // Delete from all event Exhibitors collections
      const eventsSnapshot = await getDocs(collection(db, 'Events'));
      for (const eventDoc of eventsSnapshot.docs) {
        const eventId = eventDoc.id;
        const exhibitorRef = doc(db, 'Events', eventId, 'Exhibitors', userId);
        batch.delete(exhibitorRef);
      }
    } else if (category === 'Hosted Buyer') {
      // Delete from all event HostedBuyers collections
      const eventsSnapshot = await getDocs(collection(db, 'Events'));
      for (const eventDoc of eventsSnapshot.docs) {
        const eventId = eventDoc.id;
        const buyerRef = doc(db, 'Events', eventId, 'HostedBuyers', userId);
        batch.delete(buyerRef);
      }
    } else if (category === 'Sponsor') {
      // Delete from all event Sponsors collections
      const eventsSnapshot = await getDocs(collection(db, 'Events'));
      for (const eventDoc of eventsSnapshot.docs) {
        const eventId = eventDoc.id;
        const sponsorRef = doc(db, 'Events', eventId, 'Sponsors', userId);
        batch.delete(sponsorRef);
      }
    } else if (category === 'Speaker') {
      // Delete from all event Speakers collections
      const eventsSnapshot = await getDocs(collection(db, 'Events'));
      for (const eventDoc of eventsSnapshot.docs) {
        const eventId = eventDoc.id;
        const speakerRef = doc(db, 'Events', eventId, 'Speakers', userId);
        batch.delete(speakerRef);
      }
    }

    // Delete leads associated with this user (if any)
    const leadsQuery = query(collection(db, 'Leads'), where('exhibitorId', '==', userId));
    const leadsSnapshot = await getDocs(leadsQuery);
    leadsSnapshot.forEach((leadDoc) => {
      batch.delete(doc(db, 'Leads', leadDoc.id));
    });

    // Delete check-ins associated with this user (if any)
    const checkinsQuery = query(collection(db, 'Checkins'), where('userId', '==', userId));
    const checkinsSnapshot = await getDocs(checkinsQuery);
    checkinsSnapshot.forEach((checkinDoc) => {
      batch.delete(doc(db, 'Checkins', checkinDoc.id));
    });

    // Commit all deletions atomically
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: 'User and all associated data deleted successfully',
      deletedFrom: {
        mainCollection: true,
        eventCollections: category,
        leads: leadsSnapshot.size,
        checkins: checkinsSnapshot.size
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({
      error: 'Failed to delete user and associated data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
