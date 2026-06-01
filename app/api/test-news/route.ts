import { NextResponse } from 'next/server';
import { testGeminiConnection } from '@/lib/gemini/config';
import { triggerNews } from '@/lib/news/trigger';

/**
 * GET /api/test-news
 * Test news generation system
 */
export async function GET() {
  try {
    // Test 1: Gemini connection
    console.log('[Test] Testing Gemini connection...');
    const geminiConnected = await testGeminiConnection();
    
    if (!geminiConnected) {
      return NextResponse.json({
        success: false,
        message: 'Gemini API connection failed',
        gemini_connected: false
      }, { status: 500 });
    }

    // Test 2: Trigger a test news item
    console.log('[Test] Triggering test news...');
    await triggerNews('team_squad_complete', {
      season_id: 'TEST',
      season_name: 'Test Season',
      metadata: {
        team_name: 'Test Team',
        player_count: 5,
        total_spent: 250,
        remaining_budget: 50
      }
    });

    return NextResponse.json({
      success: true,
      message: 'News generation test completed!',
      gemini_connected: true,
      news_triggered: true
    });
  } catch (error: any) {
    console.error('[Test] Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test failed',
      error: error.message
    }, { status: 500 });
  }
}
