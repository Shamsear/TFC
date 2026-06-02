/**
 * List all available Gemini models
 * Run: npx tsx scripts/list-gemini-models.ts
 */

import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    console.error('💡 Make sure you have a .env file with GEMINI_API_KEY=your_key_here');
    process.exit(1);
  }

  console.log('🔍 Fetching available Gemini models...\n');

  try {
    // Use direct API call since SDK doesn't expose listModels
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const models = data.models || [];
    
    console.log(`✅ Found ${models.length} models:\n`);
    
    // Filter and display models that support generateContent
    const contentModels = models.filter((model: any) => 
      model.supportedGenerationMethods?.includes('generateContent')
    );
    
    console.log('📝 Models supporting generateContent:');
    console.log('=' .repeat(80));
    
    contentModels.forEach((model: any, index: number) => {
      console.log(`\n${index + 1}. ${model.name}`);
      console.log(`   Display Name: ${model.displayName}`);
      console.log(`   Description: ${model.description || 'N/A'}`);
      console.log(`   Input Token Limit: ${model.inputTokenLimit?.toLocaleString() || 'N/A'}`);
      console.log(`   Output Token Limit: ${model.outputTokenLimit?.toLocaleString() || 'N/A'}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n💡 To use a model, update lib/gemini/config.ts with the model name`);
    
    if (contentModels.length > 0) {
      const exampleModel = contentModels[0]?.name?.replace('models/', '') || 'gemini-1.5-flash';
      console.log(`   Example: model: '${exampleModel}'`);
    }
    
    // Show recommended models for news generation
    console.log('\n🎯 Recommended models for news generation:');
    const recommended = contentModels.filter((m: any) => 
      m.name?.includes('flash') || m.name?.includes('pro')
    );
    
    if (recommended.length > 0) {
      recommended.forEach((model: any) => {
        const modelName = model.name?.replace('models/', '') || '';
        console.log(`   - ${modelName} (${model.displayName})`);
      });
    } else {
      console.log('   No Flash or Pro models found');
    }
    
    // Show ALL model names for easy copy-paste
    console.log('\n📋 All available model names:');
    contentModels.forEach((model: any) => {
      const modelName = model.name?.replace('models/', '') || '';
      console.log(`   ${modelName}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error listing models:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

listModels()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
