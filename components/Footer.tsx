import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-16 mt-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center font-black text-black text-base shadow-lg">
              TC
            </div>
            <div>
              <div className="text-white font-bold">Turf Cats</div>
              <div className="text-gray-500 text-sm">© 2026 All rights reserved</div>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/teams" className="text-gray-400 hover:text-white transition-colors font-medium">
              Teams
            </Link>
            <Link href="/players" className="text-gray-400 hover:text-white transition-colors font-medium">
              Players
            </Link>
            <Link href="/auth/signin" className="text-gray-400 hover:text-white transition-colors font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
