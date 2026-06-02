import { NextResponse } from 'next/server';
import { triggerNews } from '@/lib/news/trigger';

/**
 * Test news generation in Vercel
 * GET /api/test-news-vercel
 */
export async function GET() {
  try {
    console.log('[Test] Starting news generation test...');
    
    // Test with simple data
    await triggerNews('match_completed', {
      season_id: 'TFCS-4',
      metadata: {
        home_team: 'Test Team A',
        away_team: 'Test Team B',
        home_score: 2,
        away_score: 1,
        tournament_name: 'Test Tournament',
        round: 'Test Round'
      }
    });
    
    console.log('[Test] ✅ News generation completed');
    
    return NextResponse.json({
      success: true,
      message: 'News generation test completed. Check logs for details.'
    });
  } catch (error: any) {
    console.error('[Test] ❌ News generation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
