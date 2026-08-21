// Stubs for removed news utilities — all no-ops since triggerNews is a no-op
export type NewsEventType = string;

export function getCleanManagerName(name: string | null | undefined): string {
  return name || 'Unknown';
}

export async function getTournamentContext(
  _tournamentId: string,
  _teamId: string,
  _matchId: string
): Promise<any> {
  return null;
}

export function generateContextNarrative(_context: any): string {
  return '';
}

export async function detectMatchScenarios(
  _matchId: string,
  _tournamentId: string,
  _homeTeamId: string,
  _awayTeamId: string,
  _homeScore: number,
  _awayScore: number,
  _round: number,
  _isFirstMatch: boolean,
  _homePenalty?: number,
  _awayPenalty?: number
): Promise<{ eventType: string; metadata?: Record<string, any> } | null> {
  return null;
}
