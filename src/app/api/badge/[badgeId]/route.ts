import { NextRequest, NextResponse } from 'next/server';
import { getUserBadge, deleteBadge } from '../../../../utils/badgeService';

export async function GET(
  req: NextRequest,
  { params }: { params: { badgeId: string } }
) {
  try {
    const badgeId = params.badgeId;

    if (!badgeId) {
      return NextResponse.json({ error: 'Badge ID is required' }, { status: 400 });
    }

    // Get badge data using the correct function name
    const badge = await getUserBadge(badgeId);

    if (!badge) {
      return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      badge,
    });

  } catch (error) {
    console.error('Badge retrieval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { badgeId: string } }
) {
  try {
    const badgeId = params.badgeId;
    const body = await req.json();
    const { deletedBy } = body;

    if (!badgeId) {
      return NextResponse.json({ error: 'Badge ID is required' }, { status: 400 });
    }

    if (!deletedBy) {
      return NextResponse.json({ error: 'Deleted by is required' }, { status: 400 });
    }

    // Delete badge using the correct function name
    const success = await deleteBadge(badgeId);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete badge' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Badge deleted successfully',
    });

  } catch (error) {
    console.error('Badge deletion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
