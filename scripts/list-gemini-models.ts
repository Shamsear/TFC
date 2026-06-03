/**
 * List available Gemini models for your API key
 * Run: npx tsx scripts/list-gemini-models.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[];

async function listModels() {
  console.log('🔍 Checking available Gemini models...\n');

  for (let i = 0; i < API_KEYS.length; i++) {
    const apiKey = API_KEYS[i];
    console.log(`\n📋 API Key ${i + 1}/${API_KEYS.length}:`);
    console.log('='.repeat(60));

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Try to list models
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      
      if (!response.ok) {
        console.error(`❌ Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      if (!data.models || data.models.length === 0) {
        console.log('⚠️  No models found');
        continue;
      }

      console.log(`✅ Found ${data.models.length} models:\n`);
      
      // Filter for text generation models only
      const textModels = data.models.filter((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent')
      );

      console.log('📝 Text Generation Models:');
      textModels.forEach((model: any) => {
        const name = model.name.replace('models/', '');
        console.log(`  - ${name}`);
      });

      // Test the first available model
      if (textModels.length > 0) {
        const testModelName = textModels[0].name.replace('models/', '');
        console.log(`\n🧪 Testing model: ${testModelName}`);
        
        try {
          const model = genAI.getGenerativeModel({ model: testModelName });
          const result = await model.generateContent('Hello');
          const response = await result.response;
          const text = response.text();
          console.log(`✅ Model works! Response: "${text.substring(0, 50)}..."`);
        } catch (error: any) {
          console.error(`❌ Model test failed:`, error.message);
        }
      }

    } catch (error: any) {
      console.error(`❌ Failed to list models:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 Recommended: Use the working models in lib/gemini/config.ts');
}

listModels().catch(console.error);
