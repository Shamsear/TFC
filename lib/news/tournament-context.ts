import { prisma } from '@/lib/prisma';

/**
 * Get rich tournament context for a team after a match
 */
export async function getTournamentContext(
  tournamentId: string,
  teamId: string,
  matchId?: string
) {
  try {
    // Get tournament details
    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        tournamentType: true
      }
    });

    if (!tournament) {
      return null;
    }

    // Get current standings
    const standings = await prisma.standings.findMany({
      where: { tournamentId },
      include: {
        seasonTeam: {
          include: {
            team: true
          }
        }
      },
      orderBy: [
        { points: 'desc' },
        { goalDiff: 'desc' },
        { goalsFor: 'desc' }
      ]
    });

    // Find team's current standing
    const teamStandingIndex = standings.findIndex((s: any) => s.seasonTeam.teamId === teamId);
    const teamStanding = standings[teamStandingIndex];

    if (!teamStanding) {
      return null;
    }

    // Get recent form (last 5 matches)
    const recentMatches = await prisma.matches.findMany({
      where: {
        tournamentId,
        status: 'COMPLETED',
        OR: [
          { homeTeamId: teamStanding.teamId },
          { awayTeamId: teamStanding.teamId }
        ],
        ...(matchId ? { id: { not: matchId } } : {})
      },
      include: {
        homeTeam: {
          include: { team: true }
        },
        awayTeam: {
          include: { team: true }
        }
      },
      orderBy: { matchDate: 'desc' },
      take: 5
    });

    // Calculate form
    const form = recentMatches.map((match: any) => {
      const isHome = match.homeTeamId === teamStanding.teamId;
      const teamScore = isHome ? match.homeScore : match.awayScore;
      const oppScore = isHome ? match.awayScore : match.homeScore;
      
      if (teamScore! > oppScore!) return 'W';
      if (teamScore! < oppScore!) return 'L';
      return 'D';
    }).reverse();

    // Calculate stats
    const wins = form.filter((r: any) => r === 'W').length;
    const draws = form.filter((r: any) => r === 'D').length;
    const losses = form.filter((r: any) => r === 'L').length;

    // Position context
    const position = teamStandingIndex + 1;
    const totalTeams = standings.length;
    const leader = standings[0];
    const pointsFromLeader = leader.points - teamStanding.points;
    
    // Calculate playoff positions (typically top 4)
    const playoffCutoff = Math.min(4, Math.ceil(totalTeams / 2));
    const isInPlayoffs = position <= playoffCutoff;
    const playoffTeam = standings[playoffCutoff - 1];
    const pointsFromPlayoffs = isInPlayoffs 
      ? teamStanding.points - (standings[playoffCutoff]?.points || 0)
      : playoffTeam.points - teamStanding.points;

    // Teams immediately around them
    const teamAbove = teamStandingIndex > 0 ? standings[teamStandingIndex - 1] : null;
    const teamBelow = teamStandingIndex < standings.length - 1 ? standings[teamStandingIndex + 1] : null;

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        type: tournament.tournamentType
      },
      standing: {
        position,
        totalTeams,
        played: teamStanding.played,
        won: teamStanding.won,
        drawn: teamStanding.drawn,
        lost: teamStanding.lost,
        points: teamStanding.points,
        goalsFor: teamStanding.goalsFor,
        goalsAgainst: teamStanding.goalsAgainst,
        goalDifference: teamStanding.goalDiff
      },
      context: {
        isLeader: position === 1,
        isInPlayoffs,
        playoffCutoff,
        pointsFromLeader,
        pointsFromPlayoffs: Math.abs(pointsFromPlayoffs),
        aboveOrBelowPlayoffs: isInPlayoffs ? 'above' : 'below'
      },
      form: {
        recent: form.join(''),
        last5: { wins, draws, losses }
      },
      neighbors: {
        above: teamAbove ? {
          name: teamAbove.seasonTeam.team.name,
          points: teamAbove.points,
          pointsDiff: teamAbove.points - teamStanding.points
        } : null,
        below: teamBelow ? {
          name: teamBelow.seasonTeam.team.name,
          points: teamBelow.points,
          pointsDiff: teamStanding.points - teamBelow.points
        } : null
      },
      leader: {
        name: leader.seasonTeam.team.name,
        points: leader.points,
        isLeader: leader.teamId === teamStanding.teamId
      }
    };
  } catch (error) {
    console.error('[Tournament Context] Error:', error);
    return null;
  }
}

/**
 * Generate narrative context string for AI
 */
export function generateContextNarrative(context: Awaited<ReturnType<typeof getTournamentContext>>) {
  if (!context) return '';

  const parts: string[] = [];

  // Position
  parts.push(`Currently ${context.standing.position}${getOrdinalSuffix(context.standing.position)} in ${context.tournament.name}`);
  
  // Points
  parts.push(`with ${context.standing.points} points from ${context.standing.played} matches`);

  // Form
  if (context.form.recent) {
    const formDesc = context.form.last5.wins >= 3 ? 'excellent' : 
                     context.form.last5.wins >= 2 ? 'good' :
                     context.form.last5.losses >= 3 ? 'poor' : 'mixed';
    parts.push(`Recent form: ${formDesc} (${context.form.recent})`);
  }

  // League context
  if (context.context.isLeader) {
    parts.push('Leading the table');
    if (context.neighbors.below) {
      parts.push(`${context.neighbors.below.pointsDiff} points clear of ${context.neighbors.below.name}`);
    }
  } else {
    parts.push(`${context.context.pointsFromLeader} points behind leader ${context.leader.name}`);
  }

  // Playoff context
  if (context.context.isInPlayoffs) {
    parts.push(`In playoff positions (top ${context.context.playoffCutoff})`);
    if (context.neighbors.below && context.standing.position === context.context.playoffCutoff) {
      parts.push(`Just ${context.neighbors.below.pointsDiff} points ahead of ${context.neighbors.below.name} in ${context.standing.position + 1}${getOrdinalSuffix(context.standing.position + 1)}`);
    }
  } else {
    parts.push(`${context.context.pointsFromPlayoffs} points away from playoff positions`);
  }

  return parts.join('. ') + '.';
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
