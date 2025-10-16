import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Expected body: { exhibitorUid: string, attendeeUid: string, notes?: string }
    const { exhibitorUid, attendeeUid, notes } = body || {};
    if (!exhibitorUid || !attendeeUid) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const docRef = await addDoc(collection(db, 'Leads'), {
      exhibitorUid,
      attendeeUid,
      notes: notes || '',
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
