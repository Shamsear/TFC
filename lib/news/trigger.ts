import { NewsEventType, NewsCategory, NewsGenerationInput } from './types';
import { generateBilingualNews } from './auto-generate';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { generateNewsImage } from './image-generator';

/**
 * Determine category from event type
 */
export function getEventCategory(eventType: NewsEventType): NewsCategory {
  if (eventType.startsWith('season_')) return 'season';
  if (eventType.startsWith('team_')) return 'team';
  if (eventType.startsWith('auction_') || eventType.includes('tiebreaker') || eventType.includes('round')) return 'auction';
  if (eventType.includes('release') || eventType.includes('swap') || eventType.startsWith('player_')) return 'transfer';
  if (eventType.startsWith('tournament_') || eventType.includes('knockout') || eventType.includes('finals')) return 'tournament';
  
  // Match-related events (must come before general checks)
  if (
    eventType.startsWith('match_') || 
    eventType.includes('match') ||  // Catches: close_match, high_scoring, etc.
    eventType.includes('scoring') || 
    eventType.includes('sheet') ||
    eventType.includes('thrashing') ||
    eventType.includes('opener') ||
    eventType.includes('streak') ||
    eventType.includes('drought') ||
    eventType.includes('slayer') ||
    eventType.includes('century') ||
    eventType.includes('nightmare') ||
    eventType.includes('takeover') ||
    eventType.includes('mediocrity') ||
    eventType.includes('basement') ||
    eventType.includes('title_') ||
    eventType.includes('final_day') ||
    eventType === 'boring_draw' ||
    eventType === 'penalty_shootout' ||
    eventType === 'perfect_start' ||
    eventType === 'manager_first_match' ||
    eventType === 'manager_quote_special' ||
    eventType === 'dominant_win' ||
    eventType === 'thriller' ||
    eventType === 'goal_fest' ||
    eventType === 'entertaining_draw' ||
    eventType === 'draw' ||
    eventType.startsWith('matchday_')
  ) return 'match';
  
  if (eventType.includes('badge') || eventType.includes('award') || eventType.includes('winner')) return 'achievement';
  if (eventType.includes('admin') || eventType.includes('manager_created') || eventType.includes('notification')) return 'admin';
  if (eventType.includes('budget') || eventType.includes('financial')) return 'financial';
  
  return 'season'; // default
}

/**
 * Trigger news generation for an event
 * This is the main entry point for creating news
 */
export async function triggerNews(
  eventType: NewsEventType,
  data: {
    season_id: string;
    season_name?: string;
    metadata?: Record<string, any>;
    context?: string;
  }
): Promise<void> {
  try {
    console.log(`[News Trigger] Event: ${eventType}`);
    
    const category = getEventCategory(eventType);
    
    // Fetch recent news to avoid duplicates
    const recentNews = await prisma.news.findMany({
      where: {
        category,
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      select: {
        title_en: true,
        title_ml: true,
        summary_en: true,
        summary_ml: true,
      },
      orderBy: { created_at: 'desc' },
      take: 10 // Last 10 articles in this category
    });

    // Build recent headlines context
    const recentHeadlinesEN = recentNews.map(n => n.title_en).join('\n- ');
    const recentHeadlinesML = recentNews.map(n => n.title_ml || '').filter(Boolean).join('\n- ');
    
    const avoidContext = recentNews.length > 0 
      ? `\n\n🚫 CRITICAL: AVOID DUPLICATE CONTENT\n\nRECENT HEADLINES (Last 7 days):\n\nEnglish:\n- ${recentHeadlinesEN}\n\nMalayalam:\n- ${recentHeadlinesML}\n\n⚠️ STRICT REQUIREMENTS:\n1. DO NOT use the same key words, phrases, or expressions\n2. DO NOT use similar score mentions (if recent used "6-0 താണ്ഡവം", use different phrasing)\n3. DO NOT repeat emotional descriptors (താണ്ഡവം, നാണംകെട്ട, etc.)\n4. CREATE completely fresh angles and vocabulary\n5. VARY your opening structure and narrative approach\n\nThis is MANDATORY - repetitive content will be rejected.`
      : '';
    
    const input: NewsGenerationInput = {
      event_type: eventType,
      category,
      season_id: data.season_id,
      season_name: data.season_name,
      metadata: data.metadata,
      context: (data.context || '') + avoidContext
    };

    // Generate bilingual news content with AI
    const result = await generateBilingualNews(input);
    
    // Create news record ID
    const newsId = `NEWS-${randomUUID()}`;
    
    // Generate image poster
    let imageUrl = '';
    try {
      imageUrl = await generateNewsImage(newsId, eventType, data.metadata || {});
    } catch (imgError) {
      console.warn('[News Trigger] Image generation failed:', imgError);
    }
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO news (
        id, title_en, title_ml, content_en, content_ml, summary_en, summary_ml,
        category, event_type, season_id, season_name, tone,
        reporter_en, reporter_ml, metadata, generated_by, is_published,
        image_url, created_at, updated_at
      ) VALUES (
        '${newsId}',
        '${result.en.title.replace(/'/g, "''")}',
        '${result.ml.title.replace(/'/g, "''")}',
        '${result.en.content.replace(/'/g, "''")}',
        '${result.ml.content.replace(/'/g, "''")}',
        '${result.en.summary.replace(/'/g, "''")}',
        '${result.ml.summary.replace(/'/g, "''")}',
        '${input.category}',
        '${input.event_type}',
        ${input.season_id ? `'${input.season_id}'` : 'NULL'},
        ${input.season_name ? `'${input.season_name.replace(/'/g, "''")}'` : 'NULL'},
        '${result.en.tone}',
        '${result.en.reporter}',
        '${result.ml.reporter}',
        ${input.metadata ? `'${JSON.stringify(input.metadata)}'::jsonb` : 'NULL'},
        'ai',
        true,
        ${imageUrl ? `'${imageUrl}'` : 'NULL'},
        NOW(),
        NOW()
      )
    `);

    console.log(`[News Trigger] ✅ News created: ${newsId}`);
  } catch (error) {
    console.error(`[News Trigger] ❌ Failed to trigger news:`, error);
    // Don't throw - news generation failures shouldn't break the main flow
  }
}
