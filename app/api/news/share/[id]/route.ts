/**
 * Smart News Share Router API
 * Redirects to appropriate news page based on authentication status
 */

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  // If user is logged in as team, redirect to team news page
  if (session?.user?.role === 'TEAM_MANAGER') {
    return NextResponse.redirect(new URL(`/team/news/${id}`, request.url));
  }

  // Otherwise redirect to public news page
  return NextResponse.redirect(new URL(`/news/${id}`, request.url));
}
