import Image from 'next/image'
import Link from 'next/link'

export default function TeamFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0a]/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/team" className="flex items-center gap-3 mb-4">
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
                  Team Manager
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
              <Link href="/team" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                Dashboard
              </Link>
              <Link href="/team/squad" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                Squad
              </Link>
              <Link href="/team/matches" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                Matches
              </Link>
              <Link href="/team/tournaments" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                Tournaments
              </Link>
              <Link href="/team/finances" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                Finances
              </Link>
              <Link href="/team/profile" className="text-[#D4CCBB] hover:text-[#E8A800] transition-colors text-sm">
                Profile
              </Link>
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
