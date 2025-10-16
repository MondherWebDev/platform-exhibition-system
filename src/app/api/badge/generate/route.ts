import { NextRequest, NextResponse } from 'next/server';
import { enhancedBadgeService } from '../../../../utils/enhancedBadgeService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, eventId, badgeData, createdBy, badgeType } = body;

    console.log('🔄 Badge generation request:', { userId, eventId, badgeType, createdBy });

    if (!userId) {
      console.error('❌ User ID is required');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let badge;

    if (badgeType === 'visitor_ebadge') {
      console.log('🎫 Generating visitor e-badge for user:', userId);
      try {
        // Generate visitor e-badge
        badge = await enhancedBadgeService.generateVisitorEBadge(
          userId,
          eventId || 'default',
          'visitor_ebadge',
          createdBy || 'system'
        );
        console.log('✅ Visitor e-badge generated successfully:', badge.id);
      } catch (error) {
        console.error('❌ Error generating visitor e-badge:', error);
        return NextResponse.json(
          { error: `Failed to create visitor e-badge: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    } else {
      console.log('🏷️ Generating regular badge for user:', userId);
      try {
        // Create regular badge using the enhanced badge service
        badge = await enhancedBadgeService.createBadge(
          userId,
          eventId || 'default',
          'default',
          createdBy || 'system'
        );
        console.log('✅ Regular badge generated successfully:', badge.id);
      } catch (error) {
        console.error('❌ Error generating regular badge:', error);
        return NextResponse.json(
          { error: `Failed to create badge: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    console.log('🎉 Badge generation completed successfully');

    return NextResponse.json({
      success: true,
      badgeId: badge.id,
      badgeUrl: `/api/badge/${badge.id}`,
      qrCodeData: `https://event-platform.com/verify/${badge.id}`,
      badgeData: badge,
      badgeType: badgeType || 'regular'
    });

  } catch (error) {
    console.error('💥 Badge generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
