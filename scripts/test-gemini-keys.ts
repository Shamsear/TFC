import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const keys = [
  { name: 'GEMINI_API_KEY', key: process.env.GEMINI_API_KEY },
  { name: 'GEMINI_API_KEY_2', key: process.env.GEMINI_API_KEY_2 },
  { name: 'GEMINI_API_KEY_3', key: process.env.GEMINI_API_KEY_3 },
];

async function testKey(keyName: string, apiKey: string | undefined) {
  if (!apiKey) {
    console.log(`❌ ${keyName}: Not configured`);
    return false;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    console.log(`Testing ${keyName}...`);
    const result = await model.generateContent('Say "Hello World" in exactly 2 words.');
    const response = result.response;
    const text = response.text();
    
    console.log(`✅ ${keyName}: WORKING`);
    console.log(`   Response: ${text.substring(0, 50)}`);
    return true;
  } catch (error: any) {
    console.log(`❌ ${keyName}: FAILED`);
    console.log(`   Error: ${error.message?.substring(0, 100)}`);
    return false;
  }
}

async function testAllKeys() {
  console.log('🔑 Testing all Gemini API keys...\n');
  
  const results = await Promise.all(
    keys.map(({ name, key }) => testKey(name, key))
  );
  
  const workingCount = results.filter(Boolean).length;
  
  console.log(`\n📊 Summary: ${workingCount}/${keys.length} keys working`);
  
  if (workingCount === 0) {
    console.log('\n⚠️ No working keys found! You need to:');
    console.log('1. Get new API keys from https://aistudio.google.com/app/apikey');
    console.log('2. Update .env file with new keys');
    console.log('3. Run this test again');
  }
}

testAllKeys();
