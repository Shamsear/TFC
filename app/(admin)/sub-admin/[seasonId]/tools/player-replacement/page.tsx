import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PlayerReplacementClient from '@/components/admin/PlayerReplacementClient';

interface PlayerReplacementPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function PlayerReplacementPage({ params }: PlayerReplacementPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const { seasonId } = await params;

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    select: { name: true }
  });

  if (!season) {
    notFound();
  }

  const teams = await prisma.season_teams.findMany({
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
      team: { name: 'asc' }
    }
  });

  const teamsData = teams.map(st => ({
    id: st.team.id,
    name: st.team.name
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                Player Replacement
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-sm sm:text-base">
              {season.name} - Replace deleted/invalid players and update ledger
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <PlayerReplacementClient seasonId={seasonId} teams={teamsData} />
      </div>
    </div>
  );
}
