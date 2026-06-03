/**
 * Quick Gemini API test
 */

import { config } from 'dotenv';
config();

import { GoogleGenerativeAI } from '@google/generative-ai';

const MODELS_TO_TEST = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.5-flash',
];

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found');
    process.exit(1);
  }

  console.log(`✅ API Key found: ${apiKey.substring(0, 20)}...`);
  console.log('');

  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of MODELS_TO_TEST) {
    try {
      console.log(`Testing: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello');
      const response = await result.response;
      const text = response.text();
      console.log(`✅ ${modelName} WORKS!`);
      console.log(`   Response: "${text.substring(0, 50)}"\n`);
    } catch (error: any) {
      const fullError = error.message || String(error);
      console.log(`❌ ${modelName} FAILED:`);
      console.log(`   ${fullError}\n`);
    }
  }
}

test();
