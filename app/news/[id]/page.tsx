/**
 * Smart News Router
 * Redirects to appropriate news page based on authentication status
 * - Team users → /team/news/[id]
 * - Public users → /news (public landing, showing article)
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function SmartNewsRouter({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  // If user is logged in as team, redirect to team news page
  if (session?.user?.role === 'TEAM') {
    redirect(`/team/news/${id}`);
  }

  // Otherwise redirect to public news page
  redirect(`/news/${id}`);
}
