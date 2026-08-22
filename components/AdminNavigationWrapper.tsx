import { auth } from "@/lib/auth";
import { getActiveSeasonId } from "@/lib/get-active-season";
import AdminNavigationClient from "./AdminNavigation";

export default async function AdminNavigation() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  // Fetch active season for sub-admin navigation
  let activeSeasonId: string | null = null;
  if (!isSuperAdmin) {
    activeSeasonId = await getActiveSeasonId();
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
