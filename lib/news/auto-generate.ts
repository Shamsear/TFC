import { getGeminiModel, rotateApiKey } from '../gemini/config';
import { generatePrompt } from './prompts-bilingual';
import { determineTone } from './determine-tone';
import { NewsGenerationInput, BilingualNewsResult, NewsContent, NewsTone } from './types';

const REPORTERS = {
  en: 'Alex Thompson',
  ml: 'Rajesh Nair'
};

/**
 * Parse AI response with multiple fallback strategies
 */
function parseAIResponse(text: string): { title: string; content: string; summary: string } | null {
  try {
    // Strategy 1: Direct JSON parse
    const parsed = JSON.parse(text);
    if (parsed.title && parsed.content && parsed.summary) {
      return parsed;
    }
  } catch (e) {
    // Continue to fallback strategies
  }

  try {
    // Strategy 2: Extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.title && parsed.content && parsed.summary) {
        return parsed;
      }
    }
  } catch (e) {
    // Continue to fallback strategies
  }

  try {
    // Strategy 3: Extract JSON from any code blocks
    const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      const parsed = JSON.parse(codeMatch[1]);
      if (parsed.title && parsed.content && parsed.summary) {
        return parsed;
      }
    }
  } catch (e) {
    // All strategies failed
  }

  return null;
}

/**
 * Generate news content in a single language with retry logic
 */
async function generateSingleLanguage(
  input: NewsGenerationInput,
  language: 'en' | 'ml',
  maxRetries = 3
): Promise<NewsContent> {
  const tone = input.tone || determineTone(input);
  const prompt = generatePrompt({ ...input, tone }, language);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[News AI] Generating ${language.toUpperCase()} content (attempt ${attempt}/${maxRetries})`);
      
      const model = getGeminiModel();
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log(`[News AI] Raw ${language.toUpperCase()} response:`, text.substring(0, 200));

      const parsed = parseAIResponse(text);
      
      if (parsed) {
        return {
          title: parsed.title,
          content: parsed.content,
          summary: parsed.summary,
          tone,
          reporter: REPORTERS[language]
        };
      }

      console.warn(`[News AI] Failed to parse ${language.toUpperCase()} response (attempt ${attempt})`);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error: any) {
      console.error(`[News AI] Error generating ${language.toUpperCase()} (attempt ${attempt}):`, error.message);
      
      // Handle rate limits by rotating API key
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        rotateApiKey();
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      } else {
        throw new Error(`Failed to generate ${language.toUpperCase()} news after ${maxRetries} attempts`);
      }
    }
  }

  throw new Error(`Failed to generate ${language.toUpperCase()} news content`);
}

/**
 * Generate bilingual news content (English + Malayalam)
 */
export async function generateBilingualNews(
  input: NewsGenerationInput
): Promise<BilingualNewsResult> {
  console.log('[News AI] Starting bilingual news generation');
  console.log('[News AI] Event:', input.event_type);
  console.log('[News AI] Category:', input.category);

  try {
    // Generate both languages in parallel
    const [enContent, mlContent] = await Promise.all([
      generateSingleLanguage(input, 'en'),
      generateSingleLanguage(input, 'ml')
    ]);

    console.log('[News AI] ✅ Bilingual generation successful');

    return {
      en: enContent,
      ml: mlContent
    };
  } catch (error) {
    console.error('[News AI] ❌ Bilingual generation failed:', error);
    throw error;
  }
}
