"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/ToastProvider"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

interface Team {
  id: string
  name: string
  managerName: string
}

interface TeamManager {
  id: string
  name: string | null
  email: string
  teamId: string | null
  isActive: boolean
  team: Team | null
}

interface EditTeamManagerFormProps {
  teamManager: TeamManager
  teams: Team[]
  assignedTeamIds: string[]
}

export default function EditTeamManagerForm({
  teamManager,
  teams,
  assignedTeamIds,
}: EditTeamManagerFormProps) {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    name: teamManager.name || "",
    email: teamManager.email,
    teamId: teamManager.teamId || "",
    isActive: teamManager.isActive,
    password: "",
  })

  const availableTeams = teams.filter(
    (team) =>
      !assignedTeamIds.includes(team.id) || team.id === teamManager.teamId
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch(
        `/api/admin/team-managers/${teamManager.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            teamId: formData.teamId || null,
            isActive: formData.isActive,
            ...(formData.password && { password: formData.password }),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update team manager")
      }

      toast.success("Team manager updated successfully!")
      router.push("/super-admin/team-managers")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this team manager? This action cannot be undone."
      )
    ) {
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(
        `/api/admin/team-managers/${teamManager.id}`,
        {
          method: "DELETE",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete team manager")
      }

      toast.success("Team manager deleted successfully!")
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

        {/* Manager ID */}
        <div>
          <label className="block text-white font-medium mb-2">
            Manager ID
          </label>
          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-400 font-mono">
            {teamManager.id}
          </div>
        </div>

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

        {/* Password (Optional) */}
        <div>
          <label
            htmlFor="password"
            className="block text-white font-medium mb-2"
          >
            New Password (Optional)
          </label>
          <input
            type="password"
            id="password"
            minLength={6}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/50"
            placeholder="Leave blank to keep current password"
          />
          <p className="text-gray-400 text-sm mt-1">
            Leave blank to keep current password
          </p>
        </div>

        {/* Team Assignment */}
        <div>
          <label htmlFor="teamId" className="block text-white font-medium mb-2">
            Assign Team
          </label>
          <select
            id="teamId"
            value={formData.teamId}
            onChange={(e) =>
              setFormData({ ...formData, teamId: e.target.value })
            }
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#E8A800]/50"
          >
            <option value="">No team assigned</option>
            {availableTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="w-5 h-5 rounded border-white/10 bg-white/5 text-[#E8A800] focus:ring-[#E8A800]/50"
            />
            <span className="text-white font-medium">Active Account</span>
          </label>
          <p className="text-gray-400 text-sm mt-1 ml-8">
            Inactive accounts cannot log in
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <LoadingSpinner size="sm" />}
            Delete Manager
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <LoadingSpinner size="sm" />}
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
