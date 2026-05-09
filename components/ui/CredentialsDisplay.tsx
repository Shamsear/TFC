"use client"

import { useState } from "react"

interface CredentialsDisplayProps {
  email: string
  password: string
  teamName: string
  onClose: () => void
}

export default function CredentialsDisplay({
  email,
  password,
  teamName,
  onClose,
}: CredentialsDisplayProps) {
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const copyToClipboard = async (text: string, type: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "email") {
        setCopiedEmail(true)
        setTimeout(() => setCopiedEmail(false), 2000)
      } else {
        setCopiedPassword(true)
        setTimeout(() => setCopiedPassword(false), 2000)
      }
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const copyAll = async () => {
    const text = `Team: ${teamName}\nEmail: ${email}\nPassword: ${password}`
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 max-w-lg w-full shadow-2xl">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Team Created Successfully!
        </h2>
        <p className="text-gray-400 text-center mb-6">
          Save these login credentials. They won't be shown again.
        </p>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-yellow-400 font-medium text-sm">
                Important: Save these credentials now
              </p>
              <p className="text-yellow-400/80 text-xs mt-1">
                You won't be able to see the password again after closing this dialog.
              </p>
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="space-y-4 mb-6">
          {/* Team Name */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Team Name</label>
            <div className="bg-black/30 border border-white/10 rounded-lg px-4 py-3">
              <p className="text-white font-medium">{teamName}</p>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Email</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3">
                <p className="text-white font-mono">{email}</p>
              </div>
              <button
                onClick={() => copyToClipboard(email, "email")}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-colors"
                title="Copy email"
              >
                {copiedEmail ? (
                  <svg
                    className="w-5 h-5 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Password</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3">
                <p className="text-white font-mono text-lg tracking-wider">{password}</p>
              </div>
              <button
                onClick={() => copyToClipboard(password, "password")}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-colors"
                title="Copy password"
              >
                {copiedPassword ? (
                  <svg
                    className="w-5 h-5 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={copyAll}
            className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium rounded-lg transition-colors"
          >
            Copy All Credentials
          </button>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-black font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
