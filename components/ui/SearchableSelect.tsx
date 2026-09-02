'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface SearchableSelectProps {
  label?: string
  value: string
  options: string[] | { value: string; label: string; disabled?: boolean }[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  enableSearch?: boolean
  displayValue?: (val: string) => string
}

export default function SearchableSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  required = false,
  enableSearch = true,
  displayValue
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [coords, setCoords] = useState<{
    top?: number
    bottom?: number
    left: number
    width: number
    direction: 'up' | 'down'
    maxHeight: number
  }>({
    left: 0,
    width: 0,
    direction: 'down',
    maxHeight: 250
  })

  // Normalize options to array of objects
  const normalizedOptions = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt, disabled: false } : { ...opt, disabled: opt.disabled || false }
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  const updateCoords = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const estimatedHeight = 280

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      setCoords({
        bottom: Math.max(10, window.innerHeight - rect.top + 6),
        left: rect.left,
        width: rect.width,
        direction: 'up',
        maxHeight: Math.min(300, Math.max(140, spaceAbove - 20))
      })
    } else {
      setCoords({
        top: Math.max(10, rect.bottom + 6),
        left: rect.left,
        width: rect.width,
        direction: 'down',
        maxHeight: Math.min(300, Math.max(140, spaceBelow - 20))
      })
    }
  }

  // Position calculation and scroll/resize handling when open
  useEffect(() => {
    if (!isOpen) return

    updateCoords()

    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return
      }
      updateCoords()
    }

    const handleResize = () => updateCoords()

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  // Click outside handling
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && enableSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen, enableSearch])

  // Filter options based on search query
  const filteredOptions = enableSearch && searchQuery
    ? normalizedOptions.filter(option => {
        if (option.label.includes('───')) return true // Keep separators
        const searchLower = searchQuery.toLowerCase()
        const labelLower = option.label.toLowerCase()
        const valueLower = option.value.toLowerCase()
        return labelLower.includes(searchLower) || valueLower.includes(searchLower)
      })
    : normalizedOptions

  // Get display text for selected value
  const getDisplayText = () => {
    if (displayValue) return displayValue(value)
    const selected = normalizedOptions.find(opt => opt.value === value)
    return selected?.label || placeholder
  }

  const dropdownMenu = (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: coords.direction === 'down' ? `${coords.top}px` : undefined,
        bottom: coords.direction === 'up' ? `${coords.bottom}px` : undefined,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        zIndex: 9999
      }}
      className="rounded-xl bg-[#121212] border border-white/20 shadow-[0_16px_48px_rgba(0,0,0,0.95)] focus:outline-none overflow-hidden animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Search Input */}
      {enableSearch && (
        <div className="p-2 border-b border-white/10 bg-[#181818]">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 pl-9 rounded-lg bg-black/60 border border-white/15 text-white placeholder-gray-500 focus:border-[#E8A800] focus:outline-none focus:ring-1 focus:ring-[#E8A800]/20 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
            <svg 
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* Options List */}
      <div 
        style={{ maxHeight: `${coords.maxHeight}px` }}
        className="overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        {filteredOptions.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-400 text-center">
            No results found
          </div>
        ) : (
          filteredOptions.map((option, index) => {
            const isSeparator = option.label.includes('───')
            const isSelected = option.value === value
            
            if (isSeparator) {
              return (
                <div
                  key={`${option.value}-${index}`}
                  className="px-4 py-2 text-xs font-black text-gray-400 bg-white/5 select-none tracking-wider uppercase"
                >
                  {option.label}
                </div>
              )
            }

            return (
              <button
                key={`${option.value}-${index}`}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value)
                    setIsOpen(false)
                    setSearchQuery('')
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                  option.disabled 
                    ? 'opacity-50 cursor-not-allowed text-gray-500' 
                    : isSelected 
                      ? 'text-[#E8A800] bg-[#E8A800]/15 font-bold hover:bg-[#E8A800]/25' 
                      : 'text-gray-200 hover:bg-[#E8A800]/15 hover:text-[#E8A800]'
                }`}
              >
                <span className="truncate">
                  {option.label}
                </span>
                {isSelected && (
                  <svg className="w-4 h-4 text-[#E8A800] flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-sm sm:text-base text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'
        }`}
      >
        <span className={`truncate ${!value ? 'text-[#7A7367]' : ''}`}>
          {getDisplayText()}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && mounted && typeof document !== 'undefined' && createPortal(dropdownMenu, document.body)}
    </div>
  )
}
