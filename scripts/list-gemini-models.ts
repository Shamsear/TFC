import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Script to list all available Gemini models
 * Run with: npx tsx scripts/list-gemini-models.ts
 */

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('🔍 Fetching available Gemini models...\n');

  try {
    // Try different model names to see which one works
    const modelsToTest = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-flash',
    ];

    console.log('Testing model availability:\n');

    for (const modelName of modelsToTest) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ ${modelName} - WORKS`);
        console.log(`   Response: ${text.substring(0, 50)}...`);
      } catch (error: any) {
        console.log(`❌ ${modelName} - FAILED`);
        console.log(`   Error: ${error.message?.substring(0, 100)}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error listing models:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

listModels();
