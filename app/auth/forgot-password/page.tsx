"use client";

import { useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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
    <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
      <div className="w-full max-w-md">
        <div className="relative">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#E8A800]/20 to-[#FFB347]/20 rounded-2xl sm:rounded-3xl blur-xl"></div>

          <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl">
            
            {/* Header */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 text-[#E8A800] mb-3 sm:mb-4">
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Forgot Password</h1>
              <p className="text-sm text-[#D4CCBB]">Request admin approval to reset password</p>
            </div>

            {/* Tabs */}
            {currentStatus !== "approved" && (
              <div className="grid grid-cols-2 gap-2 bg-[#0a0a0a]/50 p-1 rounded-xl mb-6 border border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("request");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className={`py-2 text-sm font-bold rounded-lg transition-all ${
                    activeTab === "request"
                      ? "bg-[#E8A800] text-[#0a0a0a]"
                      : "text-[#D4CCBB] hover:text-white"
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
                  className={`py-2 text-sm font-bold rounded-lg transition-all ${
                    activeTab === "status"
                      ? "bg-[#E8A800] text-[#0a0a0a]"
                      : "text-[#D4CCBB] hover:text-white"
                  }`}
                >
                  Check Status
                </button>
              </div>
            )}

            {/* Error & Success Messages */}
            {error && (
              <div className="mb-4 p-3 text-xs sm:text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg font-semibold">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 text-xs sm:text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg font-semibold">
                {successMessage}
              </div>
            )}

            {/* Main Forms */}
            {currentStatus === "approved" ? (
              /* Password Reset Form (when approved) */
              <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs sm:text-sm mb-4 font-semibold text-center">
                  Request Approved for Team: <span className="font-bold text-white">{teamName}</span>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="newPass" className="block text-xs sm:text-sm font-bold text-white">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPass"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={isResetting}
                      placeholder="Minimum 6 characters"
                      className="block w-full px-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#E8A800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isResetting}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPass" className="block text-xs sm:text-sm font-bold text-white">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPass"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isResetting}
                      placeholder="Repeat new password"
                      className="block w-full px-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#E8A800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-[#0a0a0a] text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-[#E8A800]/50 flex items-center justify-center gap-2"
                >
                  {isResetting && <LoadingSpinner size="sm" />}
                  {isResetting ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            ) : activeTab === "request" ? (
              /* Request Reset Form */
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="reqIdentity" className="block text-xs sm:text-sm font-bold text-white">
                    Team Name, Email, or Username
                  </label>
                  <input
                    id="reqIdentity"
                    type="text"
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Enter your team name or username"
                    className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-[#E8A800] hover:bg-[#FFC93A] disabled:bg-gray-600 disabled:cursor-not-allowed text-[#0a0a0a] text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-[#E8A800]/50 flex items-center justify-center gap-2"
                >
                  {isLoading && <LoadingSpinner size="sm" />}
                  {isLoading ? "Submitting..." : "Submit Reset Request"}
                </button>
              </form>
            ) : (
              /* Check Status Form */
              <form onSubmit={handleStatusCheck} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="statusIdentity" className="block text-xs sm:text-sm font-bold text-white">
                    Team Name, Email, or Username
                  </label>
                  <input
                    id="statusIdentity"
                    type="text"
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Enter your team name or username"
                    className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-[#E8A800] hover:bg-[#FFC93A] disabled:bg-gray-600 disabled:cursor-not-allowed text-[#0a0a0a] text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-[#E8A800]/50 flex items-center justify-center gap-2"
                >
                  {isLoading && <LoadingSpinner size="sm" />}
                  {isLoading ? "Checking..." : "Check Status"}
                </button>
              </form>
            )}

            {/* Back to Sign In Link */}
            <div className="mt-6 text-center border-t border-white/10 pt-4">
              <Link href="/auth/signin" className="text-sm font-bold text-[#E8A800] hover:text-[#FFC93A] transition-colors">
                Back to Sign In
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
