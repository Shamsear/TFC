import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
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
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent mb-2">
            Financial Ledger Management
          </h1>
          <p className="text-[#D4CCBB]">{season.name}</p>
        </div>

        <AuditLogDeleteClient seasonId={seasonId} teams={teams} />
      </div>
    </div>
  );
}
