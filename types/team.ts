export interface Team {
  id: string
  name: string
  managerName: string
  logoUrl: string
  xp: number
  level: number
  createdAt: Date
  updatedAt: Date
}

export interface Player {
  id: string
  name: string
  player_id: string // rsID or system ID
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  club: string
  rating: number
  playingStyle?: string | null
}

export interface Match {
  id: string
  matchDate: Date | string
  startDate?: Date | string | null
  round: string | null
  homeTeam: {
    id: string
    team: {
      name: string
      logoUrl?: string
    }
  }
  awayTeam: {
    id: string
    team: {
      name: string
      logoUrl?: string
    }
  }
  tournament: {
    id: string
    name: string
  }
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED'
  homeScore: number | null
  awayScore: number | null
}

export interface Retention {
  id: string
  seasonId: string
  basePlayerId: string
  retainedFromSeasonId: string
  createdAt: Date
  basePlayer: Player
}

export interface FinancialTransaction {
  id: string
  seasonTeamId: string
  seasonId: string
  transactionType: 'INITIAL_PURSE' | 'PLAYER_PURCHASE' | 'PLAYER_SALE' | 'ADJUSTMENT' | 'REFUND'
  amount: number
  previousBalance: number
  newBalance: number
  description: string
  playerName?: string | null
  createdAt: Date
}

export interface NotificationItem {
  id: string
  userId: string
  title: string
  body: string
  category: string
  url?: string | null
  entityId?: string | null
  entityType?: string | null
  isRead: boolean
  createdAt: Date | string
}
