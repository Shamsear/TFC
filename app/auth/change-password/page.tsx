"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
      <div className="w-full max-w-md">
        <div className="relative">
          {/* Background Gradient Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#E8A800]/20 to-[#FFB347]/20 rounded-2xl sm:rounded-3xl blur-xl"></div>

          <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 text-[#E8A800] mb-3 sm:mb-4">
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 7a2 2 0 012 2m-5 8a2 2 0 01-2-2V9a2 2 0 012-2h3m-3 8h3m-3 0a2 2 0 002 2h3a2 2 0 002-2V9a2 2 0 00-2-2h-3m-6 4h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5"
                  />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Update Password</h1>
              <p className="text-sm text-[#D4CCBB]">
                {success 
                  ? "Password updated! Redirecting to login..." 
                  : "You are logged in with an initial password. Please update it to secure your account."}
              </p>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-12 h-12 border-4 border-[#E8A800] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-yellow-400 font-bold text-center">Logging you out to refresh session...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                {error && (
                  <div className="flex items-start sm:items-center gap-2 p-3 text-xs sm:text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="newPassword" className="block text-xs sm:text-sm font-bold text-white">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent transition-all disabled:opacity-50"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-bold text-white">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent transition-all disabled:opacity-50"
                    placeholder="Repeat new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-[#0a0a0a] text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-[#E8A800]/50 flex items-center justify-center gap-2"
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
