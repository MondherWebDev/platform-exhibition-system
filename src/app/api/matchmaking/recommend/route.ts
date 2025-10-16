import { NextRequest, NextResponse } from 'next/server';
import { matchmakingService } from '../../../../utils/matchmakingService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType') as 'exhibitor' | 'attendee';
    const limit = parseInt(searchParams.get('limit') || '10');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    if (!userId || !userType) {
      return NextResponse.json(
        { error: 'User ID and user type are required' },
        { status: 400 }
      );
    }

    // Get cached recommendations using the matchmaking service
    const recommendations = await matchmakingService.getCachedRecommendations(
      userId,
      userType,
      limit,
      forceRefresh
    );

    return NextResponse.json({
      success: true,
      recommendations,
      count: recommendations.length,
      cached: !forceRefresh,
    });

  } catch (error) {
    console.error('Matchmaking recommendations error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, minScore, maxRecommendations } = body;

    // Generate new recommendations
    const result = await matchmakingService.generateRecommendations(
      eventId || 'default',
      minScore || 0.1,
      maxRecommendations || 100
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate recommendations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Generated ${result.count} new recommendations`,
    });

  } catch (error) {
    console.error('Matchmaking generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
