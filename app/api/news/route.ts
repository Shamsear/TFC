import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateBilingualNews } from '@/lib/news/auto-generate';
import { NewsGenerationInput } from '@/lib/news/types';
import { randomUUID } from 'crypto';

/**
 * GET /api/news
 * Fetch published news items
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('season_id');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeDrafts = searchParams.get('include_drafts') === 'true';

    // Check if user wants drafts (admin only)
    let canSeeDrafts = false;
    if (includeDrafts) {
      const session = await auth();
      canSeeDrafts = session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'SUB_ADMIN';
    }

    const where: any = {};
    
    if (!canSeeDrafts) {
      where.is_published = true;
    }
    
    if (seasonId) {
      where.season_id = seasonId;
    }
    
    if (category) {
      where.category = category;
    }

    const news = await prisma.news.findMany({
      where,
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });

    return NextResponse.json({
      success: true,
      news,
      count: news.length
    });
  } catch (error: any) {
    console.error('[News API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/news
 * Create or update news (with AI generation)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // AI Generation Mode
    if (body.generate_with_ai && body.generation_input) {
      const input: NewsGenerationInput = body.generation_input;
      
      console.log('[News API] Generating bilingual news with AI');
      
      // Generate content
      const result = await generateBilingualNews(input);
      
      // Create news record
      const newsId = `NEWS-${randomUUID()}`;
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO news (
          id, title_en, title_ml, content_en, content_ml, summary_en, summary_ml,
          category, event_type, season_id, season_name, tone,
          reporter_en, reporter_ml, metadata, generated_by, is_published,
          created_at, updated_at
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
          false,
          NOW(),
          NOW()
        )
      `);

      return NextResponse.json({
        success: true,
        message: 'Bilingual news generated with AI successfully',
        news_id: newsId,
        news: {
          id: newsId,
          ...result
        }
      });
    }

    // Manual Creation Mode
    const {
      title_en,
      title_ml,
      content_en,
      content_ml,
      summary_en,
      summary_ml,
      category,
      event_type,
      season_id,
      season_name,
      is_published = false
    } = body;

    const newsId = `NEWS-${randomUUID()}`;

    await prisma.$executeRawUnsafe(`
      INSERT INTO news (
        id, title_en, title_ml, content_en, content_ml, summary_en, summary_ml,
        category, event_type, season_id, season_name, generated_by, is_published,
        created_at, updated_at
      ) VALUES (
        '${newsId}',
        '${title_en.replace(/'/g, "''")}',
        ${title_ml ? `'${title_ml.replace(/'/g, "''")}'` : 'NULL'},
        '${content_en.replace(/'/g, "''")}',
        ${content_ml ? `'${content_ml.replace(/'/g, "''")}'` : 'NULL'},
        ${summary_en ? `'${summary_en.replace(/'/g, "''")}'` : 'NULL'},
        ${summary_ml ? `'${summary_ml.replace(/'/g, "''")}'` : 'NULL'},
        '${category}',
        '${event_type}',
        ${season_id ? `'${season_id}'` : 'NULL'},
        ${season_name ? `'${season_name.replace(/'/g, "''")}'` : 'NULL'},
        'manual',
        ${is_published},
        NOW(),
        NOW()
      )
    `);

    return NextResponse.json({
      success: true,
      message: 'News created successfully',
      news_id: newsId
    });
  } catch (error: any) {
    console.error('[News API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/news?id=xxx
 * Delete news item (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'SUB_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'News ID required' },
        { status: 400 }
      );
    }

    await prisma.$executeRawUnsafe(`DELETE FROM news WHERE id = '${id}'`);

    return NextResponse.json({
      success: true,
      message: 'News deleted successfully'
    });
  } catch (error: any) {
    console.error('[News API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
