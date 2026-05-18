import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import AdminNavigation from "@/components/AdminNavigationWrapper"
import AdminFooter from "@/components/AdminFooter"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AdminNavigation />
      <main className="pt-24">{children}</main>
      <AdminFooter />
    </div>
  )
}
