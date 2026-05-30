"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const MailIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email/username or password");
        setIsLoading(false);
      } else if (result?.ok) {
        // Fetch session to get user role
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        
        // Redirect based on role
        if (session?.user?.role === 'SUPER_ADMIN') {
          router.push('/super-admin');
        } else if (session?.user?.role === 'SUB_ADMIN') {
          router.push('/sub-admin');
        } else if (session?.user?.role === 'TEAM_MANAGER') {
          router.push('/team');
        } else {
          router.push(callbackUrl);
        }
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <AlertIcon />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Email / Username field */}
      <div className="space-y-2">
        <label htmlFor="email" className="block text-xs font-black text-white uppercase tracking-wider font-mono">
          Email or Username
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7A7367]">
            <MailIcon />
          </div>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="block w-full pl-12 pr-4 py-3 bg-black/40 border border-white/5 rounded-2xl text-white text-sm sm:text-base placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#E8A800]/20 focus:border-[#E8A800]/50 hover:border-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            placeholder="Enter username or email"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-xs font-black text-white uppercase tracking-wider font-mono">
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7A7367]">
            <LockIcon />
          </div>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="block w-full pl-12 pr-12 py-3 bg-black/40 border border-white/5 rounded-2xl text-white text-sm sm:text-base placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#E8A800]/20 focus:border-[#E8A800]/50 hover:border-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            placeholder="••••••••"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-[#E8A800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={isLoading}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 sm:py-4 px-6 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:scale-105 active:scale-95 disabled:scale-100 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] disabled:text-gray-500 text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl transition-all duration-300 focus:outline-none shadow-[0_0_15px_rgba(232,168,0,0.15)] hover:shadow-[0_0_20px_rgba(232,168,0,0.35)] flex items-center justify-center gap-2 sm:gap-3 cursor-pointer"
      >
        {isLoading ? (
          <>
            <LoadingSpinner size="sm" />
            <span className="font-black uppercase tracking-wider font-mono">Signing in...</span>
          </>
        ) : (
          "Sign In"
        )}
      </button>

      {/* Footer Links */}
      <div className="pt-2 text-center flex flex-col gap-2">
        <Link
          href="/auth/forgot-password"
          className="text-xs text-[#E8A800] hover:text-[#FFC93A] font-extrabold uppercase tracking-wider font-mono transition-colors"
        >
          Forgot Password?
        </Link>
        <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">
          Protected by secure TFC authentication
        </p>
      </div>
    </form>
  );
}
