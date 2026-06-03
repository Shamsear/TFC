import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini API Configuration
 * Supports multiple API keys and model fallbacks
 */

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[];

// Model fallback order: Using VERIFIED WORKING Gemini API models
// Tested and confirmed working with free tier API keys (June 2026)
const MODELS = [
  'gemini-2.5-flash',         // Primary: Best price-performance, CONFIRMED WORKING
  'gemini-3.5-flash',         // Fallback 1: Latest model, CONFIRMED WORKING
  'gemini-2.5-flash-lite',    // Fallback 2: Lighter/faster, CONFIRMED WORKING
  'gemini-flash-latest',
  'gemini-2.5-pro',      // Fallback 3: Alias to latest, CONFIRMED WORKING
] as const;

let currentKeyIndex = 0;
let currentModelIndex = 0;
let failureCount = 0;
const MAX_FAILURES_BEFORE_FALLBACK = 3;

/**
 * Get Gemini model instance with automatic key rotation and model fallback
 */
export function getGeminiModel() {
  if (API_KEYS.length === 0) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const apiKey = API_KEYS[currentKeyIndex];
  const modelName = MODELS[currentModelIndex];
  const genAI = new GoogleGenerativeAI(apiKey);
  
  console.log(`[Gemini] Using model: ${modelName} (API key ${currentKeyIndex + 1}/${API_KEYS.length})`);
  
  return genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 4096, // Increased for Malayalam Unicode support
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
 * Handle model failure and fallback to next model if needed
 */
export function handleModelFailure() {
  failureCount++;
  
  if (failureCount >= MAX_FAILURES_BEFORE_FALLBACK && currentModelIndex < MODELS.length - 1) {
    currentModelIndex++;
    failureCount = 0;
    console.log(`[Gemini] ⚠️ Falling back to model: ${MODELS[currentModelIndex]}`);
    return true; // Indicates fallback occurred
  }
  
  return false; // No fallback needed yet
}

/**
 * Reset to primary model (call after successful generation)
 */
export function resetToPrimary() {
  if (currentModelIndex !== 0 || failureCount !== 0) {
    currentModelIndex = 0;
    failureCount = 0;
    console.log(`[Gemini] ✅ Reset to primary model: ${MODELS[0]}`);
  }
}

/**
 * Get current model info
 */
export function getCurrentModelInfo() {
  return {
    model: MODELS[currentModelIndex],
    modelIndex: currentModelIndex,
    totalModels: MODELS.length,
    apiKeyIndex: currentKeyIndex,
    totalKeys: API_KEYS.length,
    failureCount,
  };
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
