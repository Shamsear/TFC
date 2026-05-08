import { SignInForm } from "@/components/auth/SignInForm";
import { Suspense } from "react";

export const metadata = {
  title: "Sign In | Turf Cats",
  description: "Sign in to access the Turf Cats admin dashboard",
};

const ShieldIcon = () => (
  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Gradient Orb */}
            <div className="absolute top-0 left-0 w-72 h-72 xl:w-96 xl:h-96 bg-[#E8A800]/20 rounded-full blur-3xl"></div>
            
            <div className="relative space-y-6 xl:space-y-8">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-20 h-20 xl:w-24 xl:h-24 rounded-2xl xl:rounded-3xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 text-[#E8A800]">
                <ShieldIcon />
              </div>

              {/* Heading */}
              <div>
                <h1 className="text-4xl xl:text-5xl font-black text-white mb-3 xl:mb-4 leading-tight">
                  Welcome Back to
                  <br />
                  <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                    Turf Cats
                  </span>
                </h1>
                <p className="text-lg xl:text-xl text-[#D4CCBB] leading-relaxed">
                  Sign in to manage tournaments, run live auctions, and oversee your eFootball league.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-3 xl:space-y-4 pt-2 xl:pt-4">
                {[
                  "Real-time auction management",
                  "Team and player administration",
                  "Season control and analytics",
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[#D4CCBB] font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Mobile Heading */}
          <div className="text-center lg:hidden mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 text-[#E8A800] mb-3 sm:mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Welcome Back</h1>
            <p className="text-sm sm:text-base text-[#D4CCBB]">Sign in to manage your tournaments</p>
          </div>

          {/* Form Card */}
          <div className="relative">
            {/* Gradient Border Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#E8A800]/20 to-[#FFB347]/20 rounded-2xl sm:rounded-3xl blur-xl"></div>
            
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Sign In</h2>
                <p className="text-[#D4CCBB] text-xs sm:text-sm">Enter your credentials to continue</p>
              </div>

              <Suspense
                fallback={
                  <div className="text-center py-8">
                    <div className="inline-block w-8 h-8 border-4 border-[#E8A800]/30 border-t-[#E8A800] rounded-full animate-spin"></div>
                    <p className="text-[#D4CCBB] mt-4 text-sm">Loading...</p>
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
