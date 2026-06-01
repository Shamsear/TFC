import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/news/[id]
 * Update news item (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'SUB_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Build update query dynamically
    const updates: string[] = [];
    const allowedFields = [
      'title_en',
      'title_ml',
      'content_en',
      'content_ml',
      'summary_en',
      'summary_ml',
      'category',
      'event_type',
      'is_published',
      'image_url',
      'tone',
      'reporter_en',
      'reporter_ml',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (typeof body[field] === 'boolean') {
          updates.push(`${field} = ${body[field]}`);
        } else if (body[field] === null) {
          updates.push(`${field} = NULL`);
        } else {
          updates.push(`${field} = '${String(body[field]).replace(/'/g, "''")}'`);
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);

    await prisma.$executeRawUnsafe(`
      UPDATE news
      SET ${updates.join(', ')}
      WHERE id = '${id}'
    `);

    return NextResponse.json({
      success: true,
      message: 'News updated successfully',
    });
  } catch (error: any) {
    console.error('[News API] PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/news/[id]
 * Delete news item (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'SUB_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    await prisma.$executeRawUnsafe(`DELETE FROM news WHERE id = '${id}'`);

    return NextResponse.json({
      success: true,
      message: 'News deleted successfully',
    });
  } catch (error: any) {
    console.error('[News API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
