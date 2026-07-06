import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import AuditLogDeleteClient from '@/components/admin/AuditLogDeleteClient';

export default async function AuditLogsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const session = await auth();

  // Both SUB_ADMIN and SUPER_ADMIN can access this tool
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
    redirect('/login');
  }

  const { seasonId } = await params;

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    select: { name: true }
  });

  if (!season) {
    redirect('/sub-admin');
  }

  // Get all teams in this season
  const seasonTeams = await prisma.season_teams.findMany({
    where: { seasonId },
    include: {
      team: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      team: {
        name: 'asc'
      }
    }
  });

  const teams = seasonTeams.map(st => ({
    id: st.team.id,
    name: st.team.name
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
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
          Financial Ledger Management
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {season.name} • Delete individual ledger entries and recalculate team balances
        </p>
      </div>

      <AuditLogDeleteClient seasonId={seasonId} teams={teams} />
    </div>
  );
}
