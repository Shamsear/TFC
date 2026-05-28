'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SwapWindow {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  swapLimit: number
  _count?: {
    swapRequests: number
  }
}

interface Props {
  seasonId: string
  seasonName: string
}

export default function SwapWindowsClient({ seasonId, seasonName }: Props) {
  const router = useRouter()
  const [windows, setWindows] = useState<SwapWindow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [isEditing, setIsEditing] = useState(false)
  const [isCreateExpanded, setIsCreateExpanded] = useState(false)
  const [currentId, setCurrentId] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: 'UPCOMING',
    swapLimit: 5
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
      const res = await fetch(`/api/admin/seasons/${seasonId}/swap-windows`)
      if (!res.ok) throw new Error('Failed to fetch swap windows')
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
        ? `/api/admin/seasons/${seasonId}/swap-windows/${currentId}`
        : `/api/admin/seasons/${seasonId}/swap-windows`
      
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
        throw new Error(errorText || 'Failed to save swap window')
      }
      
      setIsCreateExpanded(false)
      setIsEditing(false)
      fetchWindows()
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    }
  }
  
  const handleDelete = async (windowId: string, count: number) => {
    if (count > 0) {
      alert('Cannot delete window with existing swap requests.')
      return
    }
    
    if (confirm('Are you sure you want to delete this swap window?')) {
      try {
        const res = await fetch(`/api/admin/seasons/${seasonId}/swap-windows/${windowId}`, {
          method: 'DELETE'
        })
        
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(errorText || 'Failed to delete swap window')
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
        swapLimit: 5
      })
    }
    setIsCreateExpanded(!isCreateExpanded)
  }
  
  const openEditModal = (swapWindow: SwapWindow) => {
    setIsEditing(true)
    setCurrentId(swapWindow.id)
    setFormData({
      name: swapWindow.name,
      startDate: toLocalDatetimeString(new Date(swapWindow.startDate)),
      endDate: toLocalDatetimeString(new Date(swapWindow.endDate)),
      status: swapWindow.status,
      swapLimit: swapWindow.swapLimit || 5
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
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 text-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent uppercase tracking-tight">
            Swap Windows
          </h1>
          <p className="text-sm text-[#7A7367] mt-1">
            Manage player swap periods for {seasonName}
          </p>
        </div>
        
        <button
          onClick={toggleCreateCollapse}
          className="px-6 py-2.5 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold transition-all hover:scale-105"
        >
          {isCreateExpanded ? 'Cancel' : 'Create Window'}
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
          {error}
        </div>
      )}

      {isCreateExpanded && (
        <div className="w-full bg-[#111] border border-white/10 rounded-2xl p-6 sm:p-8 transition-all shadow-xl">
          <h2 className="text-xl font-bold mb-4 text-[#E8A800]">
            {isEditing ? `Edit Swap Window: ${formData.name}` : 'Create Swap Window'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#7A7367] mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#E8A800]"
                  placeholder="e.g. Mid-Season Swaps"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#7A7367] mb-1">Swap Limit</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.swapLimit}
                  onChange={e => setFormData({ ...formData, swapLimit: parseInt(e.target.value) || 5 })}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#E8A800]"
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#7A7367] mb-1">Start Date</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#E8A800]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#7A7367] mb-1">End Date</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#E8A800]"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#7A7367] mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#E8A800]"
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
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold transition-colors"
              >
                {isEditing ? 'Save Changes' : 'Create Window'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="grid gap-4">
        {windows.length === 0 ? (
          <div className="p-8 bg-[#1a1a1a] border border-white/5 rounded-2xl text-center text-[#7A7367]">
            No swap windows found for this season.
          </div>
        ) : (
          windows.map(window => (
            <div key={window.id} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg">{window.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    window.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                    window.status === 'CLOSED' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {window.status}
                  </span>
                </div>
                <div className="text-sm text-[#7A7367] flex gap-4 flex-wrap">
                  <div>Starts: {new Date(window.startDate).toLocaleString()}</div>
                  <div>Ends: {new Date(window.endDate).toLocaleString()}</div>
                  <div>Limit: <span className="text-white font-medium">{window.swapLimit || 5}</span></div>
                </div>
                <div className="text-sm font-medium">
                  Requests: <span className="text-[#E8A800]">{window._count?.swapRequests || 0}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(window)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(window.id, window._count?.swapRequests || 0)}
                  disabled={(window._count?.swapRequests || 0) > 0}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
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
