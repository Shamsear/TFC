/**
 * Database file import API endpoint
 * Handles .db file uploads and processes player data imports
 * Restricted to Super Admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { importSeasonData } from '@/lib/import-service';
import { logError, extractRequestContext } from '@/lib/logger';

/**
 * POST /api/import
 * 
 * Accepts .db file upload with seasonId
 * Parses file and imports player data
 * 
 * @requires Super Admin authentication
 * @body FormData with 'file' and 'seasonId'
 * @returns Import summary with counts and errors
 */
export async function POST(request: NextRequest) {
  const context = extractRequestContext(request);
  
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to continue.' },
        { status: 401 }
      );
    }

    // Check Super Admin role
    if (session.user.role !== 'SUPER_ADMIN') {
      logError(
        'Forbidden access attempt to import data',
        new Error('Non-super-admin attempted data import'),
        { ...context, userId: session.user.id, userRole: session.user.role }
      );
      
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Parse form data
    let formData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      logError('Failed to parse form data in import request', parseError, context);
      return NextResponse.json(
        { error: 'Invalid form data. Please ensure you are uploading a file correctly.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const seasonId = formData.get('seasonId') as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'Missing required field: file. Please select a file to upload.' },
        { status: 400 }
      );
    }

    if (!seasonId || typeof seasonId !== 'string' || seasonId.trim() === '') {
      return NextResponse.json(
        { error: 'Missing required field: seasonId. Please specify a valid season.' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.db')) {
      return NextResponse.json(
        { error: 'Invalid file type. Expected a .db file.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    // Read file content
    let fileContent: string;
    try {
      fileContent = await file.text();
    } catch (readError) {
      logError('Failed to read file content', readError, { ...context, fileName: file.name });
      return NextResponse.json(
        { error: 'Failed to read file content. Please ensure the file is not corrupted.' },
        { status: 400 }
      );
    }

    if (!fileContent || fileContent.trim() === '') {
      return NextResponse.json(
        { error: 'File is empty. Please provide a file with valid player data.' },
        { status: 400 }
      );
    }

    // Process import
    const summary = await importSeasonData(fileContent, seasonId);

    // Check if import had critical errors
    if (summary.errors.length > 0 && summary.newPlayers === 0 && summary.updatedStats === 0) {
      logError(
        'Import failed with errors',
        new Error('Import produced no results'),
        { ...context, seasonId, summary }
      );
      
      return NextResponse.json(
        {
          error: 'Import failed. Please check the file format and try again.',
          summary
        },
        { status: 400 }
      );
    }

    // Return success with summary
    return NextResponse.json(
      {
        message: 'Import completed successfully',
        summary
      },
      { status: 200 }
    );

  } catch (error) {
    logError('Import process failed', error, context);
    
    return NextResponse.json(
      {
        error: 'Internal server error during import. Please try again later.',
        details: process.env.NODE_ENV === 'development' && error instanceof Error 
          ? error.message 
          : undefined
      },
      { status: 500 }
    );
  }
}
