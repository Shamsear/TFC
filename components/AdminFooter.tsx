import { auth } from "@/lib/auth";
import { getActiveSeasonId } from "@/lib/get-active-season";
import AdminFooterClient from "./AdminFooterClient";

export default async function AdminFooter() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  // Fetch active season for sub-admin navigation
  let activeSeasonId: string | null = null;
  if (!isSuperAdmin) {
    activeSeasonId = await getActiveSeasonId();
  }

  return (
    <AdminFooterClient
      isSuperAdmin={isSuperAdmin}
      activeSeasonId={activeSeasonId}
    />
  );
}
