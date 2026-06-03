/**
 * Test which Gemini models are available with your API key
 * Run: npx tsx scripts/test-gemini-models.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

// Models to test
const MODELS_TO_TEST = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash-8b-latest',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash',
  'gemini-exp-1206',
  'gemini-exp-1114',
  'gemini-2.5-flash',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-pro',
];

async function testModel(modelName: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(API_KEY!);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent('Hello');
    const response = await result.response;
    const text = response.text();
    
    return !!text;
  } catch (error: any) {
    if (error.message?.includes('404')) {
      return false; // Model not found
    }
    throw error; // Other error
  }
}

async function testAllModels() {
  console.log('🧪 Testing Gemini models...\n');
  
  if (!API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    return;
  }

  console.log('✅ Available models:');
  console.log('━'.repeat(50));
  
  const available: string[] = [];
  const unavailable: string[] = [];
  
  for (const modelName of MODELS_TO_TEST) {
    try {
      process.stdout.write(`Testing ${modelName}... `);
      const isAvailable = await testModel(modelName);
      
      if (isAvailable) {
        console.log('✅');
        available.push(modelName);
      } else {
        console.log('❌ (404 Not Found)');
        unavailable.push(modelName);
      }
    } catch (error: any) {
      console.log(`❌ (${error.message})`);
      unavailable.push(modelName);
    }
  }
  
  console.log('\n' + '━'.repeat(50));
  console.log(`\n✅ Available (${available.length}):`);
  available.forEach(m => console.log(`   - ${m}`));
  
  console.log(`\n❌ Unavailable (${unavailable.length}):`);
  unavailable.forEach(m => console.log(`   - ${m}`));
  
  console.log('\n💡 Update lib/gemini/config.ts with available models');
}

testAllModels()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
