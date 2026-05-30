import { SignInForm } from "@/components/auth/SignInForm";
import { Suspense } from "react";

export const metadata = {
  title: "Sign In | Turf Cats",
  description: "Sign in to access the Turf Cats admin dashboard",
};

const ShieldIcon = () => (
  <svg className="w-10 h-10 xl:w-12 xl:h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
      {/* Decorative Brand Spotlights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#E8A800]/[0.04] rounded-full blur-[140px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#ff6600]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      {/* Cyber Grid Lines Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 gap-12 sm:gap-16 items-center">
        {/* Left Side - Premium Branding Card */}
        <div className="hidden lg:block space-y-8 animate-[fadeIn_0.5s_ease-out]">
          <div className="relative space-y-6 xl:space-y-8">
            {/* Shield emblem */}
            <div className="inline-flex items-center justify-center w-20 h-20 xl:w-24 xl:h-24 rounded-2xl xl:rounded-3xl bg-black/40 border border-[#E8A800]/20 text-[#E8A800] shadow-[0_0_25px_rgba(232,168,0,0.15)] relative overflow-hidden backdrop-blur-md group hover:border-[#E8A800]/40 transition-all duration-300">
              <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-b from-[#E8A800]/10 to-transparent rounded-full blur-lg" />
              <ShieldIcon />
            </div>

            {/* Main Header */}
            <div>
              <h1 className="text-4xl xl:text-6xl font-black text-white mb-4 xl:mb-5 leading-tight tracking-tight select-none">
                WELCOME BACK TO
                <br />
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(232,168,0,0.1)]">
                  TURF CATS
                </span>
              </h1>
              <p className="text-base xl:text-lg text-gray-400 font-semibold leading-relaxed max-w-lg">
                Access your personalized workspace to configure real-time tournament tables, execute live auction bids, and manage rosters.
              </p>
            </div>

            {/* Premium features list */}
            <div className="space-y-4 pt-4 border-t border-white/5 max-w-md">
              {[
                { title: "REAL-TIME AUCTIONS", desc: "Bid, negotiate, and assign player lists instantly." },
                { title: "LEAGUE STANDINGS", desc: "Oversee tournament match fixtures and tables." },
                { title: "SQUAD & ROSTERS", desc: "Audit starting 11 formations and budgets." },
              ].map((feat, index) => (
                <div key={index} className="flex gap-4 items-start group">
                  <div className="w-5 h-5 rounded-full bg-[#E8A800]/10 border border-[#E8A800]/25 flex items-center justify-center flex-shrink-0 mt-1 shadow-[0_0_8px_rgba(232,168,0,0.1)]">
                    <svg className="w-3.5 h-3.5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-xs font-black text-[#E8A800] tracking-wider uppercase font-mono mb-0.5">{feat.title}</span>
                    <span className="text-sm text-gray-400 font-semibold">{feat.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Custom Glassmorphic Card & Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0 animate-[fadeIn_0.6s_ease-out]">
          {/* Mobile Welcome Title */}
          <div className="text-center lg:hidden mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black/40 border border-[#E8A800]/25 text-[#E8A800] shadow-[0_0_20px_rgba(232,168,0,0.15)] mb-4">
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 leading-none uppercase tracking-wide">
              WELCOME BACK
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 font-semibold uppercase tracking-wider font-mono">
              Sign in to manage your eFootball league
            </p>
          </div>

          {/* Glass Form Card */}
          <div className="relative">
            {/* Outer blur glow backdrop */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#E8A800]/10 to-[#ff6600]/10 rounded-3xl blur-2xl pointer-events-none" />
            
            <div className="relative bg-[#0d0d0d]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
              <div className="mb-6 relative pb-4 border-b border-white/5">
                {/* Visual decorative line */}
                <div className="absolute bottom-0 left-0 w-12 h-[2px] bg-[#E8A800]" />
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-1">
                  SIGN IN
                </h2>
                <p className="text-gray-500 text-[10px] sm:text-xs font-black uppercase tracking-widest font-mono">
                  Enter your credentials to continue
                </p>
              </div>

              <Suspense
                fallback={
                  <div className="text-center py-12 flex flex-col items-center justify-center">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-[#E8A800]/20 border-t-[#E8A800] animate-spin" />
                      <div className="w-1.5 h-1.5 bg-[#E8A800] rounded-full shadow-[0_0_8px_#E8A800]" />
                    </div>
                    <p className="text-gray-400 mt-4 text-xs font-black uppercase tracking-widest font-mono">Loading form...</p>
                  </div>
                }
              >
                <SignInForm />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
