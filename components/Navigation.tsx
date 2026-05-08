import Link from "next/link";

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

export default function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative w-11 h-11 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center font-black text-black text-lg shadow-lg">
                TC
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight">Turf Cats</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/teams" className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all font-medium">
              Teams
            </Link>
            <Link href="/players" className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all font-medium">
              Players
            </Link>
          </div>

          {/* Auth Button */}
          <Link
            href="/auth/signin"
            className="px-6 py-2.5 bg-white text-black rounded-xl text-sm font-bold hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
          >
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}
