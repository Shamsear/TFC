import { NextResponse } from 'next/server';
import { testGeminiConnection } from '@/lib/gemini/config';

/**
 * GET /api/test-gemini
 * Test Gemini API connection
 */
export async function GET() {
  try {
    const isConnected = await testGeminiConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'Gemini API is working!',
        model: 'gemini-2.0-flash-exp'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Gemini API connection failed'
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Gemini API test failed',
      error: error.message
    }, { status: 500 });
  }
}
