import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../firebaseConfig';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
