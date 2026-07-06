import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminFooterClient from "./AdminFooterClient";

export default async function AdminFooter() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  // Fetch active season for sub-admin navigation
  let activeSeasonId: string | null = null;
  if (!isSuperAdmin) {
    const activeSeason = await prisma.seasons.findFirst({
      where: { isActive: true },
      select: { id: true }
    });
    activeSeasonId = activeSeason?.id || null;
  }

  return (
    <AdminFooterClient
      isSuperAdmin={isSuperAdmin}
      activeSeasonId={activeSeasonId}
    />
  );
}
