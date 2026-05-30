"use client";

import { useState } from "react";
import Link from "next/link";
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

const LockOutlineIcon = () => (
  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const UserCheckIcon = () => (
  <svg className="w-5 h-5 text-[#7A7367]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

type StatusType = "none" | "pending" | "approved" | "declined" | "completed";

export default function ForgotPasswordPage() {
  const [identity, setIdentity] = useState("");
  const [activeTab, setActiveTab] = useState<"request" | "status">("request");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Status check states
  const [currentStatus, setCurrentStatus] = useState<StatusType>("none");
  const [requestId, setRequestId] = useState("");
  const [teamName, setTeamName] = useState("");
  
  // Password reset states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setSuccessMessage(data.message);
      if (data.status) {
        setCurrentStatus(data.status);
        setRequestId(data.requestId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check status");
      }

      setCurrentStatus(data.status);
      setRequestId(data.requestId || "");
      setTeamName(data.teamName || "");

      if (data.status === "approved") {
        setSuccessMessage("Your request is approved! Enter your new password below to reset it.");
      } else if (data.status === "pending") {
        setSuccessMessage("Your reset request is pending Super Admin approval. Please check back later.");
      } else if (data.status === "declined") {
        setError("Your reset request was declined by the Super Admin.");
      } else if (data.status === "completed") {
        setSuccessMessage("Your password was reset successfully using this request.");
      } else {
        setSuccessMessage(data.message || "No requests found.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setCurrentStatus("none");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsResetting(true);

    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccessMessage("Password reset successfully! You can now sign in.");
      setCurrentStatus("completed");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsResetting(false);
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
          backgroundSize: '80px 80px',
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
                <LockOutlineIcon />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 uppercase tracking-wider">Forgot Password</h1>
              <p className="text-xs text-gray-500 font-extrabold uppercase tracking-widest font-mono">Request admin approval to reset</p>
            </div>

            {/* Tab selector pills */}
            {currentStatus !== "approved" && (
              <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-2xl mb-6 border border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("request");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    activeTab === "request"
                      ? "bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black shadow-lg"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("status");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    activeTab === "status"
                      ? "bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black shadow-lg"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Check Status
                </button>
              </div>
            )}

            {/* Notifications */}
            {error && (
              <div className="mb-5 p-4 text-xs sm:text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl font-semibold shadow-[0_0_15px_rgba(239,68,68,0.1)] flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-5 p-4 text-xs sm:text-sm text-[#FFB347] bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-2xl font-semibold shadow-[0_0_15px_rgba(232,168,0,0.1)] flex items-center gap-3 animate-pulse">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Forms Handler */}
            {currentStatus === "approved" ? (
              /* Password Reset Form */
              <form onSubmit={handlePasswordResetSubmit} className="space-y-5">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs sm:text-sm font-semibold text-center shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  Approved for Team: <span className="font-bold text-white">{teamName}</span>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="newPass" className="block text-xs font-black text-white uppercase tracking-wider font-mono">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                      <svg className="w-5 h-5 text-[#7A7367]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="newPass"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={isResetting}
                      placeholder="Minimum 6 characters"
                      className="block w-full pl-12 pr-12 py-3 bg-black/40 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8A800]/20 focus:border-[#E8A800]/50 hover:border-white/10 transition-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-[#E8A800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      disabled={isResetting}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPass" className="block text-xs font-black text-white uppercase tracking-wider font-mono">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                      <svg className="w-5 h-5 text-[#7A7367]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="confirmPass"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isResetting}
                      placeholder="Repeat new password"
                      className="block w-full pl-12 pr-12 py-3 bg-black/40 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8A800]/20 focus:border-[#E8A800]/50 hover:border-white/10 transition-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-[#E8A800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      disabled={isResetting}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:scale-105 active:scale-95 disabled:scale-100 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl transition-all duration-300 shadow-[0_0_15px_rgba(232,168,0,0.15)] hover:shadow-[0_0_20px_rgba(232,168,0,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isResetting && <LoadingSpinner size="sm" />}
                  {isResetting ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            ) : activeTab === "request" ? (
              /* Request Reset Form */
              <form onSubmit={handleRequestSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="reqIdentity" className="block text-xs font-black text-white uppercase tracking-wider font-mono">
                    Team Name, Email, or Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <UserCheckIcon />
                    </div>
                    <input
                      id="reqIdentity"
                      type="text"
                      value={identity}
                      onChange={(e) => setIdentity(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Enter team name or username"
                      className="block w-full pl-12 pr-4 py-3 bg-black/40 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8A800]/20 focus:border-[#E8A800]/50 hover:border-white/10 transition-all font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:scale-105 active:scale-95 disabled:scale-100 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl transition-all duration-300 shadow-[0_0_15px_rgba(232,168,0,0.15)] hover:shadow-[0_0_20px_rgba(232,168,0,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading && <LoadingSpinner size="sm" />}
                  {isLoading ? "Submitting..." : "Submit Reset Request"}
                </button>
              </form>
            ) : (
              /* Check Status Form */
              <form onSubmit={handleStatusCheck} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="statusIdentity" className="block text-xs font-black text-white uppercase tracking-wider font-mono">
                    Team Name, Email, or Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <UserCheckIcon />
                    </div>
                    <input
                      id="statusIdentity"
                      type="text"
                      value={identity}
                      onChange={(e) => setIdentity(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Enter team name or username"
                      className="block w-full pl-12 pr-4 py-3 bg-black/40 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#E8A800]/20 focus:border-[#E8A800]/50 hover:border-white/10 transition-all font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:scale-105 active:scale-95 disabled:scale-100 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl transition-all duration-300 shadow-[0_0_15px_rgba(232,168,0,0.15)] hover:shadow-[0_0_20px_rgba(232,168,0,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading && <LoadingSpinner size="sm" />}
                  {isLoading ? "Checking..." : "Check Status"}
                </button>
              </form>
            )}

            {/* Back to Sign In Link */}
            <div className="mt-6 text-center border-t border-white/5 pt-4">
              <Link href="/auth/signin" className="text-xs text-[#E8A800] hover:text-[#FFC93A] font-extrabold uppercase tracking-wider font-mono transition-colors">
                Back to Sign In
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
