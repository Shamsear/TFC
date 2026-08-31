import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import TeamLogo from "@/components/team/TeamLogo"
import { getPhotoUrlFromDb } from "@/lib/image-cdn"
import TiebreakerSection from "@/components/team/TiebreakerSection"
import { getActiveSeason } from "@/lib/get-active-season"
import { calculateLevelFromXP } from "@/lib/achievements-math"
import {
  Users,
  Trophy,
  Gavel,
  ClipboardCheck,
  UserSearch,
  Star,
  UserMinus,
  ShieldCheck,
  ArrowLeftRight,
  Coins,
  Award,
  ChevronRight,
  Zap,
  Timer,
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Swords,
  Handshake,
  CalendarClock,
  CalendarDays,
  Target,
  type LucideIcon,
} from "lucide-react"
import { formatDateIST } from "@/lib/date-ist"

export const metadata = {
  title: "Team Dashboard | Turf Cats",
  description: "Team manager dashboard",
}

/* ── Action menu definition ── */
interface ActionItem {
  label: string
  desc: string
  href: string
  icon: LucideIcon
  color: string
}

const actionSections: { heading: string; items: ActionItem[] }[] = [
  {
    heading: "Squad & Scouting",
    items: [
      { label: "Auction", desc: "Bid on new players", href: "/team/auction", icon: Gavel, color: "text-amber-400" },
      { label: "Planner", desc: "Plan your draft picks", href: "/team/auction-planner", icon: ClipboardCheck, color: "text-sky-400" },
      { label: "Squad", desc: "View your team roster", href: "/team/squad", icon: Users, color: "text-cyan-400" },
      { label: "Players", desc: "Browse the player pool", href: "/team/players", icon: UserSearch, color: "text-emerald-400" },
      { label: "Starred", desc: "Your shortlist of targets", href: "/team/starred", icon: Star, color: "text-yellow-400" },
    ],
  },
  {
    heading: "Transfers",
    items: [
      { label: "Transfers", desc: "Transfer history & status", href: "/team/transfers", icon: Handshake, color: "text-teal-400" },
      { label: "Release", desc: "Request to let a player go", href: "/team/release-request", icon: UserMinus, color: "text-orange-400" },
      { label: "Retention", desc: "Lock in a player", href: "/team/retention-request", icon: ShieldCheck, color: "text-pink-400" },
      { label: "Swap", desc: "Propose a player exchange", href: "/team/swap-request", icon: ArrowLeftRight, color: "text-sky-400" },
    ],
  },
  {
    heading: "Season",
    items: [
      { label: "Matches", desc: "Fixtures & results", href: "/team/matches", icon: Swords, color: "text-violet-400" },
      { label: "Finances", desc: "Budget & ledger", href: "/team/finances", icon: Coins, color: "text-amber-300" },
      { label: "Achievements", desc: "Trophies & badges", href: "/team/achievements", icon: Award, color: "text-purple-400" },
    ],
  },
]

export default async function TeamDashboardPage() {
  const session = await auth()
  if (!session?.user?.teamId) redirect("/auth/signin")

  const teamRaw = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
    include: {
      managerLinks: { where: { isCurrent: true }, include: { manager: true }, take: 1 },
    },
  })
  if (!teamRaw) redirect("/auth/signin")

  const activeSeason = await getActiveSeason()

  const currentSeasonTeamForMgr = activeSeason
    ? await prisma.season_teams.findFirst({
        where: { seasonId: activeSeason.id, teamId: teamRaw.id },
        select: { managerName: true },
      })
    : null
  const resolvedMgrName =
    currentSeasonTeamForMgr?.managerName ||
    teamRaw.managerLinks[0]?.manager?.name ||
    teamRaw.managerName
  const team = { ...teamRaw, managerName: resolvedMgrName }

  let managerXP = teamRaw.xp
  let managerLevel = teamRaw.level
  if (resolvedMgrName) {
    const mgrTeamIds = await prisma.season_teams.findMany({
      where: { managerName: { equals: resolvedMgrName, mode: "insensitive" } },
      select: { teamId: true },
      distinct: ["teamId"],
    })
    const allMgrTeams = await prisma.teams.findMany({
      where: { id: { in: mgrTeamIds.map((t) => t.teamId) } },
      select: { xp: true, level: true },
    })
    managerXP = allMgrTeams.reduce((sum, t) => sum + t.xp, 0)
    managerLevel = calculateLevelFromXP(managerXP)
  }

  const currentSeasonTeam = activeSeason
    ? await prisma.season_teams.findUnique({
        where: { seasonId_teamId: { seasonId: activeSeason.id, teamId: team.id } },
      })
    : null

  if (!currentSeasonTeam || !activeSeason) redirect("/team/not-in-season")

  const [
    allTimeTrophies,
    squadCount,
    upcomingMatches,
    recentTransactions,
    activeRounds,
    activeBulkTiebreakers,
    pendingBulkTiebreakers,
    activeNormalTiebreakers,
    pendingNormalTiebreakers,
    squadPlayers,
    teamSquad,
  ] = await Promise.all([
    prisma.season_teams.aggregate({ where: { teamId: team.id }, _sum: { trophiesWon: true } }),
    prisma.transfer_history.count({ where: { seasonId: activeSeason.id, teamId: team.id, status: "ACTIVE" } }),
    prisma.matches.findMany({
      where: {
        tournament: { seasonId: activeSeason.id },
        OR: [{ homeTeamId: currentSeasonTeam.id }, { awayTeamId: currentSeasonTeam.id }],
        status: "SCHEDULED",
      },
      include: {
        homeTeam: { select: { id: true, team: { select: { id: true, name: true, logoUrl: true } } } },
        awayTeam: { select: { id: true, team: { select: { id: true, name: true, logoUrl: true } } } },
        tournament: { select: { id: true, name: true } },
      },
      orderBy: { matchDate: "asc" },
      take: 4,
    }),
    prisma.financial_ledger.findMany({ where: { seasonTeamId: currentSeasonTeam.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.rounds.findMany({
      where: { seasonId: activeSeason.id, status: "active", endTime: { gte: new Date() } },
      select: {
        id: true, roundNumber: true, position: true, position_group: true, roundType: true, endTime: true,
        teamRoundBids: { where: { teamId: team.id }, select: { submitted: true, bidCount: true } },
        bulkRoundSelections: { where: { teamId: team.id }, select: { submitted: true } },
      },
      orderBy: { endTime: "asc" },
      take: 3,
    }),
    prisma.bulk_tiebreakers.findMany({
      where: { round: { seasonId: activeSeason.id }, status: "active", participants: { some: { teamId: team.id, status: "active" } } },
      include: { basePlayer: { select: { id: true, name: true } }, round: { select: { id: true, roundNumber: true } }, participants: { where: { status: "active" }, select: { teamId: true } } },
    }),
    prisma.bulk_tiebreakers.findMany({
      where: { round: { seasonId: activeSeason.id }, status: "pending", participants: { some: { teamId: team.id, status: "active" } } },
      include: { basePlayer: { select: { id: true, name: true } }, round: { select: { id: true, roundNumber: true } }, participants: { where: { status: "active" }, select: { teamId: true } } },
    }),
    prisma.tiebreakers.findMany({
      where: { round: { seasonId: activeSeason.id }, status: "active", teamTiebreakerBids: { some: { teamId: team.id } } },
      include: {
        basePlayer: { select: { id: true, name: true, photoUrl: true } },
        round: { select: { id: true, roundNumber: true } },
        teamTiebreakerBids: { where: { teamId: team.id }, select: { submitted: true, oldBidAmount: true, newBidAmount: true } },
      },
    }),
    prisma.tiebreakers.findMany({
      where: { round: { seasonId: activeSeason.id }, status: "pending", teamTiebreakerBids: { some: { teamId: team.id } } },
      include: {
        basePlayer: { select: { id: true, name: true, photoUrl: true } },
        round: { select: { id: true, roundNumber: true } },
        teamTiebreakerBids: { select: { teamId: true } },
      },
    }),
    prisma.transfer_history.findMany({
      where: { seasonId: activeSeason.id, teamId: team.id, status: "ACTIVE" },
      include: {
        basePlayer: {
          select: {
            id: true, player_id: true, name: true, photoUrl: true,
            seasonalPlayerStats: { where: { seasonId: activeSeason.id }, select: { position: true, position_group: true, overallRating: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.team_squads.findUnique({
      where: { team_id_season_id: { team_id: team.id, season_id: activeSeason.id } },
    }),
  ])

  const totalAllTimeTrophies = allTimeTrophies._sum.trophiesWon || 0

  const pendingBulkTiebreakerTeamIds = pendingBulkTiebreakers.flatMap((t) => t.participants.map((p) => p.teamId))
  const pendingNormalTiebreakerTeamIds = pendingNormalTiebreakers.flatMap((t) => t.teamTiebreakerBids.map((b) => b.teamId))
  const allTiebreakerTeamIds = [...new Set([...pendingBulkTiebreakerTeamIds, ...pendingNormalTiebreakerTeamIds])]

  const tiebreakerTeams =
    allTiebreakerTeamIds.length > 0
      ? await prisma.teams.findMany({ where: { id: { in: allTiebreakerTeamIds } }, select: { id: true, name: true, logoUrl: true } })
      : []

  const pendingBulkTiebreakersWithTeams = pendingBulkTiebreakers.map((t) => ({
    ...t,
    participants: t.participants.map((p) => ({ ...p, team: tiebreakerTeams.find((tm) => tm.id === p.teamId) })),
  }))
  const pendingNormalTiebreakersWithTeams = pendingNormalTiebreakers.map((t) => ({
    ...t,
    teamTiebreakerBids: t.teamTiebreakerBids.map((b) => ({ ...b, team: tiebreakerTeams.find((tm) => tm.id === b.teamId) })),
  }))

  const budgetPct = activeSeason.startingPurse > 0
    ? Math.round((currentSeasonTeam.currentBudget / activeSeason.startingPurse) * 100)
    : 0

  const nextMatch = upcomingMatches[0] || null

  return (
    <div className="min-h-screen bg-[#08080A] text-white pt-14 sm:pt-16 md:pt-20" style={{ colorScheme: "dark" }}>
      {/* ── AMBIENT GLOW ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[300px] sm:h-[500px] rounded-full blur-[120px] sm:blur-[160px] opacity-[0.06]"
          style={{
            background: `radial-gradient(ellipse, rgba(232,168,0,${Math.min(0.15 + managerLevel * 0.01, 0.5)}) 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* ── HERO ── */}
      <section className="relative z-10 border-b border-white/[0.04] bg-black/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 py-3 sm:py-4 md:py-5">
            {/* Logo */}
            <TeamLogo logoUrl={team.logoUrl} teamName={team.name} size="lg" />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="dash-hero font-black leading-tight text-wrap-balance">
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent">
                  {team.name}
                </span>
              </h1>
              <p className="text-[#8A8690] dash-body font-semibold mt-0.5 truncate">
                {team.managerName}
              </p>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-[#E8A800]/[0.08] border border-[#E8A800]/15 rounded-lg dash-caption font-bold text-white/80">
                <CalendarClock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#E8A800] shrink-0" />
                <span className="hidden sm:inline">{activeSeason.name}</span>
                <span className="sm:hidden">{activeSeason.name.split(" ").pop()}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1.5 bg-purple-500/[0.08] border border-purple-500/15 rounded-lg dash-caption font-bold">
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400 shrink-0" />
                <span className="text-purple-300">Lv.{managerLevel}</span>
                <span className="text-white/30 hidden md:inline">{managerXP} XP</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── GOLD SEPARATOR ── */}
      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-[#E8A800]/25 to-transparent" aria-hidden="true" />

      {/* ── STATS STRIP ── */}
      <section className="relative z-10 border-b border-white/[0.04] bg-[#0A0A0C]/80 backdrop-blur-sm" aria-label="Team statistics">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3">
            {/* Budget — prominent on mobile */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-1 flex items-center gap-2.5 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-white/[0.02] border border-emerald-500/15 sm:border-white/[0.04] lg:border-white/[0.04]">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CircleDollarSign className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-emerald-400" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1.5">
                  <span className="dash-caption text-[#5A5660] font-bold uppercase tracking-wider">Budget</span>
                  <span className="dash-stat-sm font-black text-emerald-400 tabular-nums">
                    £{currentSeasonTeam.currentBudget.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-1.5" role="progressbar" aria-valuenow={budgetPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${budgetPct}% of budget remaining`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500/60 to-emerald-400/40 transition-all duration-500"
                    style={{ width: `${Math.min(budgetPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Squad */}
            <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-cyan-400" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1">
                  <span className="dash-stat-sm font-black text-cyan-400 tabular-nums">{squadCount}</span>
                  <span className="dash-caption text-[#5A5660] font-bold uppercase tracking-wider">Players</span>
                </div>
                <Link
                  href="/team/squad"
                  className="dash-caption text-[#E8A800] font-bold hover:underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[#E8A800] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A] rounded"
                >
                  View squad →
                </Link>
              </div>
            </div>

            {/* Next match */}
            <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <Swords className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-violet-400" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                {nextMatch ? (
                  <>
                    <div className="dash-body font-black text-violet-300 truncate">
                      {nextMatch.homeTeam.team.id === currentSeasonTeam.id
                        ? `vs ${nextMatch.awayTeam.team.name}`
                        : `vs ${nextMatch.homeTeam.team.name}`}
                    </div>
                    <div className="dash-caption text-[#5A5660] font-bold tabular-nums">
                      {formatDateIST(nextMatch.matchDate)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="dash-body font-black text-[#3A3A3A]">—</div>
                    <div className="dash-caption text-[#3A3A3A] font-bold">No matches</div>
                  </>
                )}
              </div>
            </div>

            {/* Trophies */}
            <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#E8A800]/10 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#E8A800]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="dash-stat-sm font-black text-[#E8A800] tabular-nums">
                  {currentSeasonTeam.trophiesWon}
                  {totalAllTimeTrophies > 0 && (
                    <span className="dash-caption text-purple-400 font-bold ml-1">({totalAllTimeTrophies})</span>
                  )}
                </div>
                <div className="dash-caption text-[#5A5660] font-bold uppercase tracking-wider">Trophies</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
        {/* Urgent Alerts */}
        <TiebreakerSection
          activeNormalTiebreakers={activeNormalTiebreakers}
          activeBulkTiebreakers={activeBulkTiebreakers}
          pendingNormalTiebreakers={pendingNormalTiebreakersWithTeams}
          pendingBulkTiebreakers={pendingBulkTiebreakersWithTeams}
        />

        {/* Active Auction Rounds */}
        {activeRounds.length > 0 && (
          <section className="mb-4 sm:mb-5 md:mb-6" aria-label="Active auction rounds">
            <div className="rounded-xl sm:rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-3 sm:p-4 md:p-5">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                  <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-black animate-pulse" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="dash-h3 font-black text-white">
                    Auction Active
                    {activeRounds.length > 1 && <span className="text-amber-300/60"> ({activeRounds.length})</span>}
                  </h2>
                  <p className="dash-caption text-amber-200/40 font-medium">Place your bids before time runs out</p>
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                {activeRounds.map((round) => {
                  const teamBid = round.teamRoundBids[0]
                  const timeRemaining = round.endTime ? new Date(round.endTime).getTime() - Date.now() : 0
                  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
                  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
                  const isUrgent = hoursRemaining < 2
                  const roundPath = round.roundType === "bulk" ? `/team/auction/bulk-rounds/${round.id}` : `/team/auction/rounds/${round.id}`
                  const isSubmitted = round.roundType === "bulk" ? round.bulkRoundSelections[0]?.submitted : teamBid?.submitted
                  const bidCount = teamBid?.bidCount

                  return (
                    <Link
                      key={round.id}
                      href={roundPath}
                      className="flex items-center gap-2.5 sm:gap-3 bg-black/30 border border-white/[0.08] rounded-lg p-2.5 sm:p-3 hover:border-amber-400/30 hover:bg-black/40 transition-all group touch-min focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
                          <span className="dash-body font-black text-white">Round {round.roundNumber}</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 dash-caption font-bold border border-emerald-500/25 uppercase tracking-wider">Live</span>
                          <span className="dash-caption text-[#5A5660] font-medium">
                            {round.roundType === "normal" ? "Standard" : "Bulk"}
                            {" · "}
                            {round.position ? `${round.position}${round.position_group && round.position_group !== "ALL" ? ` ${round.position_group}` : ""}` : "All"}
                          </span>
                        </div>
                        {isSubmitted ? (
                          <span className="dash-caption text-emerald-400 font-bold">✓ Submitted{bidCount ? ` (${bidCount})` : ""}</span>
                        ) : bidCount ? (
                          <span className="dash-caption text-amber-400 font-bold">In Progress ({bidCount})</span>
                        ) : (
                          <span className="dash-caption text-red-400 font-bold">No bids placed</span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`dash-body font-black tabular-nums ${isUrgent ? "text-red-400" : "text-amber-300"}`}>
                          {hoursRemaining > 0 && `${hoursRemaining}h `}{minutesRemaining}m
                        </div>
                        <div className="dash-caption text-[#5A5660] font-medium">remaining</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#3A3A3A] group-hover:text-amber-400 transition-colors shrink-0" aria-hidden="true" />
                    </Link>
                  )
                })}
              </div>
              <Link
                href="/team/auction"
                className="mt-2.5 sm:mt-3 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black dash-body font-black uppercase tracking-wider transition-colors touch-min focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A]"
              >
                View All Rounds <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-4 sm:gap-5">
          {/* LEFT: Main feed */}
          <div className="space-y-4 sm:space-y-5 min-w-0">
            {/* Upcoming Matches */}
            <Card
              icon={<Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" />}
              iconBg="bg-violet-500/10"
              title="Upcoming Matches"
              action={upcomingMatches.length > 0 ? { label: "View All", href: "/team/matches" } : undefined}
            >
              {upcomingMatches.length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {upcomingMatches.map((match) => {
                    const isHome = match.homeTeam.team.id === currentSeasonTeam.id
                    const opponent = isHome ? match.awayTeam.team : match.homeTeam.team
                    return (
                      <Link
                        key={match.id}
                        href={`/team/matches/${match.id}`}
                        className="flex items-center gap-2 sm:gap-2.5 md:gap-3 bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5 sm:p-3 hover:border-violet-500/25 hover:bg-white/[0.03] transition-all touch-min focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A]"
                      >
                        <div className="shrink-0 text-center w-9 sm:w-10 md:w-12">
                          <div className="dash-small font-black text-white tabular-nums">
                            {formatDateIST(match.matchDate)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 text-center">
                          <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2">
                            <span className="dash-small font-bold text-[#8A8690] truncate max-w-[70px] sm:max-w-[80px]">{team.name}</span>
                            <span className="dash-caption text-[#3A3A3A] font-black uppercase px-0.5">{isHome ? "H" : "A"}</span>
                            <span className="dash-caption text-[#3A3A3A] font-black">vs</span>
                            <span className="dash-small font-bold text-white truncate max-w-[70px] sm:max-w-[80px]">{opponent.name}</span>
                          </div>
                          <div className="dash-caption text-[#3A3A3A] font-medium mt-0.5 truncate">{match.tournament.name}</div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#3A3A3A] shrink-0" aria-hidden="true" />
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <EmptyState icon={<CalendarDays className="w-6 h-6 sm:w-7 sm:h-7" />} text="No upcoming matches" />
              )}
            </Card>

            {/* Recent Transactions */}
            <Card
              icon={<TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />}
              iconBg="bg-emerald-500/10"
              title="Recent Transactions"
              action={recentTransactions.length > 0 ? { label: "View All", href: "/team/finances" } : undefined}
            >
              {recentTransactions.length > 0 ? (
                <div className="space-y-0.5 sm:space-y-1">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-2 sm:gap-2.5 md:gap-3 px-2 sm:px-2.5 md:px-3 py-2 sm:py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                      <div className={`shrink-0 ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`} aria-hidden="true">
                        {tx.amount >= 0 ? <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <span className="dash-small font-bold text-white uppercase tracking-wider truncate">
                            {tx.transactionType.replace(/_/g, " ")}
                          </span>
                          {tx.playerName && (
                            <span className="dash-caption text-[#E8A800] font-bold truncate">· {tx.playerName}</span>
                          )}
                        </div>
                        <div className="dash-caption text-[#5A5660] truncate">{tx.description}</div>
                      </div>
                      <span className={`dash-small font-black tabular-nums shrink-0 ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {tx.amount >= 0 ? "+" : ""}£{Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Coins className="w-6 h-6 sm:w-7 sm:h-7" />} text="No transactions yet" />
              )}
            </Card>

            {/* Squad preview */}
            <Card
              icon={<Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />}
              iconBg="bg-cyan-500/10"
              title="Your Squad"
              action={squadPlayers.length > 0 ? { label: "Full Roster", href: "/team/squad" } : undefined}
            >
              <SquadPreview squadPlayers={squadPlayers} />
            </Card>
          </div>

          {/* RIGHT: Action sidebar */}
          <aside className="space-y-4 sm:space-y-5">
            {/* Achievements CTA */}
            <Link
              href="/team/achievements"
              className="flex items-center gap-3 p-3 sm:p-3.5 md:p-4 rounded-xl bg-gradient-to-r from-[#E8A800]/10 to-amber-500/[0.06] border border-[#E8A800]/20 hover:border-[#E8A800]/35 transition-all group touch-min focus-visible:ring-2 focus-visible:ring-[#E8A800] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A]"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#E8A800]/15 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-[#E8A800]" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="dash-body font-black text-white group-hover:text-[#FFB347] transition-colors">Achievements Cabinet</div>
                <div className="dash-caption text-[#5A5660] font-medium">View trophies & badges earned</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#3A3A3A] group-hover:text-[#E8A800] transition-colors shrink-0" aria-hidden="true" />
            </Link>

            {/* Action menu */}
            <nav className="rounded-xl bg-[#0E0E11]/90 border border-white/[0.04] overflow-hidden" aria-label="Quick actions">
              {actionSections.map((section) => (
                <div key={section.heading}>
                  <div className="px-3 sm:px-3.5 md:px-4 pt-2.5 sm:pt-3 pb-1">
                    <h3 className="dash-caption font-black text-[#3A3A3A] uppercase tracking-[0.15em]">{section.heading}</h3>
                  </div>
                  <div className="px-1 pb-1">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-2 sm:gap-2.5 md:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group touch-min focus-visible:ring-2 focus-visible:ring-[#E8A800] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A]"
                        >
                          <Icon className={`w-4 h-4 ${item.color} shrink-0`} aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <span className="dash-small font-bold text-[#8A8690] group-hover:text-white transition-colors">
                              {item.label}
                            </span>
                            <span className="dash-caption text-[#3A3A3A] ml-1.5 hidden sm:inline">
                              {item.desc}
                            </span>
                          </div>
                          <ChevronRight className="w-3 h-3 text-[#2A2A32] group-hover:text-[#5A5660] transition-colors shrink-0" aria-hidden="true" />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      </main>
    </div>
  )
}

/* ── Card wrapper ── */
function Card({
  icon,
  iconBg,
  title,
  action,
  children,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  action?: { label: string; href: string }
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl sm:rounded-2xl bg-[#0E0E11]/90 border border-white/[0.04] overflow-hidden">
      <div className="flex items-center justify-between px-3 sm:px-3.5 md:px-4 py-2.5 sm:py-3 border-b border-white/[0.03]">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md ${iconBg} flex items-center justify-center`} aria-hidden="true">
            {icon}
          </div>
          <h2 className="dash-small font-black text-[#8A8690] uppercase tracking-wider">{title}</h2>
        </div>
        {action && (
          <Link
            href={action.href}
            className="dash-caption text-[#E8A800] hover:text-[#FFC93A] font-black uppercase tracking-wider inline-flex items-center gap-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#E8A800] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A] rounded"
          >
            {action.label} <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="p-2.5 sm:p-3 md:p-4">{children}</div>
    </section>
  )
}

/* ── Empty state ── */
function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-5 sm:py-6 md:py-8">
      <div className="text-[#2A2A32] mx-auto mb-2 flex justify-center" aria-hidden="true">{icon}</div>
      <p className="text-[#5A5660] dash-body font-semibold">{text}</p>
    </div>
  )
}

/* ── Squad preview ── */
function SquadPreview({ squadPlayers }: { squadPlayers: any[] }) {
  const getPositionColor = (pos: string) => {
    const u = pos?.toUpperCase()
    if (u === "GK") return "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
    if (["CB", "LB", "RB"].includes(u)) return "bg-blue-500/10 border-blue-500/25 text-blue-400"
    if (["DMF", "CMF", "LMF", "RMF"].includes(u)) return "bg-green-500/10 border-green-500/25 text-green-400"
    if (u === "AMF") return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
    if (u === "SS") return "bg-orange-500/10 border-orange-500/25 text-orange-400"
    if (["LWF", "RWF", "CF"].includes(u)) return "bg-red-500/10 border-red-500/25 text-red-400"
    return "bg-gray-500/10 border-gray-500/25 text-gray-400"
  }

  if (squadPlayers.length === 0) {
    return (
      <div className="text-center py-4 sm:py-5">
        <Users className="w-6 h-6 sm:w-7 sm:h-7 text-[#2A2A32] mx-auto mb-2" aria-hidden="true" />
        <p className="text-[#5A5660] dash-body font-semibold mb-0.5">No players yet</p>
        <p className="text-[#3A3A3A] dash-caption">
          Head to{" "}
          <Link href="/team/auction" className="text-[#E8A800] hover:underline focus-visible:ring-2 focus-visible:ring-[#E8A800] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A] rounded">
            Auction
          </Link>{" "}
          to start building.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {squadPlayers.slice(0, 6).map((player: any) => {
        const stats = player.basePlayer.seasonalPlayerStats[0]
        const position = stats?.position || "N/A"
        const positionGroup = stats?.position_group
        const rating = stats?.overallRating || 0
        return (
          <Link
            key={player.id}
            href={`/team/players/${player.basePlayer.id}`}
            className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group touch-min focus-visible:ring-2 focus-visible:ring-[#E8A800] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A]"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md overflow-hidden bg-white/5 border border-white/[0.08] shrink-0">
              {player.basePlayer.photoUrl ? (
                <img src={getPhotoUrlFromDb(player.basePlayer.photoUrl)} alt="" className="w-full h-full object-cover" loading="lazy" width={32} height={32} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#3A3A3A]">
                  <UserSearch className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="dash-small font-bold text-[#8A8690] truncate group-hover:text-white transition-colors">{player.basePlayer.name}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`inline-flex px-1 py-0.5 rounded border text-[7px] sm:text-[8px] font-extrabold uppercase tracking-wider ${getPositionColor(position)}`}>
                  {positionGroup && positionGroup !== "ALL" ? `${position}·${positionGroup}` : position}
                </span>
                <span className="text-[7px] sm:text-[8px] font-bold text-amber-400 tabular-nums">★ {rating}</span>
              </div>
            </div>
            <span className="dash-small font-black text-emerald-400 tabular-nums">£{player.soldPrice.toLocaleString()}</span>
          </Link>
        )
      })}
      {squadPlayers.length > 6 && (
        <Link
          href="/team/squad"
          className="block text-center py-2 dash-caption text-[#E8A800] font-bold hover:underline focus-visible:ring-2 focus-visible:ring-[#E8A800] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A] rounded"
        >
          +{squadPlayers.length - 6} more players
        </Link>
      )}
    </div>
  )
}
