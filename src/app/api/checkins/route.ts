import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Expected body: { uid: string, type: 'in' | 'out', eventId?: string, scannedBy?: string }
    const { uid, type, eventId, scannedBy } = body || {};
    if (!uid || !['in', 'out'].includes(type)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await addDoc(collection(db, 'CheckIns'), {
      uid,
      type,
      eventId: eventId || null,
      scannedBy: scannedBy || null,
      at: serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
