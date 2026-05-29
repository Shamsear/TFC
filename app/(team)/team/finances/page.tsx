import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import FinancesClient from "@/components/team/FinancesClient"

export const metadata = {
  title: "Finances | Team Dashboard",
  description: "View team finances and transactions",
}

export default async function FinancesPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason, seasonTeam } = await checkTeamSeasonParticipation()

  if (!isParticipating || !activeSeason || !seasonTeam) {
    redirect("/team/not-in-season")
  }

  // Get current season team
  const currentSeasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: activeSeason.id,
        teamId: session.user.teamId,
      },
    },
  })

  if (!currentSeasonTeam) {
    redirect("/team/not-in-season")
  }

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
  })

  // Get all transactions
  const transactions = await prisma.financial_ledger.findMany({
    where: {
      seasonTeamId: currentSeasonTeam.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Calculate totals
  const totalSpent = transactions
    .filter((t) => t.transactionType === "PLAYER_PURCHASE")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalEarned = transactions
    .filter((t) => t.transactionType === "PLAYER_SALE")
    .reduce((sum, t) => sum + t.amount, 0)

  const initialData = {
    currentBudget: currentSeasonTeam.currentBudget,
    startingPurse: activeSeason.startingPurse,
    totalSpent,
    totalEarned,
    // Convert Dates to ISO strings for safe client serialization
    transactions: transactions.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString()
    })) as any[]
  }

  return (
    <FinancesClient
      initialData={initialData}
      teamName={team?.name || "My Team"}
      seasonName={activeSeason.name}
    />
  )
}
