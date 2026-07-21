import { prisma } from './prisma'
import { generateStandingId, generateMatchId } from './id-generator'
import crypto from 'crypto'

export interface QualifiedTeam {
  seasonTeamId: string;
  qualificationPosition: number;
  groupName: string | null;
  seedPosition: number;
}

export interface ConfirmedTeam {
  seasonTeamId: string;
  confirmedPosition: number;
  confirmedAt: Date;
}

function getLinkPriority(linkType: string, config: any): number {
  const type = linkType
  const cfg = config || {}
  if (type === 'POSITION_RANGE') {
    return Number(cfg.startPosition) || 1
  }
  if (type === 'RUNNER_UP') {
    return 2
  }
  if (type === 'GROUP_POSITION') {
    return Number(cfg.position) || 1
  }
  if (type === 'MULTIPLE_POSITIONS_PER_GROUP') {
    const positions = cfg.positionsPerGroup || []
    return positions.length > 0 ? Math.min(...positions) : 1
  }
  return 1
}

/**
 * Resolves qualified teams from a source tournament based on standings and link configurations
 */
export async function getQualifiedTeams(
  tournamentId: string,
  linkType: string,
  config: any,
  linkId?: string
): Promise<QualifiedTeam[]> {
  const excludeTeamIds = new Set<string>(config?.excludeTeamIds || []);
  const takenTeamIds = new Set<string>()

  // If linkId is provided, resolve sister links of higher priority to exclude their qualified teams
  if (linkId) {
    const sisterLinks = await prisma.tournament_links.findMany({
      where: {
        sourceTournamentId: tournamentId,
        status: 'ACTIVE'
      }
    })

    const currentPriority = getLinkPriority(linkType, config)
    const higherPriorityLinks = sisterLinks.filter(l => {
      if (l.id === linkId) return false
      const p = getLinkPriority(l.linkType, l.qualificationConfig)
      return p < currentPriority
    })

    for (const hl of higherPriorityLinks) {
      const hlTeams = await getQualifiedTeams(
        tournamentId,
        hl.linkType,
        hl.qualificationConfig,
        hl.id
      )
      for (const t of hlTeams) {
        takenTeamIds.add(t.seasonTeamId)
      }
    }
  }

  const rawStandings = await prisma.standings.findMany({
    where: { tournamentId },
    select: {
      teamId: true,
      groupName: true,
      position: true,
      points: true,
      goalDiff: true,
      goalsFor: true
    },
    orderBy: [
      { groupName: 'asc' },
      { position: 'asc' },
      { points: 'desc' },
      { goalDiff: 'desc' },
      { goalsFor: 'desc' }
    ]
  });

  const standings = rawStandings.filter(s => {
    if (excludeTeamIds.has(s.teamId)) return false
    if (takenTeamIds.has(s.teamId)) return false
    return true
  })

  switch (linkType) {
    case 'TOP_N': {
      const count = config.count;
      const groupBy = config.groupBy;
      const seedMapping = config.seedMapping || [];

      if (groupBy === 'group') {
        // Group by groupName
        const groups: Record<string, typeof standings> = {};
        for (const s of standings) {
          const gName = s.groupName || 'Overall';
          if (!groups[gName]) groups[gName] = [];
          groups[gName].push(s);
        }

        const teams: QualifiedTeam[] = [];
        let globalIndex = 0;
        for (const [gName, groupStandings] of Object.entries(groups)) {
          const topTeams = groupStandings.slice(0, count);
          topTeams.forEach((s, idx) => {
            const pos = idx + 1;
            const seed = seedMapping[globalIndex] || (globalIndex + 1);
            teams.push({
              seasonTeamId: s.teamId,
              qualificationPosition: pos,
              groupName: gName === 'Overall' ? null : gName,
              seedPosition: seed
            });
            globalIndex++;
          });
        }
        return teams;
      } else {
        // Overall standings
        const overallStandings = [...standings].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
          return b.goalsFor - a.goalsFor;
        });

        const topTeams = overallStandings.slice(0, count);
        return topTeams.map((s, idx) => {
          const pos = idx + 1;
          const seed = seedMapping[idx] || pos;
          return {
            seasonTeamId: s.teamId,
            qualificationPosition: pos,
            groupName: null,
            seedPosition: seed
          };
        });
      }
    }

    case 'BOTTOM_N': {
      const count = config.count;
      const groupBy = config.groupBy;

      if (groupBy === 'group') {
        const groups: Record<string, typeof standings> = {};
        for (const s of standings) {
          const gName = s.groupName || 'Overall';
          if (!groups[gName]) groups[gName] = [];
          groups[gName].push(s);
        }

        const teams: QualifiedTeam[] = [];
        let globalIndex = 0;
        for (const [gName, groupStandings] of Object.entries(groups)) {
          const bottomTeams = groupStandings.slice(-count);
          bottomTeams.forEach((s, idx) => {
            teams.push({
              seasonTeamId: s.teamId,
              qualificationPosition: groupStandings.length - count + idx + 1,
              groupName: gName === 'Overall' ? null : gName,
              seedPosition: globalIndex + 1
            });
            globalIndex++;
          });
        }
        return teams;
      } else {
        const overallStandings = [...standings].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
          return b.goalsFor - a.goalsFor;
        });

        const bottomTeams = overallStandings.slice(-count);
        return bottomTeams.map((s, idx) => {
          const pos = overallStandings.length - count + idx + 1;
          return {
            seasonTeamId: s.teamId,
            qualificationPosition: pos,
            groupName: null,
            seedPosition: idx + 1
          };
        });
      }
    }

    case 'POSITION_RANGE': {
      const start = config.startPosition;
      const end = config.endPosition;
      const groupBy = config.groupBy;

      if (groupBy === 'group') {
        const groups: Record<string, typeof standings> = {};
        for (const s of standings) {
          const gName = s.groupName || 'Overall';
          if (!groups[gName]) groups[gName] = [];
          groups[gName].push(s);
        }

        const teams: QualifiedTeam[] = [];
        let globalIndex = 0;
        for (const [gName, groupStandings] of Object.entries(groups)) {
          const sliceStart = takenTeamIds.size > 0 ? 0 : (start - 1);
          const sliceEnd = takenTeamIds.size > 0 ? (end - start + 1) : end;
          const rangeTeams = groupStandings.slice(sliceStart, sliceEnd);
          rangeTeams.forEach((s, idx) => {
            teams.push({
              seasonTeamId: s.teamId,
              qualificationPosition: start + idx,
              groupName: gName === 'Overall' ? null : gName,
              seedPosition: globalIndex + 1
            });
            globalIndex++;
          });
        }
        return teams;
      } else {
        const overallStandings = [...standings].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
          return b.goalsFor - a.goalsFor;
        });

        const sliceStart = takenTeamIds.size > 0 ? 0 : (start - 1);
        const sliceEnd = takenTeamIds.size > 0 ? (end - start + 1) : end;
        const rangeTeams = overallStandings.slice(sliceStart, sliceEnd);
        return rangeTeams.map((s, idx) => {
          const pos = start + idx;
          return {
            seasonTeamId: s.teamId,
            qualificationPosition: pos,
            groupName: null,
            seedPosition: idx + 1
          };
        });
      }
    }

    case 'WINNER': {
      const overallStandings = [...standings].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
      });
      const leader = overallStandings[0];
      if (!leader) return [];
      return [{
        seasonTeamId: leader.teamId,
        qualificationPosition: 1,
        groupName: null,
        seedPosition: config.slotNumber || 1
      }];
    }

    case 'RUNNER_UP': {
      const overallStandings = [...standings].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
      });
      const runnerUp = overallStandings[1];
      if (!runnerUp) return [];
      return [{
        seasonTeamId: runnerUp.teamId,
        qualificationPosition: 2,
        groupName: null,
        seedPosition: config.slotNumber || 2
      }];
    }

    case 'GROUP_POSITION': {
      const targetPos = config.position;
      const targetGroups = config.groupNames || [];
      const seedMapping = config.seedMapping || {};

      const groups: Record<string, typeof standings> = {};
      for (const s of standings) {
        const gName = s.groupName || 'Overall';
        if (!groups[gName]) groups[gName] = [];
        groups[gName].push(s);
      }

      const teams: QualifiedTeam[] = [];
      for (const gName of targetGroups) {
        const groupStandings = groups[gName] || [];
        const teamAtPos = groupStandings[targetPos - 1];
        if (teamAtPos) {
          const seed = seedMapping[gName] || (teams.length + 1);
          teams.push({
            seasonTeamId: teamAtPos.teamId,
            qualificationPosition: targetPos,
            groupName: gName,
            seedPosition: seed
          });
        }
      }
      return teams;
    }

    case 'MULTIPLE_POSITIONS_PER_GROUP': {
      const targetPositions = config.positionsPerGroup || [];
      const targetGroups = config.groupNames || [];
      const seedMapping = config.seedMapping || []; // Array matching final order

      const groups: Record<string, typeof standings> = {};
      for (const s of standings) {
        const gName = s.groupName || 'Overall';
        if (!groups[gName]) groups[gName] = [];
        groups[gName].push(s);
      }

      const teams: QualifiedTeam[] = [];
      let mappedIndex = 0;
      for (const pos of targetPositions) {
        for (const gName of targetGroups) {
          const groupStandings = groups[gName] || [];
          const teamAtPos = groupStandings[pos - 1];
          if (teamAtPos) {
            const seed = seedMapping[mappedIndex] || (mappedIndex + 1);
            teams.push({
              seasonTeamId: teamAtPos.teamId,
              qualificationPosition: pos,
              groupName: gName,
              seedPosition: seed
            });
            mappedIndex++;
          }
        }
      }
      return teams;
    }

    default:
      throw new Error(`Unknown link type: ${linkType}`);
  }
}

/**
 * Checks which teams are mathematically guaranteed to qualify under a link's configuration
 */
export async function checkGuaranteedQualifications(
  tournamentId: string,
  linkId: string
): Promise<ConfirmedTeam[]> {
  const link = await prisma.tournament_links.findUnique({
    where: { id: linkId },
    include: { targetTournament: true }
  });
  if (!link) throw new Error('Tournament link not found');

  const config = link.qualificationConfig as any;
  const excludeTeamIds = new Set<string>(config?.excludeTeamIds || []);
  const takenTeamIds = new Set<string>()

  // Resolve sister links of higher priority to exclude their qualified teams
  const sisterLinks = await prisma.tournament_links.findMany({
    where: {
      sourceTournamentId: tournamentId,
      status: 'ACTIVE'
    }
  })

  const currentPriority = getLinkPriority(link.linkType, link.qualificationConfig)
  const higherPriorityLinks = sisterLinks.filter(l => {
    if (l.id === linkId) return false
    const p = getLinkPriority(l.linkType, l.qualificationConfig)
    return p < currentPriority
  })

  for (const hl of higherPriorityLinks) {
    const hlTeams = await getQualifiedTeams(
      tournamentId,
      hl.linkType,
      hl.qualificationConfig,
      hl.id
    )
    for (const t of hlTeams) {
      takenTeamIds.add(t.seasonTeamId)
    }
  }

  const rawStandings = await prisma.standings.findMany({
    where: { tournamentId },
    select: {
      teamId: true,
      groupName: true,
      position: true,
      points: true,
      played: true
    },
    orderBy: [
      { groupName: 'asc' },
      { position: 'asc' },
      { points: 'desc' }
    ]
  });

  const standings = rawStandings.filter(s => {
    if (excludeTeamIds.has(s.teamId)) return false
    if (takenTeamIds.has(s.teamId)) return false
    return true
  });

  const matches = await prisma.matches.findMany({
    where: {
      tournamentId,
      status: { notIn: ['COMPLETED', 'WALKOVER', 'VOID', 'CANCELLED'] }
    },
    select: {
      homeTeamId: true,
      awayTeamId: true
    }
  });

  // Calculate remaining matches per team
  const remainingMatchesMap: Record<string, number> = {};
  for (const s of standings) {
    remainingMatchesMap[s.teamId] = matches.filter(
      m => m.homeTeamId === s.teamId || m.awayTeamId === s.teamId
    ).length;
  }

  // Pre-calculate current points and maximum possible points
  const maxPossiblePoints = standings.map(team => ({
    teamId: team.teamId,
    groupName: team.groupName,
    currentPoints: team.points,
    maxPoints: team.points + (remainingMatchesMap[team.teamId] || 0) * 3,
    currentPosition: team.position || 1
  }));

  const confirmedTeams: ConfirmedTeam[] = [];
  const linkType = link.linkType;

  if (linkType === 'TOP_N') {
    const topN = config.count;
    const groupBy = config.groupBy;

    if (groupBy === 'group') {
      // Group by groupName
      const groups: Record<string, typeof maxPossiblePoints> = {};
      for (const t of maxPossiblePoints) {
        const gName = t.groupName || 'Overall';
        if (!groups[gName]) groups[gName] = [];
        groups[gName].push(t);
      }

      for (const [gName, groupTeams] of Object.entries(groups)) {
        // Sort groupTeams by current standings order
        groupTeams.sort((a, b) => a.currentPosition - b.currentPosition);

        for (let i = 0; i < groupTeams.length; i++) {
          const currentTeam = groupTeams[i];
          const position = i + 1;

          if (position <= topN) {
            // Count how many teams below can overtake them
            const teamsBelow = groupTeams.slice(position);
            const teamsThatCanOvertake = teamsBelow.filter(
              t => t.maxPoints >= currentTeam.currentPoints
            );

            // If position + overtake count is within top N, they are guaranteed
            if (position + teamsThatCanOvertake.length <= topN) {
              confirmedTeams.push({
                seasonTeamId: currentTeam.teamId,
                confirmedPosition: position,
                confirmedAt: new Date()
              });
            }
          }
        }
      }
    } else {
      // Overall
      // Sort maxPossiblePoints by current standings order
      const overallTeams = [...maxPossiblePoints].sort((a, b) => a.currentPosition - b.currentPosition);

      for (let i = 0; i < overallTeams.length; i++) {
        const currentTeam = overallTeams[i];
        const position = i + 1;

        if (position <= topN) {
          const teamsBelow = overallTeams.slice(position);
          const teamsThatCanOvertake = teamsBelow.filter(
            t => t.maxPoints >= currentTeam.currentPoints
          );

          if (position + teamsThatCanOvertake.length <= topN) {
            confirmedTeams.push({
              seasonTeamId: currentTeam.teamId,
              confirmedPosition: position,
              confirmedAt: new Date()
            });
          }
        }
      }
    }
  }

  else if (linkType === 'BOTTOM_N') {
    const bottomN = config.count;
    const groupBy = config.groupBy;

    if (groupBy === 'group') {
      const groups: Record<string, typeof maxPossiblePoints> = {};
      for (const t of maxPossiblePoints) {
        const gName = t.groupName || 'Overall';
        if (!groups[gName]) groups[gName] = [];
        groups[gName].push(t);
      }

      for (const [gName, groupTeams] of Object.entries(groups)) {
        groupTeams.sort((a, b) => a.currentPosition - b.currentPosition);
        const totalTeams = groupTeams.length;
        const relegationThreshold = totalTeams - bottomN + 1; // 1-based rank where bottom N starts

        for (let i = 0; i < groupTeams.length; i++) {
          const currentTeam = groupTeams[i];
          const position = i + 1;

          if (position >= relegationThreshold) {
            // Count how many teams above they CANNOT catch up to
            const teamsAbove = groupTeams.slice(0, position - 1);
            const teamsCannotCatch = teamsAbove.filter(
              t => t.currentPoints > currentTeam.maxPoints
            );

            // If the number of teams they can't catch places them in the bottom N in the best case, they are guaranteed bottom N
            if (teamsCannotCatch.length >= relegationThreshold - 1) {
              confirmedTeams.push({
                seasonTeamId: currentTeam.teamId,
                confirmedPosition: position,
                confirmedAt: new Date()
              });
            }
          }
        }
      }
    } else {
      const overallTeams = [...maxPossiblePoints].sort((a, b) => a.currentPosition - b.currentPosition);
      const totalTeams = overallTeams.length;
      const relegationThreshold = totalTeams - bottomN + 1;

      for (let i = 0; i < overallTeams.length; i++) {
        const currentTeam = overallTeams[i];
        const position = i + 1;

        if (position >= relegationThreshold) {
          const teamsAbove = overallTeams.slice(0, position - 1);
          const teamsCannotCatch = teamsAbove.filter(
            t => t.currentPoints > currentTeam.maxPoints
          );

          if (teamsCannotCatch.length >= relegationThreshold - 1) {
            confirmedTeams.push({
              seasonTeamId: currentTeam.teamId,
              confirmedPosition: position,
              confirmedAt: new Date()
            });
          }
        }
      }
    }
  }

  else if (linkType === 'POSITION_RANGE') {
    const start = config.startPosition;
    const end = config.endPosition;
    const groupBy = config.groupBy;

    if (groupBy === 'group') {
      const groups: Record<string, typeof maxPossiblePoints> = {};
      for (const t of maxPossiblePoints) {
        const gName = t.groupName || 'Overall';
        if (!groups[gName]) groups[gName] = [];
        groups[gName].push(t);
      }

      for (const [gName, groupTeams] of Object.entries(groups)) {
        groupTeams.sort((a, b) => a.currentPosition - b.currentPosition);

        for (let i = 0; i < groupTeams.length; i++) {
          const currentTeam = groupTeams[i];
          const position = i + 1;

          if (position >= start && position <= end) {
            // Cannot escape to rank < start: S >= start - 1
            const teamsAbove = groupTeams.slice(0, position - 1);
            const teamsCannotCatch = teamsAbove.filter(
              t => t.currentPoints > currentTeam.maxPoints
            );
            const isGuaranteedNotToClimb = teamsCannotCatch.length >= start - 1;

            // Cannot drop below end: position + teamsThatCanOvertake <= end
            const teamsBelow = groupTeams.slice(position);
            const teamsThatCanOvertake = teamsBelow.filter(
              t => t.maxPoints >= currentTeam.currentPoints
            );
            const isGuaranteedNotToDrop = position + teamsThatCanOvertake.length <= end;

            if (isGuaranteedNotToClimb && isGuaranteedNotToDrop) {
              confirmedTeams.push({
                seasonTeamId: currentTeam.teamId,
                confirmedPosition: position,
                confirmedAt: new Date()
              });
            }
          }
        }
      }
    } else {
      const overallTeams = [...maxPossiblePoints].sort((a, b) => a.currentPosition - b.currentPosition);

      for (let i = 0; i < overallTeams.length; i++) {
        const currentTeam = overallTeams[i];
        const position = i + 1;

        if (position >= start && position <= end) {
          const teamsAbove = overallTeams.slice(0, position - 1);
          const teamsCannotCatch = teamsAbove.filter(
            t => t.currentPoints > currentTeam.maxPoints
          );
          const isGuaranteedNotToClimb = teamsCannotCatch.length >= start - 1;

          const teamsBelow = overallTeams.slice(position);
          const teamsThatCanOvertake = teamsBelow.filter(
            t => t.maxPoints >= currentTeam.currentPoints
          );
          const isGuaranteedNotToDrop = position + teamsThatCanOvertake.length <= end;

          if (isGuaranteedNotToClimb && isGuaranteedNotToDrop) {
            confirmedTeams.push({
              seasonTeamId: currentTeam.teamId,
              confirmedPosition: position,
              confirmedAt: new Date()
            });
          }
        }
      }
    }
  }

  else if (linkType === 'WINNER') {
    const overallTeams = [...maxPossiblePoints].sort((a, b) => a.currentPosition - b.currentPosition);
    const leader = overallTeams[0];
    const second = overallTeams[1];
    if (leader && (!second || second.maxPoints < leader.currentPoints)) {
      confirmedTeams.push({
        seasonTeamId: leader.teamId,
        confirmedPosition: 1,
        confirmedAt: new Date()
      });
    }
  }

  else if (linkType === 'RUNNER_UP') {
    const overallTeams = [...maxPossiblePoints].sort((a, b) => a.currentPosition - b.currentPosition);
    const leader = overallTeams[0];
    const runnerUp = overallTeams[1];
    const third = overallTeams[2];
    
    if (runnerUp && leader) {
      const isLeaderUnreachable = leader.currentPoints > runnerUp.maxPoints;
      const isThirdUnableToCatch = !third || third.maxPoints < runnerUp.currentPoints;
      
      if (isLeaderUnreachable && isThirdUnableToCatch) {
        confirmedTeams.push({
          seasonTeamId: runnerUp.teamId,
          confirmedPosition: 2,
          confirmedAt: new Date()
        });
      }
    }
  }

  else if (linkType === 'GROUP_POSITION') {
    const targetPos = config.position;
    const targetGroups = config.groupNames || [];

    const groups: Record<string, typeof maxPossiblePoints> = {};
    for (const t of maxPossiblePoints) {
      const gName = t.groupName || 'Overall';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(t);
    }

    for (const gName of targetGroups) {
      const groupTeams = groups[gName] || [];
      groupTeams.sort((a, b) => a.currentPosition - b.currentPosition);
      
      const currentTeam = groupTeams[targetPos - 1];
      if (currentTeam) {
        // Check if guaranteed this position
        // Must be unable to catch targetPos - 1 teams above
        const teamsAbove = groupTeams.slice(0, targetPos - 1);
        const teamsCannotCatch = teamsAbove.filter(
          t => t.currentPoints > currentTeam.maxPoints
        );
        const isGuaranteedNotToClimb = teamsCannotCatch.length >= targetPos - 1;

        // Must not be overtaken by enough teams to drop below targetPos
        const teamsBelow = groupTeams.slice(targetPos);
        const teamsThatCanOvertake = teamsBelow.filter(
          t => t.maxPoints >= currentTeam.currentPoints
        );
        const isGuaranteedNotToDrop = targetPos + teamsThatCanOvertake.length <= targetPos; // i.e. 0 can overtake

        if (isGuaranteedNotToClimb && isGuaranteedNotToDrop) {
          confirmedTeams.push({
            seasonTeamId: currentTeam.teamId,
            confirmedPosition: targetPos,
            confirmedAt: new Date()
          });
        }
      }
    }
  }

  else if (linkType === 'MULTIPLE_POSITIONS_PER_GROUP') {
    const targetPositions = config.positionsPerGroup || [];
    const targetGroups = config.groupNames || [];

    const groups: Record<string, typeof maxPossiblePoints> = {};
    for (const t of maxPossiblePoints) {
      const gName = t.groupName || 'Overall';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(t);
    }

    for (const gName of targetGroups) {
      const groupTeams = groups[gName] || [];
      groupTeams.sort((a, b) => a.currentPosition - b.currentPosition);

      for (const pos of targetPositions) {
        const currentTeam = groupTeams[pos - 1];
        if (currentTeam) {
          const teamsAbove = groupTeams.slice(0, pos - 1);
          const teamsCannotCatch = teamsAbove.filter(
            t => t.currentPoints > currentTeam.maxPoints
          );
          const isGuaranteedNotToClimb = teamsCannotCatch.length >= pos - 1;

          const teamsBelow = groupTeams.slice(pos);
          const teamsThatCanOvertake = teamsBelow.filter(
            t => t.maxPoints >= currentTeam.currentPoints
          );
          const isGuaranteedNotToDrop = pos + teamsThatCanOvertake.length <= Math.max(...targetPositions);

          if (isGuaranteedNotToClimb && isGuaranteedNotToDrop) {
            confirmedTeams.push({
              seasonTeamId: currentTeam.teamId,
              confirmedPosition: pos,
              confirmedAt: new Date()
            });
          }
        }
      }
    }
  }

  return confirmedTeams;
}

/**
 * Evaluates active outgoing links for a tournament, and populates teams who mathematically clinch spots.
 * Called progressively as matches are completed.
 */
export async function checkAndPopulateConfirmedTeams(tournamentId: string) {
  // 1. Get all active outgoing links for this tournament
  const activeLinks = await prisma.tournament_links.findMany({
    where: {
      sourceTournamentId: tournamentId,
      status: 'ACTIVE'
    },
    include: {
      targetTournament: true
    }
  });

  for (const link of activeLinks) {
    try {
      // 2. Check which teams are now mathematically guaranteed
      const confirmedTeams = await checkGuaranteedQualifications(
        tournamentId,
        link.id
      );

      // 3. Get already populated teams
      const alreadyPopulated = await prisma.tournament_team_qualifications.findMany({
        where: { tournamentLinkId: link.id }
      });
      const alreadyPopulatedIds = new Set(alreadyPopulated.map(t => t.seasonTeamId));

      // 4. Filter out teams already populated
      const newlyConfirmed = confirmedTeams.filter(
        t => !alreadyPopulatedIds.has(t.seasonTeamId)
      );

      // 5. Populate newly confirmed teams
      if (newlyConfirmed.length > 0) {
        await populateConfirmedTeams(link, newlyConfirmed);
      }

      // 6. Check if all positions are now filled
      const totalPopulated = alreadyPopulated.length + newlyConfirmed.length;
      
      const config = link.qualificationConfig as any;
      let expectedCount = 0;
      if (link.linkType === 'TOP_N' || link.linkType === 'BOTTOM_N') {
        expectedCount = config.count;
      } else if (link.linkType === 'POSITION_RANGE') {
        expectedCount = config.endPosition - config.startPosition + 1;
      } else if (link.linkType === 'WINNER' || link.linkType === 'RUNNER_UP') {
        expectedCount = 1;
      } else if (link.linkType === 'GROUP_POSITION') {
        expectedCount = (config.groupNames || []).length;
      } else if (link.linkType === 'MULTIPLE_POSITIONS_PER_GROUP') {
        expectedCount = (config.positionsPerGroup || []).length * (config.groupNames || []).length;
      }
      
      const expectedTeams = expectedCount || link.targetTournament.expectedTeams || 0;

      if (totalPopulated >= expectedTeams && expectedTeams > 0) {
        await prisma.tournament_links.update({
          where: { id: link.id },
          data: {
            status: 'COMPLETED',
            teamsPopulated: true,
            populatedAt: new Date()
          }
        });
      }
    } catch (err) {
      console.error(`Error processing link ${link.id}:`, err);
    }
  }
}

/**
 * Populates specific confirmed teams in a target tournament and creates qualification records
 */
async function populateConfirmedTeams(
  link: any,
  confirmedTeams: ConfirmedTeam[]
) {
  const config = link.qualificationConfig as any;

  // Fetch target groups to support auto-grouping
  const targetGroups = await prisma.groups.findMany({
    where: { tournamentId: link.targetTournamentId },
    orderBy: { groupOrder: 'asc' }
  });
  
  for (const team of confirmedTeams) {
    await prisma.$transaction(async (tx) => {
      // Determine slot number based on config or seed mapping
      let slotNumber = team.confirmedPosition;
      
      if (link.linkType === 'TOP_N' && config.seedMapping) {
        slotNumber = config.seedMapping[team.confirmedPosition - 1] || team.confirmedPosition;
      } else if (link.linkType === 'WINNER') {
        slotNumber = config.slotNumber || 1;
      } else if (link.linkType === 'RUNNER_UP') {
        slotNumber = config.slotNumber || 2;
      } else if (link.linkType === 'GROUP_POSITION' && config.seedMapping) {
        // Find group name for this team
        const standing = await tx.standings.findFirst({
          where: { tournamentId: link.sourceTournamentId, teamId: team.seasonTeamId }
        });
        if (standing?.groupName) {
          slotNumber = config.seedMapping[standing.groupName] || slotNumber;
        }
      }

      // Check if qualification record already exists
      const existingQual = await tx.tournament_team_qualifications.findUnique({
        where: {
          tournamentLinkId_seasonTeamId: {
            tournamentLinkId: link.id,
            seasonTeamId: team.seasonTeamId
          }
        }
      });

      if (!existingQual) {
        // Find group name for qualification record
        const standing = await tx.standings.findFirst({
          where: { tournamentId: link.sourceTournamentId, teamId: team.seasonTeamId }
        });

        // Determine target group name based on seed/slot number
        let targetGroupName = standing?.groupName || null;
        if (targetGroups.length > 0) {
          const groupIndex = (slotNumber - 1) % targetGroups.length;
          targetGroupName = targetGroups[groupIndex].name;
        }

        // 1. Create qualification record
        await tx.tournament_team_qualifications.create({
          data: {
            id: crypto.randomUUID(),
            tournamentLinkId: link.id,
            seasonTeamId: team.seasonTeamId,
            sourceTournamentId: link.sourceTournamentId,
            targetTournamentId: link.targetTournamentId,
            qualificationPosition: team.confirmedPosition,
            groupName: targetGroupName,
            confirmedAt: team.confirmedAt,
            slotNumber: slotNumber,
            status: 'CONFIRMED'
          }
        });

        // 2. Add to target tournament (in tournament_teams table)
        await tx.tournament_teams.upsert({
          where: {
            tournamentId_teamId: {
              tournamentId: link.targetTournamentId,
              teamId: team.seasonTeamId
            }
          },
          create: {
            id: crypto.randomUUID(),
            tournamentId: link.targetTournamentId,
            teamId: team.seasonTeamId,
            groupName: targetGroupName,
            seedPosition: slotNumber
          },
          update: {
            groupName: targetGroupName,
            seedPosition: slotNumber
          }
        });

        // 3. Add standing record in target tournament to make them visible in standings & matches
        const existingStanding = await tx.standings.findFirst({
          where: {
            tournamentId: link.targetTournamentId,
            teamId: team.seasonTeamId
          }
        });
        if (!existingStanding) {
          await tx.standings.create({
            data: {
              id: await generateStandingId(),
              tournamentId: link.targetTournamentId,
              teamId: team.seasonTeamId,
              groupName: targetGroupName,
              played: 0,
              won: 0,
              drawn: 0,
              lost: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              goalDiff: 0,
              points: 0,
              updatedAt: new Date()
            }
          });
        } else {
          // Update group name if it changed or was null
          await tx.standings.update({
            where: { id: existingStanding.id },
            data: {
              groupName: targetGroupName,
              updatedAt: new Date()
            }
          });
        }
      }
    });
  }

  // 4. Update target tournament qualificationStatus
  await updateTournamentQualificationStatus(link.targetTournamentId);
}

/**
 * Updates the qualification status on the target tournament based on expected teams count
 */
async function updateTournamentQualificationStatus(tournamentId: string) {
  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    include: {
      incomingLinks: true
    }
  });
  if (!tournament) return;

  const currentTeamsCount = await prisma.tournament_teams.count({
    where: { tournamentId }
  });

  const expectedTeams = tournament.expectedTeams || 0;
  let status: 'PENDING' | 'PARTIAL' | 'COMPLETE' = 'PENDING';

  if (currentTeamsCount === 0) {
    status = 'PENDING';
  } else if (expectedTeams > 0 && currentTeamsCount >= expectedTeams) {
    status = 'COMPLETE';
  } else {
    status = 'PARTIAL';
  }

  await prisma.tournaments.update({
    where: { id: tournamentId },
    data: {
      qualificationStatus: status,
      requiresQualification: tournament.incomingLinks.length > 0
    }
  });
}

/**
 * Performs full/forced team population for a link.
 * Used when source tournament is completed or admin manually triggers population.
 */
export async function populateTournamentLink(
  linkId: string,
  options?: { force?: boolean }
) {
  const link = await prisma.tournament_links.findUnique({
    where: { id: linkId },
    include: {
      sourceTournament: true,
      targetTournament: true
    }
  });
  if (!link) throw new Error('Tournament link not found');

  if (!options?.force && link.sourceTournament.status !== 'COMPLETED') {
    throw new Error('Source tournament is not complete. Use force=true to populate anyway.');
  }

  // 1. Get all qualified teams based on standings
  const qualifiedTeams = await getQualifiedTeams(
    link.sourceTournamentId,
    link.linkType,
    link.qualificationConfig,
    link.id
  );

  // Fetch target groups to support auto-grouping
  const targetGroups = await prisma.groups.findMany({
    where: { tournamentId: link.targetTournamentId },
    orderBy: { groupOrder: 'asc' }
  });

  // Map seasonTeamId -> groupName based on seed position round-robin
  const teamGroupMap = new Map<string, string>();
  if (targetGroups.length > 0) {
    const sortedQualified = [...qualifiedTeams].sort((a, b) => a.seedPosition - b.seedPosition);
    sortedQualified.forEach((t, index) => {
      const groupIndex = index % targetGroups.length;
      teamGroupMap.set(t.seasonTeamId, targetGroups[groupIndex].name);
    });
  }

  // 2. Get already populated teams
  const alreadyPopulated = await prisma.tournament_team_qualifications.findMany({
    where: { tournamentLinkId: link.id }
  });
  const alreadyPopulatedIds = new Set(alreadyPopulated.map(t => t.seasonTeamId));

  // 3. Update any existing CONFIRMED records to FINAL
  await prisma.tournament_team_qualifications.updateMany({
    where: {
      tournamentLinkId: link.id,
      status: 'CONFIRMED'
    },
    data: {
      status: 'FINAL'
    }
  });

  // Filter out already populated
  const newTeams = qualifiedTeams.filter(
    t => !alreadyPopulatedIds.has(t.seasonTeamId)
  );

  // 4. Populate remaining teams
  if (newTeams.length > 0) {
    for (const team of newTeams) {
      const targetGroupName = teamGroupMap.get(team.seasonTeamId) || team.groupName || null;
      await prisma.$transaction(async (tx) => {
        // 1. Create final qualification record
        await tx.tournament_team_qualifications.upsert({
          where: {
            tournamentLinkId_seasonTeamId: {
              tournamentLinkId: link.id,
              seasonTeamId: team.seasonTeamId
            }
          },
          create: {
            id: crypto.randomUUID(),
            tournamentLinkId: link.id,
            seasonTeamId: team.seasonTeamId,
            sourceTournamentId: link.sourceTournamentId,
            targetTournamentId: link.targetTournamentId,
            qualificationPosition: team.qualificationPosition,
            groupName: targetGroupName,
            slotNumber: team.seedPosition,
            status: 'FINAL'
          },
          update: {
            status: 'FINAL',
            qualificationPosition: team.qualificationPosition,
            slotNumber: team.seedPosition,
            groupName: targetGroupName
          }
        });

        // 2. Add team to target tournament
        await tx.tournament_teams.upsert({
          where: {
            tournamentId_teamId: {
              tournamentId: link.targetTournamentId,
              teamId: team.seasonTeamId
            }
          },
          create: {
            id: crypto.randomUUID(),
            tournamentId: link.targetTournamentId,
            teamId: team.seasonTeamId,
            groupName: targetGroupName,
            seedPosition: team.seedPosition
          },
          update: {
            groupName: targetGroupName,
            seedPosition: team.seedPosition
          }
        });

        // 3. Add standings record
        const existingStanding = await tx.standings.findFirst({
          where: {
            tournamentId: link.targetTournamentId,
            teamId: team.seasonTeamId
          }
        });
        if (!existingStanding) {
          await tx.standings.create({
            data: {
              id: await generateStandingId(),
              tournamentId: link.targetTournamentId,
              teamId: team.seasonTeamId,
              groupName: targetGroupName,
              played: 0,
              won: 0,
              drawn: 0,
              lost: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              goalDiff: 0,
              points: 0,
              updatedAt: new Date()
            }
          });
        } else {
          // Update group name if it changed or was null
          await tx.standings.update({
            where: { id: existingStanding.id },
            data: {
              groupName: targetGroupName,
              updatedAt: new Date()
            }
          });
        }
      });
    }
  }

  // 5. Update link as completed
  await prisma.tournament_links.update({
    where: { id: link.id },
    data: {
      status: 'COMPLETED',
      teamsPopulated: true,
      populatedAt: new Date()
    }
  });

  // 6. Update target tournament qualificationStatus
  await updateTournamentQualificationStatus(link.targetTournamentId);

  return {
    success: true,
    alreadyPopulated: alreadyPopulated.length,
    newlyPopulated: newTeams.length,
    total: qualifiedTeams.length
  };
}

/**
 * Removes teams from a target tournament that qualified via the specified link.
 * Allows resetting the target tournament.
 */
export async function clearPopulatedTeams(linkId: string) {
  const link = await prisma.tournament_links.findUnique({
    where: { id: linkId }
  });
  if (!link) throw new Error('Tournament link not found');

  // Delete all standings, tournament_teams, and qualifications for this target tournament/link
  await prisma.$transaction([
    // 1. Delete all standings in the target tournament
    prisma.standings.deleteMany({
      where: { tournamentId: link.targetTournamentId }
    }),
    // 2. Delete all tournament_teams in the target tournament
    prisma.tournament_teams.deleteMany({
      where: { tournamentId: link.targetTournamentId }
    }),
    // 3. Delete all qualification records for this link
    prisma.tournament_team_qualifications.deleteMany({
      where: { tournamentLinkId: linkId }
    })
  ]);

  // 4. Reset link status
  await prisma.tournament_links.update({
    where: { id: linkId },
    data: {
      status: 'ACTIVE',
      teamsPopulated: false,
      populatedAt: null
    }
  });

  // 5. Update target tournament qualificationStatus to PENDING
  await prisma.tournaments.update({
    where: { id: link.targetTournamentId },
    data: {
      qualificationStatus: 'PENDING'
    }
  });

  return {
    success: true
  };
}

/**
 * Helper to check if creating a link between two tournaments creates a circular dependency
 */
export async function checkCircularDependency(
  sourceId: string,
  targetId: string
): Promise<boolean> {
  // If target matches source directly, it's a loop
  if (sourceId === targetId) return true;

  // DFS to search for a path from targetId back to sourceId
  const visited = new Set<string>();
  const queue = [targetId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === sourceId) return true;

    if (!visited.has(current)) {
      visited.add(current);

      // Find all outgoing links from current tournament
      const outgoing = await prisma.tournament_links.findMany({
        where: { sourceTournamentId: current },
        select: { targetTournamentId: true }
      });

      for (const link of outgoing) {
        if (!visited.has(link.targetTournamentId)) {
          queue.push(link.targetTournamentId);
        }
      }
    }
  }

  return false;
}

/**
 * Resolves all match states, updates tournament status (UPCOMING / IN_PROGRESS / COMPLETED),
 * and handles progressive/final qualification populations.
 */
export async function runTournamentStatusUpdate(tournamentId: string): Promise<void> {
  const allMatches = await prisma.matches.findMany({
    where: { tournamentId },
    select: { status: true }
  })
  
  const tournamentBefore = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    select: { status: true, tournamentType: true },
    // Use relation select/include if needed, but wait: let's include knockoutRounds
  })

  if (!tournamentBefore) return

  const knockoutRounds = await prisma.knockout_rounds.findMany({
    where: { tournamentId }
  })

  const hasKnockout = ['KNOCKOUT_ONLY', 'GROUP_KNOCKOUT', 'LEAGUE_PLAYOFF'].includes(tournamentBefore.tournamentType)
  
  let isTournamentFinished = false
  if (hasKnockout) {
    const hasFinalRound = knockoutRounds.some(r => r.roundName === 'FINAL')
    isTournamentFinished = hasFinalRound && allMatches.length > 0 && allMatches.every(
      m => ['COMPLETED', 'WALKOVER', 'VOID', 'CANCELLED'].includes(m.status)
    )
  } else {
    isTournamentFinished = allMatches.length > 0 && allMatches.every(
      m => ['COMPLETED', 'WALKOVER', 'VOID', 'CANCELLED'].includes(m.status)
    )
  }
  
  if (isTournamentFinished) {
    if (tournamentBefore.status !== 'COMPLETED') {
      await prisma.tournaments.update({
        where: { id: tournamentId },
        data: { status: 'COMPLETED', updatedAt: new Date() }
      })
      
      // Auto populate all outgoing links
      const outgoingLinks = await prisma.tournament_links.findMany({
        where: { sourceTournamentId: tournamentId }
      })
      for (const link of outgoingLinks) {
        await populateTournamentLink(link.id).catch((err: any) => 
          console.error(`Failed to auto-populate link ${link.id} on complete:`, err)
        )
      }
    }
  } else {
    // If any match is COMPLETED/LIVE/WALKOVER, update status to IN_PROGRESS (if it is currently UPCOMING)
    if (tournamentBefore && tournamentBefore.status === 'UPCOMING') {
      const hasStarted = allMatches.some(m => ['LIVE', 'COMPLETED', 'WALKOVER'].includes(m.status))
      if (hasStarted) {
        await prisma.tournaments.update({
          where: { id: tournamentId },
          data: { status: 'IN_PROGRESS', updatedAt: new Date() }
        })
      }
    }
    
    // Run progressive confirmation population
    await checkAndPopulateConfirmedTeams(tournamentId)
  }

  // Auto populate knockout pairings on the go
  await resolveAndPopulateKnockoutBracket(tournamentId).catch((err: any) =>
    console.error(`Failed to auto-populate knockout pairings on the go:`, err)
  )
}

/**
 * Dynamically resolves knockout pairing teams from previous stages and auto-advances winners.
 */
export async function resolveAndPopulateKnockoutBracket(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    include: {
      groups: true
    }
  })
  if (!tournament) return

  const rounds = await prisma.knockout_rounds.findMany({
    where: { tournamentId },
    include: { pairings: true },
    orderBy: { roundOrder: 'asc' }
  })

  if (rounds.length === 0) return

  const matches = await prisma.matches.findMany({
    where: { tournamentId }
  })

  // Helper to determine the winner of a matchup between two teams in a specific round
  const getWinnerOfMatchup = (team1Id: string, team2Id: string, roundName: string) => {
    const displayRoundName = roundName.replace(/_/g, ' ')
    const matchupMatches = matches.filter(m => 
      m.round?.toLowerCase() === displayRoundName.toLowerCase() &&
      ((m.homeTeamId === team1Id && m.awayTeamId === team2Id) ||
       (m.homeTeamId === team2Id && m.awayTeamId === team1Id))
    )

    if (matchupMatches.length === 0) return null

    const allCompleted = matchupMatches.every(m => 
      ['COMPLETED', 'WALKOVER', 'VOID'].includes(m.status)
    )
    if (!allCompleted) return null

    if (matchupMatches.length === 1) {
      const match = matchupMatches[0]
      if (match.homeScore === null || match.awayScore === null) return null
      if (match.homeScore > match.awayScore) return match.homeTeamId
      if (match.awayScore > match.homeScore) return match.awayTeamId
      if (match.homePenalty !== null && match.awayPenalty !== null) {
        return match.homePenalty > match.awayPenalty ? match.homeTeamId : match.awayTeamId
      }
      return null
    }

    let team1Score = 0
    let team2Score = 0
    let penaltyWinnerId: string | null = null

    for (const match of matchupMatches) {
      if (match.homeScore === null || match.awayScore === null) return null
      if (match.homeTeamId === team1Id) {
        team1Score += match.homeScore
        team2Score += match.awayScore
      } else {
        team2Score += match.homeScore
        team1Score += match.awayScore
      }
      if (match.homePenalty !== null && match.awayPenalty !== null) {
        penaltyWinnerId = match.homePenalty > match.awayPenalty ? match.homeTeamId : match.awayTeamId
      }
    }

    if (team1Score > team2Score) return team1Id
    if (team2Score > team1Score) return team2Id
    return penaltyWinnerId
  }

  for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
    const round = rounds[rIdx]
    const pairings = round.pairings

    if (rIdx === 0) {
      // First knockout round: check if we need to populate from preceding stage (group or league)
      const hasEmptyPairings = pairings.some(p => p.team1Id === null || p.team2Id === null)
      if (hasEmptyPairings) {
        let precedingTypes: string[] = []
        if (tournament.tournamentType === 'GROUP_KNOCKOUT') {
          precedingTypes = ['GROUP_STAGE']
        } else if (tournament.tournamentType === 'LEAGUE_PLAYOFF') {
          precedingTypes = ['LEAGUE']
        }

        const stageMatches = matches.filter(m => precedingTypes.includes(m.matchType))
        const isStageCompleted = precedingTypes.length === 0 || (
          stageMatches.length > 0 && stageMatches.every(m => 
            ['COMPLETED', 'WALKOVER', 'VOID'].includes(m.status)
          )
        )

        if (isStageCompleted) {
          const standings = await prisma.standings.findMany({
            where: { tournamentId },
            include: {
              seasonTeam: {
                include: { team: true }
              }
            }
          })

          if (standings.length > 0) {
            const groupedStandings: Record<string, any[]> = {}
            standings.forEach(s => {
              const gName = s.groupName || 'Overall'
              if (!groupedStandings[gName]) groupedStandings[gName] = []
              groupedStandings[gName].push(s)
            })

            for (const gName of Object.keys(groupedStandings)) {
              groupedStandings[gName].sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points
                if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
                return b.goalsFor - a.goalsFor
              })
            }

            const mappedTeams = standings.map(s => {
              const gName = s.groupName || 'Overall'
              const groupList = groupedStandings[gName]
              const pos = groupList.findIndex(x => x.id === s.id) + 1
              return {
                id: s.teamId,
                name: s.seasonTeam?.team?.name,
                logoUrl: s.seasonTeam?.team?.logoUrl,
                position: pos,
                groupName: s.groupName
              }
            })

            const resolvedAutoPairs = resolveBackendAutoPairings(round.roundName, mappedTeams, pairings.length * 2, tournament)
            
            for (let i = 0; i < pairings.length; i++) {
              const pair = pairings[i]
              const autoPair = resolvedAutoPairs[i]
              
              const team1Id = pair.team1Id || 
                              resolveTeamFromPlaceholder(pair.team1Placeholder, mappedTeams) || 
                              autoPair?.team1Id
              const team2Id = pair.team2Id || 
                              resolveTeamFromPlaceholder(pair.team2Placeholder, mappedTeams) || 
                              autoPair?.team2Id

              if (team1Id && team2Id) {
                const matchRefs = await ensureMatchesForPairing(
                  prisma,
                  { ...pair, team1Id, team2Id },
                  round.roundName,
                  round.legs,
                  tournamentId
                )

                await prisma.knockout_pairings.update({
                  where: { id: pair.id },
                  data: {
                    team1Id,
                    team2Id,
                    leg1MatchId: matchRefs.leg1MatchId,
                    leg2MatchId: matchRefs.leg2MatchId,
                    updatedAt: new Date()
                  }
                })
                pair.team1Id = team1Id
                pair.team2Id = team2Id
                pair.leg1MatchId = matchRefs.leg1MatchId
                pair.leg2MatchId = matchRefs.leg2MatchId
              }
            }
          }
        }
      } else {
        // If they already have all teams populated (e.g. KNOCKOUT_ONLY manual selection), ensure matches are created
        for (const pair of pairings) {
          if (pair.team1Id && pair.team2Id && !pair.leg1MatchId) {
            const matchRefs = await ensureMatchesForPairing(
              prisma,
              pair,
              round.roundName,
              round.legs,
              tournamentId
            )

            await prisma.knockout_pairings.update({
              where: { id: pair.id },
              data: {
                leg1MatchId: matchRefs.leg1MatchId,
                leg2MatchId: matchRefs.leg2MatchId,
                updatedAt: new Date()
              }
            })
            pair.leg1MatchId = matchRefs.leg1MatchId
            pair.leg2MatchId = matchRefs.leg2MatchId
          }
        }
      }
    } else {
      // Subsequent round: it is fed by the winners of the previous round's pairings
      const prevRound = rounds[rIdx - 1]
      const prevPairings = prevRound.pairings

      for (let i = 0; i < pairings.length; i++) {
        const pair = pairings[i]
        
        const feeder1 = prevPairings[2 * i]
        let team1WinnerId: string | null = null
        if (feeder1 && feeder1.team1Id && feeder1.team2Id) {
          team1WinnerId = getWinnerOfMatchup(feeder1.team1Id, feeder1.team2Id, prevRound.roundName)
        }

        const feeder2 = prevPairings[2 * i + 1]
        let team2WinnerId: string | null = null
        if (feeder2 && feeder2.team1Id && feeder2.team2Id) {
          team2WinnerId = getWinnerOfMatchup(feeder2.team1Id, feeder2.team2Id, prevRound.roundName)
        }

        if (team1WinnerId !== pair.team1Id || team2WinnerId !== pair.team2Id) {
          let matchRefs = { leg1MatchId: pair.leg1MatchId, leg2MatchId: pair.leg2MatchId }
          if (team1WinnerId && team2WinnerId) {
            matchRefs = await ensureMatchesForPairing(
              prisma,
              { ...pair, team1Id: team1WinnerId, team2Id: team2WinnerId },
              round.roundName,
              round.legs,
              tournamentId
            )
          }

          await prisma.knockout_pairings.update({
            where: { id: pair.id },
            data: {
              team1Id: team1WinnerId,
              team2Id: team2WinnerId,
              leg1MatchId: matchRefs.leg1MatchId,
              leg2MatchId: matchRefs.leg2MatchId,
              updatedAt: new Date()
            }
          })
          pair.team1Id = team1WinnerId
          pair.team2Id = team2WinnerId
          pair.leg1MatchId = matchRefs.leg1MatchId
          pair.leg2MatchId = matchRefs.leg2MatchId
        }
      }
    }
  }
}

/**
 * Helper to resolve bracket matchups on the backend
 */
function resolveBackendAutoPairings(roundName: string, availableTeams: any[], requiredTeams: number, tournament: any) {
  const pairings: Array<{ team1Id: string | null; team2Id: string | null }> = []

  const getGroupTeam = (gName: string, pos: number) => {
    return availableTeams.find(
      t => t.groupName === gName && t.position === pos
    ) || null
  }

  const getOverallTeam = (pos: number) => {
    return availableTeams.find(t => t.position === pos) || null
  }

  const groups = tournament.groups || []
  
  if (tournament.tournamentType === 'GROUP_KNOCKOUT') {
    if (requiredTeams === 8) {
      if (groups.length >= 4) {
        const groupA = groups[0]?.name || 'Group A'
        const groupB = groups[1]?.name || 'Group B'
        const groupC = groups[2]?.name || 'Group C'
        const groupD = groups[3]?.name || 'Group D'
        
        const pairs = [
          { t1: { g: groupA, p: 1 }, t2: { g: groupB, p: 2 } },
          { t1: { g: groupC, p: 1 }, t2: { g: groupD, p: 2 } },
          { t1: { g: groupB, p: 1 }, t2: { g: groupA, p: 2 } },
          { t1: { g: groupD, p: 1 }, t2: { g: groupC, p: 2 } },
        ]
        pairs.forEach(p => {
          const t1 = getGroupTeam(p.t1.g, p.t1.p)
          const t2 = getGroupTeam(p.t2.g, p.t2.p)
          pairings.push({ team1Id: t1?.id || null, team2Id: t2?.id || null })
        })
      } else if (groups.length === 2) {
        const groupA = groups[0]?.name || 'Group A'
        const groupB = groups[1]?.name || 'Group B'
        
        const pairs = [
          { t1: { g: groupA, p: 1 }, t2: { g: groupB, p: 4 } },
          { t1: { g: groupA, p: 2 }, t2: { g: groupB, p: 3 } },
          { t1: { g: groupB, p: 2 }, t2: { g: groupA, p: 3 } },
          { t1: { g: groupB, p: 1 }, t2: { g: groupA, p: 4 } },
        ]
        pairs.forEach(p => {
          const t1 = getGroupTeam(p.t1.g, p.t1.p)
          const t2 = getGroupTeam(p.t2.g, p.t2.p)
          pairings.push({ team1Id: t1?.id || null, team2Id: t2?.id || null })
        })
      }
    } else if (requiredTeams === 4) {
      if (groups.length >= 2) {
        const groupA = groups[0]?.name || 'Group A'
        const groupB = groups[1]?.name || 'Group B'
        
        const pairs = [
          { t1: { g: groupA, p: 1 }, t2: { g: groupB, p: 2 } },
          { t1: { g: groupB, p: 1 }, t2: { g: groupA, p: 2 } }
        ]
        pairs.forEach(p => {
          const t1 = getGroupTeam(p.t1.g, p.t1.p)
          const t2 = getGroupTeam(p.t2.g, p.t2.p)
          pairings.push({ team1Id: t1?.id || null, team2Id: t2?.id || null })
        })
      } else if (groups.length >= 4) {
        const groupA = groups[0]?.name || 'Group A'
        const groupB = groups[1]?.name || 'Group B'
        const groupC = groups[2]?.name || 'Group C'
        const groupD = groups[3]?.name || 'Group D'
        
        const pairs = [
          { t1: { g: groupA, p: 1 }, t2: { g: groupB, p: 1 } },
          { t1: { g: groupC, p: 1 }, t2: { g: groupD, p: 1 } }
        ]
        pairs.forEach(p => {
          const t1 = getGroupTeam(p.t1.g, p.t1.p)
          const t2 = getGroupTeam(p.t2.g, p.t2.p)
          pairings.push({ team1Id: t1?.id || null, team2Id: t2?.id || null })
        })
      }
    } else if (requiredTeams === 2) {
      const groupA = groups[0]?.name || 'Group A'
      const groupB = groups[1]?.name || 'Group B'
      const t1 = getGroupTeam(groupA, 1)
      const t2 = getGroupTeam(groupB, 1)
      pairings.push({ team1Id: t1?.id || null, team2Id: t2?.id || null })
    }
  } else if (tournament.tournamentType === 'LEAGUE_PLAYOFF') {
    if (requiredTeams === 4) {
      const pairs = [
        { t1: 1, t2: 4 },
        { t1: 2, t2: 3 }
      ]
      pairs.forEach(p => {
        const t1 = getOverallTeam(p.t1)
        const t2 = getOverallTeam(p.t2)
        pairings.push({ team1Id: t1?.id || null, team2Id: t2?.id || null })
      })
    } else if (requiredTeams === 2) {
      const t1 = getOverallTeam(1)
      const t2 = getOverallTeam(2)
      pairings.push({ team1Id: t1?.id || null, team2Id: t2?.id || null })
    }
  }

  if (pairings.length === 0) {
    for (let i = 0; i < Math.floor(requiredTeams / 2); i++) {
      const p1 = i + 1
      const p2 = requiredTeams - i
      const t1 = getOverallTeam(p1)
      const t2 = getOverallTeam(p2)
      pairings.push({ team1Id: t1?.id || null, team2Id: t2?.id || null })
    }
  }

  return pairings
}

/**
 * Gets placeholder names for auto qualification pairings based on tournament settings and pairing index.
 */
export function getAutoPairingPlaceholders(
  roundName: string,
  pairingIndex: number,
  tournament: any
): { team1Placeholder: string; team2Placeholder: string } {
  const groups = tournament.groups || []
  const roundPairingsCountMap: Record<string, number> = {
    'ROUND_OF_32': 16,
    'ROUND_OF_16': 8,
    'QUARTER_FINAL': 4,
    'SEMI_FINAL': 2,
    'THIRD_PLACE': 1,
    'FINAL': 1
  }
  const requiredTeams = (roundPairingsCountMap[roundName] || 1) * 2

  if (tournament.tournamentType === 'GROUP_KNOCKOUT') {
    if (requiredTeams === 8) {
      if (groups.length >= 4) {
        const groupA = groups[0]?.name || 'Group A'
        const groupB = groups[1]?.name || 'Group B'
        const groupC = groups[2]?.name || 'Group C'
        const groupD = groups[3]?.name || 'Group D'
        
        const pairs = [
          { t1: `${groupA} #1`, t2: `${groupB} #2` },
          { t1: `${groupC} #1`, t2: `${groupD} #2` },
          { t1: `${groupB} #1`, t2: `${groupA} #2` },
          { t1: `${groupD} #1`, t2: `${groupC} #2` },
        ]
        const p = pairs[pairingIndex]
        if (p) return { team1Placeholder: p.t1, team2Placeholder: p.t2 }
      } else if (groups.length === 2) {
        const groupA = groups[0]?.name || 'Group A'
        const groupB = groups[1]?.name || 'Group B'
        
        const pairs = [
          { t1: `${groupA} #1`, t2: `${groupB} #4` },
          { t1: `${groupA} #2`, t2: `${groupB} #3` },
          { t1: `${groupB} #2`, t2: `${groupA} #3` },
          { t1: `${groupB} #1`, t2: `${groupA} #4` },
        ]
        const p = pairs[pairingIndex]
        if (p) return { team1Placeholder: p.t1, team2Placeholder: p.t2 }
      }
    } else if (requiredTeams === 4) {
      if (groups.length >= 2) {
        const groupA = groups[0]?.name || 'Group A'
        const groupB = groups[1]?.name || 'Group B'
        
        const pairs = [
          { t1: `${groupA} #1`, t2: `${groupB} #2` },
          { t1: `${groupB} #1`, t2: `${groupA} #2` }
        ]
        const p = pairs[pairingIndex]
        if (p) return { team1Placeholder: p.t1, team2Placeholder: p.t2 }
      } else if (groups.length >= 4) {
        const groupA = groups[0]?.name || 'Group A'
        const groupB = groups[1]?.name || 'Group B'
        const groupC = groups[2]?.name || 'Group C'
        const groupD = groups[3]?.name || 'Group D'
        
        const pairs = [
          { t1: `${groupA} Winner`, t2: `${groupB} Winner` },
          { t1: `${groupC} Winner`, t2: `${groupD} Winner` }
        ]
        const p = pairs[pairingIndex]
        if (p) return { team1Placeholder: p.t1, team2Placeholder: p.t2 }
      }
    } else if (requiredTeams === 2) {
      const groupA = groups[0]?.name || 'Group A'
      const groupB = groups[1]?.name || 'Group B'
      return { team1Placeholder: `${groupA} Winner`, team2Placeholder: `${groupB} Winner` }
    }
  } else if (tournament.tournamentType === 'LEAGUE_PLAYOFF') {
    if (requiredTeams === 4) {
      const pairs = [
        { t1: `League #1`, t2: `League #4` },
        { t1: `League #2`, t2: `League #3` }
      ]
      const p = pairs[pairingIndex]
      if (p) return { team1Placeholder: p.t1, team2Placeholder: p.t2 }
    } else if (requiredTeams === 2) {
      return { team1Placeholder: `League #1`, team2Placeholder: `League #2` }
    }
  }

  // Fallback / KNOCKOUT_ONLY
  const p1 = pairingIndex + 1
  const p2 = requiredTeams - pairingIndex
  return {
    team1Placeholder: `Seed #${p1}`,
    team2Placeholder: `Seed #${p2}`
  }
}

/**
 * Ensures matches for a knockout pairing exist in the matches table, dynamically updating or creating them.
 */
export async function ensureMatchesForPairing(
  client: any, // prisma or tx
  pairing: { id: string; team1Id: string; team2Id: string; leg1MatchId: string | null; leg2MatchId: string | null },
  roundName: string,
  legs: number,
  tournamentId: string
): Promise<{ leg1MatchId: string; leg2MatchId: string | null }> {
  let leg1MatchId = pairing.leg1MatchId
  let leg2MatchId = pairing.leg2MatchId

  const displayRound = roundName.replace(/_/g, ' ')

  // Ensure Leg 1 match exists
  if (leg1MatchId) {
    // Update existing match
    await client.matches.update({
      where: { id: leg1MatchId },
      data: {
        homeTeamId: pairing.team1Id,
        awayTeamId: pairing.team2Id,
        round: displayRound,
        matchType: roundName,
        updatedAt: new Date()
      }
    })
  } else {
    // Create Leg 1 match
    leg1MatchId = await generateMatchId()
    await client.matches.create({
      data: {
        id: leg1MatchId,
        tournamentId,
        homeTeamId: pairing.team1Id,
        awayTeamId: pairing.team2Id,
        matchDate: new Date(),
        round: displayRound,
        matchType: roundName,
        status: 'SCHEDULED',
        updatedAt: new Date()
      }
    })
  }

  // Ensure Leg 2 match exists or is deleted based on legs count
  if (legs === 2) {
    if (leg2MatchId) {
      // Update existing match (reverse home/away for second leg)
      await client.matches.update({
        where: { id: leg2MatchId },
        data: {
          homeTeamId: pairing.team2Id,
          awayTeamId: pairing.team1Id,
          round: displayRound,
          matchType: roundName,
          updatedAt: new Date()
        }
      })
    } else {
      // Create Leg 2 match
      leg2MatchId = await generateMatchId()
      await client.matches.create({
        data: {
          id: leg2MatchId,
          tournamentId,
          homeTeamId: pairing.team2Id,
          awayTeamId: pairing.team1Id,
          matchDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day after leg 1
          round: displayRound,
          matchType: roundName,
          status: 'SCHEDULED',
          updatedAt: new Date()
        }
      })
    }
  } else {
    // Single leg, if there was a leg2MatchId, delete it
    if (leg2MatchId) {
      await client.matches.delete({
        where: { id: leg2MatchId }
      }).catch(() => {})
      leg2MatchId = null
    }
  }

  return { leg1MatchId, leg2MatchId }
}

/**
 * Resolves a team ID from a placeholder string (e.g. Group A #1 or League #2)
 */
export function resolveTeamFromPlaceholder(placeholder: string | null, availableTeams: any[]): string | null {
  if (!placeholder) return null

  // Format: "Group X #N"
  if (placeholder.startsWith("Group ")) {
    const match = placeholder.match(/^Group\s+(.+?)\s*#(\d+)$/)
    if (match) {
      const groupName = `Group ${match[1]}`
      const pos = parseInt(match[2], 10)
      const team = availableTeams.find(t => t.groupName === groupName && t.position === pos)
      return team?.id || null
    }
  }

  // Format: "League #N"
  if (placeholder.startsWith("League #")) {
    const pos = parseInt(placeholder.substring(8), 10)
    const team = availableTeams.find(t => t.position === pos)
    return team?.id || null
  }

  // Format: "Seed #N"
  if (placeholder.startsWith("Seed #")) {
    const pos = parseInt(placeholder.substring(6), 10)
    const team = availableTeams.find(t => t.position === pos)
    return team?.id || null
  }

  return null
}
