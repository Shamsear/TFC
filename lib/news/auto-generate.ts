import { getGeminiModel, rotateApiKey, handleModelFailure, resetToPrimary } from '../gemini/config';
import { generatePrompt } from './prompts-bilingual';
import { determineTone } from './determine-tone';
import { NewsGenerationInput, BilingualNewsResult, NewsContent, NewsTone } from './types';

const REPORTERS = {
  en: 'Alex Thompson',
  ml: 'Rajesh Nair'
};

/**
 * Parse AI response with multiple fallback strategies
 * Enhanced for Malayalam Unicode support
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
    // Continue to fallback strategies
  }

  try {
    // Strategy 4: Try to extract incomplete JSON and complete it
    // Enhanced for Malayalam Unicode characters
    const titleMatch = text.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const contentMatch = text.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)/);
    const summaryMatch = text.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    
    if (titleMatch && contentMatch) {
      let content = contentMatch[1];
      
      // For incomplete content, find last complete sentence
      // Support Malayalam punctuation: । (purna virama) and English punctuation
      if (!text.includes(`"${content}"`) || !summaryMatch) {
        // Malayalam sentence enders: । ൿ and standard punctuation
        const malayalamEnders = /[।॥.?!।ൿ]/g;
        let lastEnd = -1;
        let match;
        
        while ((match = malayalamEnders.exec(content)) !== null) {
          lastEnd = match.index;
        }
        
        if (lastEnd > content.length * 0.5) { // Keep if >50% complete
          content = content.substring(0, lastEnd + 1).trim();
        }
      }
      
      // Unescape JSON escaped characters
      content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      const title = titleMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      const summary = summaryMatch 
        ? summaryMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
        : title.substring(0, 100);
      
      return {
        title,
        content,
        summary
      };
    }
  } catch (e) {
    console.error('[News AI] Parse strategy 4 failed:', e);
  }

  // Strategy 5: Last resort - try to extract any readable content
  try {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length >= 3) {
      // Try to find title-like line (shorter)
      const titleLine = lines.find(l => l.length < 100 && !l.startsWith('{') && !l.startsWith('}'));
      // Find longest line as content
      const contentLine = lines.reduce((longest, current) => 
        current.length > longest.length ? current : longest, '');
      
      if (titleLine && contentLine && contentLine !== titleLine) {
        return {
          title: titleLine.replace(/["{}\[\]]/g, '').trim(),
          content: contentLine.replace(/["{}\[\]]/g, '').trim(),
          summary: titleLine.substring(0, 100)
        };
      }
    }
  } catch (e) {
    console.error('[News AI] Parse strategy 5 failed:', e);
  }

  return null;
}

/**
 * Generate news content in a single language with retry logic
 */
async function generateSingleLanguage(
  input: NewsGenerationInput,
  language: 'en' | 'ml',
  maxRetries = 10
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

      console.log(`[News AI] Raw ${language.toUpperCase()} response length:`, text.length);
      console.log(`[News AI] Raw ${language.toUpperCase()} response preview:`, text.substring(0, 300));
      console.log(`[News AI] Raw ${language.toUpperCase()} response end:`, text.substring(text.length - 200));

      const parsed = parseAIResponse(text);
      
      if (parsed) {
        console.log(`[News AI] ✅ Successfully parsed ${language.toUpperCase()} content:`);
        console.log(`  - Title: ${parsed.title.substring(0, 50)}...`);
        console.log(`  - Content length: ${parsed.content.length} chars`);
        console.log(`  - Summary: ${parsed.summary.substring(0, 50)}...`);
        
        return {
          title: parsed.title,
          content: parsed.content,
          summary: parsed.summary,
          tone,
          reporter: REPORTERS[language]
        };
      }

      console.warn(`[News AI] Failed to parse ${language.toUpperCase()} response (attempt ${attempt})`);
      console.warn(`[News AI] Response was: ${text.substring(0, 500)}...`);
      
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
      
      // Handle persistent failures by trying model fallback
      if (error.message?.includes('500') || error.message?.includes('503') || error.message?.includes('model')) {
        const didFallback = handleModelFailure();
        if (didFallback) {
          console.log(`[News AI] Retrying with fallback model...`);
        }
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
    
    // Reset to primary model after successful generation
    resetToPrimary();

    return {
      en: enContent,
      ml: mlContent
    };
  } catch (error) {
    console.error('[News AI] ❌ Bilingual generation failed:', error);
    throw error;
  }
}
