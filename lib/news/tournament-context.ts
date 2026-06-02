import { prisma } from '@/lib/prisma';
import { getCleanManagerName } from './utils';

/**
 * Get rich tournament context for a team after a match
 */
export async function getTournamentContext(
  tournamentId: string,
  teamId: string,
  matchId?: string
) {
  try {
    // Get tournament details including knockout stage info
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

    // Get ALL matches in tournament for progress tracking
    const allMatches = await prisma.matches.findMany({
      where: { tournamentId },
      select: { 
        id: true, 
        status: true,
        homeTeamId: true,
        awayTeamId: true
      }
    });

    const totalMatches = allMatches.length;
    const completedMatches = allMatches.filter((m: any) => m.status === 'COMPLETED').length;
    const matchesRemaining = totalMatches - completedMatches;
    const tournamentProgress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

    // Get team's remaining matches
    const teamRemainingMatches = allMatches.filter((m: any) => 
      (m.homeTeamId === teamStanding.teamId || m.awayTeamId === teamStanding.teamId) &&
      m.status !== 'COMPLETED'
    ).length;

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

    // Calculate recent goals scored/conceded
    const recentGoalsScored = recentMatches.reduce((sum: number, match: any) => {
      const isHome = match.homeTeamId === teamStanding.teamId;
      return sum + (isHome ? match.homeScore : match.awayScore);
    }, 0);

    const recentGoalsConceded = recentMatches.reduce((sum: number, match: any) => {
      const isHome = match.homeTeamId === teamStanding.teamId;
      return sum + (isHome ? match.awayScore : match.homeScore);
    }, 0);

    // Calculate stats
    const wins = form.filter((r: any) => r === 'W').length;
    const draws = form.filter((r: any) => r === 'D').length;
    const losses = form.filter((r: any) => r === 'L').length;

    // Get next opponent
    const nextMatch = await prisma.matches.findFirst({
      where: {
        tournamentId,
        status: 'SCHEDULED',
        OR: [
          { homeTeamId: teamStanding.teamId },
          { awayTeamId: teamStanding.teamId }
        ]
      },
      include: {
        homeTeam: { include: { team: true } },
        awayTeam: { include: { team: true } }
      },
      orderBy: { matchDate: 'asc' }
    });

    let nextOpponent = null;
    if (nextMatch) {
      const isHome = nextMatch.homeTeamId === teamStanding.teamId;
      const opponentTeam = isHome ? nextMatch.awayTeam : nextMatch.homeTeam;
      
      // Get opponent's form
      const opponentMatches = await prisma.matches.findMany({
        where: {
          tournamentId,
          status: 'COMPLETED',
          OR: [
            { homeTeamId: opponentTeam.id },
            { awayTeamId: opponentTeam.id }
          ]
        },
        orderBy: { matchDate: 'desc' },
        take: 5
      });

      const opponentForm = opponentMatches.map((m: any) => {
        const isOppHome = m.homeTeamId === opponentTeam.id;
        const score = isOppHome ? m.homeScore : m.awayScore;
        const oppScore = isOppHome ? m.awayScore : m.homeScore;
        return score! > oppScore! ? 'W' : score! < oppScore! ? 'L' : 'D';
      }).reverse().join('');

      // Get opponent's standing
      const opponentStanding = standings.find((s: any) => s.teamId === opponentTeam.id);

      nextOpponent = {
        name: opponentTeam.team.name,
        isHome,
        form: opponentForm,
        position: opponentStanding ? standings.indexOf(opponentStanding) + 1 : null,
        points: opponentStanding?.points || 0
      };
    }

    // Position context
    const position = teamStandingIndex + 1;
    const totalTeams = standings.length;
    const leader = standings[0];
    const pointsFromLeader = leader.points - teamStanding.points;
    
    // Calculate title race (teams within striking distance of leader)
    const titleRaceGap = 10; // Teams within 10 points of leader
    const titleContenders = standings.filter((s: any) => 
      leader.points - s.points <= titleRaceGap && s.teamId !== leader.teamId
    ).map((s: any) => ({
      name: s.seasonTeam.team.name,
      points: s.points,
      gap: leader.points - s.points
    }));

    // Calculate playoff/knockout context based on tournament type
    const tournamentType = tournament.tournamentType;
    const hasKnockoutStage = 
      tournamentType === 'LEAGUE_PLAYOFF' || 
      tournamentType === 'GROUP_KNOCKOUT';
    
    // For pure knockout tournaments, there are no standings/playoffs to worry about
    const isPureKnockout = tournamentType === 'KNOCKOUT_ONLY';
    
    let playoffCutoff = 0;
    let isInPlayoffs = false;
    let pointsFromPlayoffs = 0;
    
    if (!isPureKnockout && hasKnockoutStage) {
      // Determine playoff cutoff based on tournament type
      if (tournamentType === 'LEAGUE_PLAYOFF') {
        // Top teams qualify for playoffs (typically top 4 or top half)
        playoffCutoff = Math.min(4, Math.ceil(totalTeams / 2));
      } else if (tournamentType === 'GROUP_KNOCKOUT') {
        // Typically top 2 from each group
        playoffCutoff = Math.min(2, Math.ceil(totalTeams / 4));
      }
      
      isInPlayoffs = position <= playoffCutoff;
      const playoffTeam = playoffCutoff > 0 ? standings[playoffCutoff - 1] : null;
      
      if (playoffTeam) {
        pointsFromPlayoffs = isInPlayoffs 
          ? teamStanding.points - (standings[playoffCutoff]?.points || 0)
          : playoffTeam.points - teamStanding.points;
      }
    }

    // Teams immediately around them
    const teamAbove = teamStandingIndex > 0 ? standings[teamStandingIndex - 1] : null;
    const teamBelow = teamStandingIndex < standings.length - 1 ? standings[teamStandingIndex + 1] : null;

    // Calculate max possible points
    const maxPossiblePoints = teamStanding.points + (teamRemainingMatches * 3);
    const canWinTitle = maxPossiblePoints >= leader.points;

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        type: tournament.tournamentType,
        progress: {
          completed: completedMatches,
          total: totalMatches,
          remaining: matchesRemaining,
          percentage: tournamentProgress
        }
      },
      team: {
        name: teamStanding.seasonTeam.team.name,
        manager: getCleanManagerName(teamStanding.seasonTeam.managerName)
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
        goalDifference: teamStanding.goalDiff,
        matchesRemaining: teamRemainingMatches,
        maxPossiblePoints
      },
      context: {
        isLeader: position === 1,
        isInPlayoffs,
        hasKnockoutStage,
        isPureKnockout,
        tournamentType,
        playoffCutoff,
        pointsFromLeader,
        pointsFromPlayoffs: Math.abs(pointsFromPlayoffs),
        aboveOrBelowPlayoffs: isInPlayoffs ? 'above' : 'below',
        canWinTitle,
        titleRace: {
          hasContenders: titleContenders.length > 0,
          contenders: titleContenders.slice(0, 3) // Top 3 contenders
        }
      },
      form: {
        recent: form.join(''),
        last5: { wins, draws, losses },
        recentGoals: {
          scored: recentGoalsScored,
          conceded: recentGoalsConceded,
          perMatch: recentMatches.length > 0 ? (recentGoalsScored / recentMatches.length).toFixed(1) : '0'
        }
      },
      nextOpponent,
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

  // Manager and team context
  parts.push(`Team: ${context.team.name} (Manager: ${context.team.manager})`);

  // Tournament progress
  if (context.tournament.progress.total > 0) {
    parts.push(`Tournament: ${context.tournament.progress.completed} of ${context.tournament.progress.total} matches played (${context.tournament.progress.percentage}% complete)`);
  }

  // Position with matches played context
  parts.push(`Currently ${context.standing.position}${getOrdinalSuffix(context.standing.position)} in ${context.tournament.name} with ${context.standing.points} points from ${context.standing.played} matches`);

  // Matches remaining context
  if (context.standing.matchesRemaining > 0) {
    parts.push(`${context.standing.matchesRemaining} match${context.standing.matchesRemaining > 1 ? 'es' : ''} remaining`);
  }

  // Form with goal statistics
  if (context.form.recent) {
    const formDesc = context.form.last5.wins >= 3 ? 'excellent' : 
                     context.form.last5.wins >= 2 ? 'good' :
                     context.form.last5.losses >= 3 ? 'poor' : 'mixed';
    parts.push(`Recent form: ${formDesc} (${context.form.recent})`);
    
    if (context.form.recentGoals) {
      parts.push(`Scoring ${context.form.recentGoals.perMatch} goals per match in last ${context.form.last5.wins + context.form.last5.draws + context.form.last5.losses} games (${context.form.recentGoals.scored} scored, ${context.form.recentGoals.conceded} conceded)`);
    }
  }

  // League context - describe position relative to knockout stage if applicable
  if (context.context.isLeader) {
    parts.push('Leading the table');
    if (context.neighbors.below) {
      parts.push(`${context.neighbors.below.pointsDiff} points clear of ${context.neighbors.below.name} in 2nd`);
    }
    
    // Title race context for leaders
    if (context.context.titleRace.hasContenders && context.context.titleRace.contenders.length > 0) {
      const contenderNames = context.context.titleRace.contenders.map(c => `${c.name} (${c.gap} pts behind)`).join(', ');
      parts.push(`Title challengers: ${contenderNames}`);
    }
  } else {
    parts.push(`${context.context.pointsFromLeader} points behind leader ${context.leader.name}`);
    
    // Can they still win?
    if (context.context.canWinTitle && context.standing.matchesRemaining > 0) {
      parts.push(`Can still win title (max ${context.standing.maxPossiblePoints} points possible)`);
    } else if (!context.context.canWinTitle && context.standing.matchesRemaining > 0) {
      parts.push(`Title mathematically out of reach`);
    }
  }

  // Knockout/Playoff context - only mention if tournament has knockout stage
  if (context.context.hasKnockoutStage && !context.context.isPureKnockout) {
    const qualificationTerm = context.context.tournamentType === 'LEAGUE_PLAYOFF' ? 'playoff' :
                               context.context.tournamentType === 'GROUP_KNOCKOUT' ? 'knockout' :
                               'qualification';
    
    if (context.context.isInPlayoffs) {
      parts.push(`In ${qualificationTerm} positions (top ${context.context.playoffCutoff})`);
      if (context.neighbors.below && context.standing.position === context.context.playoffCutoff) {
        parts.push(`Just ${context.neighbors.below.pointsDiff} points ahead of ${context.neighbors.below.name} in ${context.standing.position + 1}${getOrdinalSuffix(context.standing.position + 1)}`);
      }
    } else if (context.context.playoffCutoff > 0) {
      parts.push(`${context.context.pointsFromPlayoffs} points away from ${qualificationTerm} positions`);
    }
  } else if (context.context.tournamentType === 'LEAGUE_ONLY') {
    // For pure league tournaments, focus on league position battle
    if (!context.context.isLeader && context.neighbors.above) {
      parts.push(`Chasing ${context.neighbors.above.name} (${context.neighbors.above.pointsDiff} points ahead)`);
    }
    if (context.neighbors.below) {
      parts.push(`${context.neighbors.below.pointsDiff} points ahead of ${context.neighbors.below.name}`);
    }
  }

  // Next opponent preview
  if (context.nextOpponent) {
    const venue = context.nextOpponent.isHome ? 'home' : 'away';
    const formDesc = context.nextOpponent.form.includes('W') ? 'in form' : 
                     context.nextOpponent.form.includes('L') ? 'struggling' : 'inconsistent';
    parts.push(`Next: ${venue} vs ${context.nextOpponent.name} (${context.nextOpponent.position}${getOrdinalSuffix(context.nextOpponent.position!)}, ${context.nextOpponent.points} pts, form: ${context.nextOpponent.form}, ${formDesc})`);
  }

  return parts.join('. ') + '.';
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
