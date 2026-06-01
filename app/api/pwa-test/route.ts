import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * PWA Test Endpoint
 * Use this to verify authentication and routing behavior
 * Visit: /api/pwa-test
 */
export async function GET() {
  const session = await auth();
  
  return NextResponse.json({
    authenticated: !!session,
    user: session?.user ? {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      teamId: session.user.teamId,
    } : null,
    expectedRedirect: session?.user 
      ? session.user.role === 'SUPER_ADMIN' 
        ? '/super-admin'
        : session.user.role === 'SUB_ADMIN'
        ? '/sub-admin'
        : '/team'
      : null,
    timestamp: new Date().toISOString(),
    headers: {
      userAgent: process.env.NODE_ENV === 'development' ? 'hidden in production' : undefined,
    }
  });
}
