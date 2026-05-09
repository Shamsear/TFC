"use client"

import { useState } from "react"

interface SeasonToggleButtonProps {
  seasonId: string
  seasonName: string
  isActive: boolean
  onToggle: () => void
}

const PowerIcon = ({ isActive }: { isActive: boolean }) => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d={isActive 
        ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        : "M13 10V3L4 14h7v7l9-11h-7z"
      } 
    />
  </svg>
)

export default function SeasonToggleButton({ 
  seasonId, 
  seasonName, 
  isActive, 
  onToggle 
}: SeasonToggleButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    if (isLoading) return

    const confirmMessage = isActive
      ? `Are you sure you want to deactivate "${seasonName}"?`
      : `Are you sure you want to activate "${seasonName}"? This will deactivate all other seasons.`

    if (!confirm(confirmMessage)) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/seasons/${seasonId}/toggle-active`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to toggle season status")
      }

      // Call the parent's onToggle to refresh the page
      onToggle()
    } catch (error) {
      console.error("Failed to toggle season:", error)
      alert(error instanceof Error ? error.message : "Failed to toggle season status")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm
        transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
        ${isActive 
          ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" 
          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
        }
      `}
    >
      <PowerIcon isActive={isActive} />
      {isLoading ? "Processing..." : isActive ? "Deactivate" : "Activate"}
    </button>
  )
}
