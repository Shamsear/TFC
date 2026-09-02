import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import FinalizationFixClient from '@/components/admin/FinalizationFixClient';

interface FinalizationFixPageProps {
  params: Promise<{
    seasonId: string;
  }>;
}

export default async function FinalizationFixPage({ params }: FinalizationFixPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { seasonId } = await params;

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId }
  });

  if (!season) {
    notFound();
  }

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}/tools`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tools
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Double Finalisation Fix
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {season.name} • Audit and repair duplicate round executions, duplicate transfers & desynced team budgets
        </p>
      </div>

      <FinalizationFixClient seasonId={seasonId} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
