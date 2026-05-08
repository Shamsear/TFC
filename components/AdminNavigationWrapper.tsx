import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminNavigationClient from "./AdminNavigation";

export default async function AdminNavigation() {
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
    <AdminNavigationClient
      user={{
        name: session?.user?.name,
        email: session?.user?.email,
        role: session?.user?.role,
      }}
      isSuperAdmin={isSuperAdmin}
      activeSeasonId={activeSeasonId}
    />
  );
}
