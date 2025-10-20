import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../firebaseConfig';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { SentryService } from '../../../utils/sentryConfig';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const limitCount = parseInt(searchParams.get('limit') || '10');

    if (eventId) {
      // Get specific event
      const eventDoc = await getDoc(doc(db, 'Events', eventId));
      if (!eventDoc.exists()) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      const eventData = eventDoc.data();
      return NextResponse.json({
        success: true,
        event: {
          id: eventDoc.id,
          ...eventData,
          createdAt: eventData.createdAt?.toDate ? eventData.createdAt.toDate() : new Date(),
          updatedAt: eventData.updatedAt?.toDate ? eventData.updatedAt.toDate() : new Date(),
        },
      });
    } else {
      // Get all events
      const constraints = [
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      ];

      const q = query(collection(db, 'Events'), ...constraints);
      const querySnapshot = await getDocs(q);

      const events: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        });
      });

      return NextResponse.json({
        success: true,
        events,
        count: events.length,
      });
    }

  } catch (error) {
    console.error('Events retrieval error:', error);
    SentryService.reportUserError(
      error as Error,
      'Failed to retrieve events',
      undefined,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      date,
      venue,
      organizerId,
      maxAttendees,
      registrationOpen,
      registrationClose,
      ...eventData
    } = body;

    if (!name || !date || !venue || !organizerId) {
      return NextResponse.json(
        { error: 'Name, date, venue, and organizer ID are required' },
        { status: 400 }
      );
    }

    // Create event document
    const eventRef = await addDoc(collection(db, 'Events'), {
      name,
      description,
      date: new Date(date),
      venue,
      organizerId,
      maxAttendees: maxAttendees || 2000,
      registrationOpen: registrationOpen ? new Date(registrationOpen) : new Date(),
      registrationClose: registrationClose ? new Date(registrationClose) : new Date(date),
      status: 'active',
      createdBy: organizerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...eventData,
    });

    return NextResponse.json({
      success: true,
      eventId: eventRef.id,
      message: 'Event created successfully',
    });

  } catch (error) {
    console.error('Event creation error:', error);
    SentryService.reportUserError(
      error as Error,
      'Failed to create event',
      undefined,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create event' },
      { status: 500 }
    );
  }
}
