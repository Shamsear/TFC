import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini API Configuration
 * Supports multiple API keys for rate limit rotation
 */

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[];

let currentKeyIndex = 0;

/**
 * Get Gemini model instance with automatic key rotation
 */
export function getGeminiModel() {
  if (API_KEYS.length === 0) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const apiKey = API_KEYS[currentKeyIndex];
  const genAI = new GoogleGenerativeAI(apiKey);
  
  return genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    }
  });
}

/**
 * Rotate to next API key (for rate limit handling)
 */
export function rotateApiKey() {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`[Gemini] Rotated to API key ${currentKeyIndex + 1}/${API_KEYS.length}`);
}

/**
 * Test Gemini connection
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const model = getGeminiModel();
    const result = await model.generateContent('Hello');
    const response = await result.response;
    return !!response.text();
  } catch (error) {
    console.error('[Gemini] Connection test failed:', error);
    return false;
  }
}
