import { Suspense } from "react"
import TeamNavigation from "@/components/team/TeamNavigation"
import TeamFooter from "@/components/team/TeamFooter"
import PageLoader from "@/components/ui/PageLoader"
import { isMaintenanceModeActive } from "@/lib/maintenance"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isMaintenance = await isMaintenanceModeActive()
  if (isMaintenance) {
    const session = await auth()
    const role = session?.user?.role
    const isAdmin = role === "SUPER_ADMIN" || role === "SUB_ADMIN"
    if (!isAdmin) {
      redirect("/maintenance")
    }
  }
  return (
    <>
      <TeamNavigation />
      <Suspense fallback={<PageLoader fullScreen={false} />}>
        {children}
      </Suspense>
      <TeamFooter />
    </>
  )
}
