"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/ToastProvider"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import SearchableSelect from "@/components/ui/SearchableSelect"

interface Team {
  id: string
  name: string
  managerName: string
}

interface CreateTeamManagerFormProps {
  teams: Team[]
  assignedTeamIds: string[]
  preselectedTeamId?: string
}

export default function CreateTeamManagerForm({
  teams,
  assignedTeamIds,
  preselectedTeamId,
}: CreateTeamManagerFormProps) {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    teamId: preselectedTeamId || "",
  })

  const availableTeams = teams.filter(
    (team) => !assignedTeamIds.includes(team.id)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/team-managers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create team manager")
      }

      toast.success("Team manager created successfully!")
      router.push("/super-admin/team-managers")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-white font-medium mb-2">
            Manager Name
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/50"
            placeholder="Enter manager name"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-white font-medium mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/50"
            placeholder="manager@example.com"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-white font-medium mb-2"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            required
            minLength={6}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/50"
            placeholder="Minimum 6 characters"
          />
          <p className="text-gray-400 text-sm mt-1">
            Minimum 6 characters required
          </p>
        </div>

        {/* Team Assignment */}
        <div>
          <SearchableSelect
            label="Assign Team"
            value={formData.teamId}
            options={[
              { value: '', label: 'Select a team' },
              ...availableTeams.map((team) => ({
                value: team.id,
                label: team.name
              }))
            ]}
            onChange={(value) => setFormData({ ...formData, teamId: value })}
            enableSearch={true}
            required={true}
          />
          {availableTeams.length === 0 && (
            <p className="text-yellow-400 text-sm mt-1">
              All teams already have managers assigned
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || availableTeams.length === 0}
            className="px-6 py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <LoadingSpinner size="sm" />}
            {loading ? "Creating..." : "Create Team Manager"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
