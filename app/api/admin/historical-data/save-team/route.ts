import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateAuditId } from "@/lib/id-generator";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const payload = await req.json();
    const { seasonId, teamId, players = [] } = payload;

    if (!seasonId || !teamId) {
      return NextResponse.json(
        { error: "seasonId and teamId are required" },
        { status: 400 }
      );
    }

    // 1. Verify Season and Team exist
    const [seasonObj, teamObj] = await prisma.$transaction([
      prisma.seasons.findUnique({ where: { id: seasonId } }),
      prisma.teams.findUnique({ where: { id: teamId } }),
    ]);

    if (!seasonObj) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }
    if (!teamObj) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Find the season_team record
    const seasonTeam = await prisma.season_teams.findUnique({
      where: { seasonId_teamId: { seasonId, teamId } },
    });

    if (!seasonTeam) {
      return NextResponse.json(
        { error: "Team is not registered in this season" },
        { status: 404 }
      );
    }

    const totalSpent = players.reduce((sum: number, p: any) => sum + (p.price || 0), 0);
    let startingPurse = seasonObj.startingPurse ?? 20000;
    if (startingPurse === 10000) startingPurse = 20000;
    const currentBudget = startingPurse - totalSpent;

    // 2. Perform Transaction to save roster & update budget
    await prisma.$transaction(async (tx) => {
      // Delete existing transfer history for this team and season
      await tx.transfer_history.deleteMany({
        where: {
          seasonId,
          teamId,
        },
      });

      // Insert new transfer history records
      if (players.length > 0) {
        const transferRecords = players.map((p: any) => ({
          id: crypto.randomUUID(),
          basePlayerId: p.id,
          seasonId,
          teamId,
          seasonTeamId: seasonTeam.id,
          soldPrice: p.price || 0,
          acquisitionType: "historical_import",
          acquisitionNotes: "Imported via Historical Data Wizard (Individual Team Save)",
          status: "ACTIVE" as any,
        }));

        await tx.transfer_history.createMany({
          data: transferRecords,
        });
      }

      // Update team budget
      await tx.season_teams.update({
        where: { id: seasonTeam.id },
        data: {
          currentBudget,
          updatedAt: new Date(),
        },
      });
    });

    // 3. Create Audit Log
    await prisma.audit_logs.create({
      data: {
        id: await generateAuditId(),
        userId: session.user.id,
        userEmail: session.user.email!,
        userRole: session.user.role,
        action: "historical_data_save_team",
        entityType: "teams",
        entityId: teamId,
        entityName: teamObj.name,
        seasonId: seasonId,
        details: `Saved historical squad for team '${teamObj.name}' (${players.length} players, Spent: ${totalSpent}, Budget: ${currentBudget}) in season '${seasonObj.name}'`,
      },
    });

    return NextResponse.json({
      success: true,
      teamId,
      playersCount: players.length,
      currentBudget,
    });
  } catch (error: any) {
    console.error("Error saving team historical squad:", error);
    return NextResponse.json(
      { error: "Failed to save team squad", details: error.message },
      { status: 500 }
    );
  }
}
