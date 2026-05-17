import Image from 'next/image'
import Link from 'next/link'
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    <footer className="border-t border-white/10 bg-[#0a0a0a]/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href={isSuperAdmin ? "/super-admin" : "/sub-admin"} className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-[#E8A800]/20">
                <Image
                  src="/logo.jpeg"
                  alt="Turf Cats"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <div className="text-xl font-black bg-gradient-to-r from-[#FFC93A] to-[#E8A800] bg-clip-text text-transparent">
                  Turf Cats
                </div>
                <div className="text-xs text-[#7A7367] font-medium">
                  {isSuperAdmin ? "Super Admin" : "Sub Admin"}
                </div>
              </div>
            </Link>
            <p className="text-[#D4CCBB] leading-relaxed max-w-md">
              The premier eFootball tournament management platform. Build your dynasty through strategic auctions, player retention, and real-time team management.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-[#F5F0E8] font-bold mb-4">Quick Links</h3>
            <nav className="flex flex-col gap-3">
              {isSuperAdmin ? (
                <>
                  <Link href="/super-admin" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                    Dashboard
                  </Link>
                  <Link href="/super-admin/teams" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                    Teams
                  </Link>
                  <Link href="/super-admin/seasons" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                    Seasons
                  </Link>
                  <Link href="/super-admin/sub-admins" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                    Sub Admins
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/sub-admin" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                    Dashboard
                  </Link>
                  <Link href="/sub-admin/import" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                    Import
                  </Link>
                  <Link href="/teams" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                    Teams
                  </Link>
                  {activeSeasonId && (
                    <Link href={`/sub-admin/${activeSeasonId}/all-players`} className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                      Players
                    </Link>
                  )}
                  {activeSeasonId && (
                    <Link href={`/sub-admin/${activeSeasonId}/calendar`} className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                      Calendar
                    </Link>
                  )}
                  <Link href="/tournaments" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                    Tournaments
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[#7A7367] text-sm">
            © {new Date().getFullYear()} Turf Cats. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-[#7A7367] hover:text-[#E8A800] transition-colors text-sm">
              Privacy Policy
            </Link>
            <Link href="#" className="text-[#7A7367] hover:text-[#E8A800] transition-colors text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
