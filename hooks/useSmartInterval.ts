'use client'

import { useEffect, useRef } from 'react'

/**
 * A custom hook for running intervals that pause automatically when the browser tab is hidden/backgrounded,
 * and immediately trigger a fresh execution when the user returns to the tab.
 * 
 * @param callback The function to execute
 * @param delay Interval delay in ms, or null to pause interval completely
 * @param runOnFocus Whether to trigger callback immediately when tab becomes visible (default: true)
 */
export function useSmartInterval(
  callback: () => void,
  delay: number | null,
  runOnFocus: boolean = true
) {
  const savedCallback = useRef(callback)

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return // Skip execution when tab is backgrounded/hidden
      }
      savedCallback.current()
    }

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden && runOnFocus) {
        savedCallback.current() // Immediately refresh upon returning to tab
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    const id = setInterval(tick, delay)

    return () => {
      clearInterval(id)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [delay, runOnFocus])
}
