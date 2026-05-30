"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const LockKeyIcon = () => (
  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 7a2 2 0 012 2m-5 8a2 2 0 01-2-2V9a2 2 0 012-2h3m-3 8h3m-3 0a2 2 0 002 2h3a2 2 0 002-2V9a2 2 0 00-2-2h-3m-6 4h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5"
    />
  </svg>
);

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setSuccess(true);
      
      // Log the user out so they can log back in with their new password and fresh JWT session
      setTimeout(async () => {
        await signOut({ callbackUrl: "/auth/signin?changed=true" });
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
      {/* Decorative Brand Spotlights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#E8A800]/[0.04] rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#ff6600]/[0.03] rounded-full blur-[100px] pointer-events-none" />

      {/* Cyber Grid Lines Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-[fadeIn_0.5s_ease-out]">
        <div className="relative">
          {/* Glass form card backdrop glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#E8A800]/10 to-[#ff6600]/10 rounded-3xl blur-2xl pointer-events-none" />

          <div className="relative bg-[#0d0d0d]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black/40 border border-[#E8A800]/25 text-[#E8A800] shadow-[0_0_20px_rgba(232,168,0,0.15)] mb-4">
                <LockKeyIcon />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 uppercase tracking-wider">Update Password</h1>
              <p className="text-xs text-gray-500 font-extrabold uppercase tracking-widest font-mono leading-relaxed">
                {success 
                  ? "Password updated! Redirecting..." 
                  : "Update your initial password to secure your TFC account"}
              </p>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative w-12 h-12 flex items-center justify-center mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-[#E8A800]/20 border-t-[#E8A800] animate-spin" />
                  <div className="w-1.5 h-1.5 bg-[#E8A800] rounded-full shadow-[0_0_8px_#E8A800]" />
                </div>
                <p className="text-[#FFB347] font-black text-xs uppercase tracking-widest font-mono text-center">Logging out to refresh session...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-4 text-xs sm:text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl shadow-[0_0_15px_rgba(239,68,68,0.1)] flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-semibold">{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="newPassword" className="block text-xs font-black text-white uppercase tracking-wider font-mono">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                      <svg className="w-5 h-5 text-[#7A7367]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="block w-full pl-12 pr-12 py-3 bg-black/40 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8A800]/20 focus:border-[#E8A800]/50 hover:border-white/10 transition-all font-semibold"
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-[#E8A800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      disabled={isLoading}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-xs font-black text-white uppercase tracking-wider font-mono">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                      <svg className="w-5 h-5 text-[#7A7367]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="block w-full pl-12 pr-12 py-3 bg-black/40 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8A800]/20 focus:border-[#E8A800]/50 hover:border-white/10 transition-all font-semibold"
                      placeholder="Repeat new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#E8A800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      disabled={isLoading}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:scale-105 active:scale-95 disabled:scale-100 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl transition-all duration-300 shadow-[0_0_15px_rgba(232,168,0,0.15)] hover:shadow-[0_0_20px_rgba(232,168,0,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading && <LoadingSpinner size="sm" />}
                  {isLoading ? "Saving password..." : "Change Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
