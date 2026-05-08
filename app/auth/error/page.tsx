"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification token has expired or has already been used.",
    OAuthSignin: "Error in constructing an authorization URL.",
    OAuthCallback: "Error in handling the response from the OAuth provider.",
    OAuthCreateAccount: "Could not create OAuth provider user in the database.",
    EmailCreateAccount: "Could not create email provider user in the database.",
    Callback: "Error in the OAuth callback handler route.",
    OAuthAccountNotLinked: "The email on the account is already linked, but not with this OAuth account.",
    EmailSignin: "Sending the email with the verification token failed.",
    CredentialsSignin: "Invalid email or password. Please check your credentials and try again.",
    SessionRequired: "Please sign in to access this page.",
    Default: "An unexpected error occurred. Please try again."
  }

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 sm:px-6 py-8">
      <div className="w-full max-w-md">
        <div className="relative">
          {/* Gradient Border Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-2xl sm:rounded-3xl blur-xl"></div>
          
          <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl mb-3 sm:mb-4">
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Authentication Error
              </h1>
              <p className="text-sm sm:text-base text-[#D4CCBB] leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/auth/signin"
                className="block w-full py-3 sm:py-3.5 px-4 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all text-center focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:ring-offset-2 focus:ring-offset-transparent hover:scale-105 shadow-lg hover:shadow-[#E8A800]/50"
              >
                Back to Sign In
              </Link>
              <Link
                href="/"
                className="block w-full py-3 sm:py-3.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all text-center focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-transparent"
              >
                Go to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-[#E8A800]/30 border-t-[#E8A800] rounded-full animate-spin"></div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
