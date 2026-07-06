'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ReleaseWindow {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  releaseLimit: number
  _count?: {
    releaseRequests: number
  }
}

interface Props {
  seasonId: string
  seasonName: string
}

export default function ReleaseWindowsClient({ seasonId, seasonName }: Props) {
  const router = useRouter()
  const [windows, setWindows] = useState<ReleaseWindow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreateExpanded, setIsCreateExpanded] = useState(false)
  const [currentId, setCurrentId] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: 'UPCOMING',
    releaseLimit: 3
  })
  
  const toLocalDatetimeString = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  useEffect(() => {
    fetchWindows()
  }, [])
  
  const fetchWindows = async () => {
    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/release-windows`)
      if (!res.ok) throw new Error('Failed to fetch release windows')
      const data = await res.json()
      setWindows(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = isEditing 
        ? `/api/admin/seasons/${seasonId}/release-windows/${currentId}`
        : `/api/admin/seasons/${seasonId}/release-windows`
      
      const payload = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      }

      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || 'Failed to save release window')
      }
      
      setIsModalOpen(false)
      setIsCreateExpanded(false)
      fetchWindows()
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    }
  }
  
  const handleDelete = async (windowId: string, count: number) => {
    if (count > 0) {
      alert('Cannot delete window with existing release requests.')
      return
    }
    
    if (confirm('Are you sure you want to delete this release window?')) {
      try {
        const res = await fetch(`/api/admin/seasons/${seasonId}/release-windows/${windowId}`, {
          method: 'DELETE'
        })
        
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(errorText || 'Failed to delete release window')
        }
        
        fetchWindows()
      } catch (err: any) {
        alert(err.message)
      }
    }
  }
  
  const toggleCreateCollapse = () => {
    setIsEditing(false)
    if (!isCreateExpanded) {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setFormData({
        name: '',
        startDate: toLocalDatetimeString(now),
        endDate: toLocalDatetimeString(nextWeek),
        status: 'UPCOMING',
        releaseLimit: 3
      })
    }
    setIsCreateExpanded(!isCreateExpanded)
  }
  
  const openEditModal = (releaseWindow: ReleaseWindow) => {
    setIsEditing(true)
    setCurrentId(releaseWindow.id)
    setFormData({
      name: releaseWindow.name,
      startDate: toLocalDatetimeString(new Date(releaseWindow.startDate)),
      endDate: toLocalDatetimeString(new Date(releaseWindow.endDate)),
      status: releaseWindow.status,
      releaseLimit: releaseWindow.releaseLimit || 3
    })
    setIsCreateExpanded(true)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (loading) {
    return (
      <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 text-white animate-pulse">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-white/10 rounded-lg"></div>
            <div className="h-4 w-64 bg-white/5 rounded-md"></div>
          </div>
          <div className="h-10 w-36 bg-white/5 rounded-lg"></div>
        </div>
        
        <div className="grid gap-4 mt-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-40 bg-white/10 rounded"></div>
                  <div className="h-5 w-16 bg-white/5 rounded"></div>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <div className="h-4 w-32 bg-white/5 rounded"></div>
                  <div className="h-4 w-32 bg-white/5 rounded"></div>
                  <div className="h-4 w-20 bg-white/5 rounded"></div>
                </div>
                <div className="h-4 w-24 bg-white/5 rounded"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-16 bg-white/5 rounded-lg"></div>
                <div className="h-9 w-20 bg-red-500/5 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Season
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
            Release Windows
          </h1>
          <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
            Manage player release periods for {seasonName}
          </p>
        </div>
        
        <button
          onClick={toggleCreateCollapse}
          className="px-6 py-2.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold transition-all hover:scale-105 text-xs uppercase tracking-wider cursor-pointer"
        >
          {isCreateExpanded ? 'Cancel' : 'Create Window'}
        </button>
      </div>

      {isCreateExpanded && (
        <div className="w-full bg-white/[0.01] border border-white/5 rounded-2xl p-6 sm:p-8 transition-all shadow-md backdrop-blur-xl mb-6">
          <h2 className="text-lg font-black text-[#E8A800] mb-4 uppercase tracking-tight font-mono">
            {isEditing ? `Edit Release Window: ${formData.name}` : 'Create Release Window'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
                  placeholder="e.g. Mid-Season Release"
                />
              </div>
              
              <div>
                <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">Release Limit</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.releaseLimit}
                  onChange={e => setFormData({ ...formData, releaseLimit: parseInt(e.target.value) || 3 })}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
                  placeholder="e.g. 3"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">Start Date</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
                />
              </div>
              
              <div>
                <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">End Date</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
              >
                <option value="UPCOMING">UPCOMING</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
            
            <div className="flex gap-3 pt-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsCreateExpanded(false)
                  setIsEditing(false)
                }}
                className="px-6 py-2.5 bg-white/[0.01] border border-white/5 hover:border-white/10 text-white rounded-xl font-bold transition-all text-xs uppercase tracking-wider text-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                {isEditing ? 'Save Changes' : 'Create Window'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
          {error}
        </div>
      )}
      
      <div className="grid gap-4">
        {windows.length === 0 ? (
          <div className="p-8 bg-white/[0.01] border border-white/5 rounded-2xl text-center text-gray-500 font-bold uppercase tracking-wider text-xs">
            No release windows found for this season.
          </div>
        ) : (
          windows.map(window => (
            <div key={window.id} className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-xl shadow-md">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg text-white">{window.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider font-mono ${
                    window.status === 'ACTIVE' ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/25' :
                    window.status === 'CLOSED' ? 'bg-red-500/25 text-red-400 border border-red-500/25' :
                    'bg-blue-500/25 text-blue-400 border border-blue-500/25'
                  }`}>
                    {window.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono flex gap-4 flex-wrap">
                  <div>Starts: <span className="text-gray-300">{new Date(window.startDate).toLocaleString()}</span></div>
                  <div>Ends: <span className="text-gray-300">{new Date(window.endDate).toLocaleString()}</span></div>
                  <div>Limit: <span className="text-white font-medium">{window.releaseLimit || 3}</span></div>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider font-mono text-gray-500">
                  Requests: <span className="text-[#E8A800]">{window._count?.releaseRequests || 0}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(window)}
                  className="px-4 py-2 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(window.id, window._count?.releaseRequests || 0)}
                  disabled={(window._count?.releaseRequests || 0) > 0}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/20 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
