import { NextRequest, NextResponse } from 'next/server';
import { getUserBadge, generateBadgePDF, badgeTemplates } from '../../../../../utils/badgeService';

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

    // Generate PDF using the correct function name with proper arguments
    const pdfDataUrl = await generateBadgePDF(
      badge,
      badgeTemplates[0], // Use the first (default) template
      { includeQR: true, includePhoto: false }
    );

    // Convert data URL to buffer
    const base64Data = pdfDataUrl.split(',')[1];
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="badge-${badgeId}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Badge PDF generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
