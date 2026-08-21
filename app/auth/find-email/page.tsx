"use client";

import { useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const SearchIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const MailIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    className="w-5 h-5 text-emerald-400 flex-shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

type TeamResult = {
  teamName: string;
  managerName: string;
  logoUrl: string;
  email: string | null;
  userName: string;
};

export default function FindEmailPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<TeamResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setHasSearched(true);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/find-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || "Search failed. Please try again.");
        setResults([]);
      } else {
        setResults(data.teams || []);
        if (data.teams?.length === 0) {
          setError("No teams found matching your search. Try a different name.");
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
      {/* Decorative spotlights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#E8A800]/[0.04] rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#ff6600]/[0.03] rounded-full blur-[100px] pointer-events-none" />

      {/* Grid line overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-[fadeIn_0.5s_ease-out]">
        <div className="relative">
          {/* Glass form card backdrop glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#E8A800]/10 to-[#ff6600]/10 rounded-3xl blur-2xl pointer-events-none" />

          <div className="relative bg-[#0d0d0d]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* Header */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black/40 border border-[#E8A800]/25 text-[#E8A800] shadow-[0_0_20px_rgba(232,168,0,0.15)] mb-4">
                <MailIcon />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 uppercase tracking-wider">
                Find My Email
              </h1>
              <p className="text-xs text-gray-500 font-extrabold uppercase tracking-widest font-mono">
                Look up your login email by team or manager name
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-5 p-4 text-xs sm:text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl font-semibold shadow-[0_0_15px_rgba(239,68,68,0.1)] flex items-center gap-3">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Search Form */}
            <form onSubmit={handleSearch} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="searchQuery"
                  className="block text-xs font-black text-white uppercase tracking-wider font-mono"
                >
                  Team Name or Manager Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7A7367]">
                    <SearchIcon />
                  </div>
                  <input
                    id="searchQuery"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Enter your team or manager name"
                    className="block w-full pl-12 pr-4 py-3 bg-black/40 border border-white/5 rounded-2xl text-white text-sm sm:text-base placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#E8A800]/20 focus:border-[#E8A800]/50 hover:border-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || query.trim().length < 2}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:scale-105 active:scale-95 disabled:scale-100 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] disabled:text-gray-500 text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl transition-all duration-300 shadow-[0_0_15px_rgba(232,168,0,0.15)] hover:shadow-[0_0_20px_rgba(232,168,0,0.35)] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="font-black uppercase tracking-wider font-mono">
                      Searching...
                    </span>
                  </>
                ) : (
                  "Look Up Email"
                )}
              </button>
            </form>

            {/* Results */}
            {hasSearched && results.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider font-mono mb-3">
                  {results.length} team{results.length !== 1 ? "s" : ""} found —
                  verify your team logo below
                </p>

                {results.map((team) => (
                  <div
                    key={`${team.teamName}-${team.managerName}`}
                    className="relative bg-black/40 border border-white/5 rounded-2xl p-4 hover:border-[#E8A800]/20 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      {/* Team Logo */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                        {team.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={team.logoUrl}
                            alt={`${team.teamName} logo`}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <span className="text-2xl font-black text-gray-600">
                            {team.teamName.charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* Team Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider truncate">
                          {team.teamName}
                        </h3>
                        <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider font-mono">
                          Manager: {team.managerName}
                        </p>
                        {team.email && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <CheckCircleIcon />
                            <span className="text-xs sm:text-sm text-[#E8A800] font-bold font-mono">
                              {team.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Back to Sign In */}
            <div className="mt-6 text-center border-t border-white/5 pt-4">
              <Link
                href="/auth/signin"
                className="text-xs text-[#E8A800] hover:text-[#FFC93A] font-extrabold uppercase tracking-wider font-mono transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
