import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  const session = await auth()
  const user = session?.user
  const isAdmin = user && (user.role === 'SUPER_ADMIN' || user.role === 'SUB_ADMIN')

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Cyber Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E8A800]/[0.06] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#ff6600]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-7xl mx-auto w-full border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#E8A800]/30 shadow-lg shadow-[#E8A800]/10 bg-black/40">
            <Image
              src="/logo.jpeg"
              alt="TFC Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <span className="font-black tracking-wider text-lg uppercase bg-gradient-to-r from-white via-zinc-200 to-[#E8A800] bg-clip-text text-transparent">
            TFC PORTAL
          </span>
        </div>

        {/* Admin Quick Action */}
        <div>
          {isAdmin ? (
            <Link
              href={user.role === 'SUPER_ADMIN' ? '/super-admin' : '/sub-admin'}
              className="px-4 py-2 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800] text-sm font-semibold hover:bg-[#E8A800]/20 transition-all shadow-sm"
            >
              Go to Admin Panel &rarr;
            </Link>
          ) : (
            <Link
              href="/auth/signin"
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-white/10 hover:text-white transition-all"
            >
              Admin Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 py-12 flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800] text-xs font-bold uppercase tracking-widest mb-8 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-[#E8A800]" />
          Portal Temporarily Closed
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase mb-6 leading-tight">
          Opening <span className="bg-gradient-to-r from-[#E8A800] via-[#FFB800] to-[#FFA000] bg-clip-text text-transparent">Shortly</span>
        </h1>

        {/* Subtitle / Description */}
        <p className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          The public portal and team manager features are temporarily hidden while our administration completes final preparations. We will be back online shortly.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-10 text-left">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm text-zinc-200">Public Matches & Players</h3>
            </div>
            <p className="text-xs text-zinc-400">Public match center, squads, and leaderboards will unlock soon.</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm text-zinc-200">Team Manager Portal</h3>
            </div>
            <p className="text-xs text-zinc-400">Team management, bidding, and squads will resume when the portal opens.</p>
          </div>
        </div>

        {/* Status notice */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <svg className="w-4 h-4 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          Admin team is active. Check back shortly.
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-6 border-t border-white/[0.06] text-center text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} TFC. All rights reserved.
      </footer>
    </div>
  )
}
