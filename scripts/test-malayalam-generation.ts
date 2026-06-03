/**
 * Test script for Malayalam content generation
 * Run: npx tsx scripts/test-malayalam-generation.ts
 */

import { generateBilingualNews } from '../lib/news/auto-generate';
import { NewsGenerationInput } from '../lib/news/types';

async function testMalayalamGeneration() {
  console.log('🧪 Testing Malayalam Content Generation');
  console.log('=' .repeat(60));

  const testInput: NewsGenerationInput = {
    event_type: 'match_result',
    category: 'match_report',
    metadata: {
      home_team: 'Test FC',
      away_team: 'Demo United',
      home_score: 3,
      away_score: 1,
      home_manager: 'കൃഷ്ണ കുമാർ', // Malayalam name
      away_manager: 'രാജേഷ് നായർ', // Malayalam name
      scorers: ['കളിക്കാരൻ 1', 'കളിക്കാരൻ 2'],
      assists: ['സഹായി 1'],
      yellow_cards: ['മഞ്ഞ 1'],
      red_cards: [],
    },
    context: 'Test match to verify Malayalam Unicode handling',
  };

  try {
    console.log('\n📝 Generating bilingual content...\n');
    
    const result = await generateBilingualNews(testInput);

    console.log('\n✅ ENGLISH RESULT:');
    console.log('-'.repeat(60));
    console.log(`Title: ${result.en.title}`);
    console.log(`Length: ${result.en.content.length} characters`);
    console.log(`Summary: ${result.en.summary}`);
    console.log(`Content:\n${result.en.content}`);

    console.log('\n✅ MALAYALAM RESULT:');
    console.log('-'.repeat(60));
    console.log(`Title: ${result.ml.title}`);
    console.log(`Length: ${result.ml.content.length} characters`);
    console.log(`Summary: ${result.ml.summary}`);
    console.log(`Content:\n${result.ml.content}`);

    console.log('\n' + '='.repeat(60));
    console.log('📊 ANALYSIS:');
    console.log(`English content: ${result.en.content.length} chars`);
    console.log(`Malayalam content: ${result.ml.content.length} chars`);
    
    const enWords = result.en.content.split(/\s+/).length;
    const mlWords = result.ml.content.split(/\s+/).length;
    console.log(`English words: ~${enWords}`);
    console.log(`Malayalam words: ~${mlWords}`);

    // Check for truncation indicators
    const mlEndsNaturally = /[.?!।॥ൿ]$/.test(result.ml.content.trim());
    const mlHasMinLength = result.ml.content.length > 400;
    
    console.log('\n🔍 VALIDATION:');
    console.log(`✓ Malayalam ends with punctuation: ${mlEndsNaturally ? '✅' : '❌'}`);
    console.log(`✓ Malayalam has minimum length: ${mlHasMinLength ? '✅' : '❌'}`);
    console.log(`✓ Malayalam has title: ${result.ml.title.length > 10 ? '✅' : '❌'}`);
    console.log(`✓ Malayalam has summary: ${result.ml.summary.length > 10 ? '✅' : '❌'}`);

    if (mlEndsNaturally && mlHasMinLength) {
      console.log('\n🎉 SUCCESS: Malayalam content appears complete!');
    } else {
      console.log('\n⚠️  WARNING: Malayalam content may be truncated');
      if (!mlEndsNaturally) {
        console.log('  - Content does not end with proper punctuation');
      }
      if (!mlHasMinLength) {
        console.log('  - Content length is below expected minimum (400+ chars)');
      }
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

testMalayalamGeneration();
