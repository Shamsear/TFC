import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import AdminNavigation from "@/components/AdminNavigationWrapper"
import AdminFooter from "@/components/AdminFooter"
import PageLoader from "@/components/ui/PageLoader"

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
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-x-hidden w-full max-w-full">
      {/* Decorative Cyber Spotlights */}
      <div className="absolute top-0 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#E8A800]/[0.03] rounded-full blur-[100px] pointer-events-none -translate-y-1/2 overflow-hidden" />
      <div className="absolute top-1/3 right-0 w-[250px] sm:w-[450px] h-[250px] sm:h-[450px] bg-[#ff6600]/[0.02] rounded-full blur-[90px] pointer-events-none overflow-hidden" />
      <div className="absolute bottom-1/4 left-0 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-[#E8A800]/[0.02] rounded-full blur-[90px] pointer-events-none overflow-hidden" />

      <AdminNavigation />
      <main className="relative pt-22 w-full max-w-full min-w-0 overflow-x-hidden">
        <Suspense fallback={<PageLoader fullScreen={false} />}>
          {children}
        </Suspense>
      </main>
      <AdminFooter />
    </div>
  )
}
