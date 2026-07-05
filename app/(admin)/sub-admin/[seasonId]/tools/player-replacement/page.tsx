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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Player Replacement
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          {season.name} - Replace deleted/invalid players and update ledger
        </p>
      </div>

      <PlayerReplacementClient seasonId={seasonId} teams={teamsData} />
    </div>
  );
}
