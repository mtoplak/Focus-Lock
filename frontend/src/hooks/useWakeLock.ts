import { useEffect, useRef, useState } from 'react'

/**
 * Screen Wake Lock API — keeps the display awake while `active` is true
 * (e.g. during a running focus session) so the timer stays visible and the
 * machine doesn't dim/sleep mid-session.
 *
 * The browser automatically releases a wake lock whenever the tab is hidden
 * (backgrounded, minimized, screen locked). We listen for `visibilitychange`
 * and re-acquire when the tab becomes visible again and we're still active.
 */
export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

/** Returns `true` while a screen wake lock is actually held. */
export function useWakeLock(active: boolean): boolean {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!active || !wakeLockSupported()) {
      setHeld(false)
      return
    }

    let cancelled = false

    const acquire = async () => {
      // Only meaningful when the page is actually visible; the request
      // throws otherwise.
      if (document.visibilityState !== 'visible') return
      if (sentinelRef.current) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void sentinel.release()
          return
        }
        sentinelRef.current = sentinel
        setHeld(true)
        // The sentinel auto-releases when the tab hides; clear our ref so a
        // later re-acquire isn't short-circuited by the stale reference.
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null
            if (!cancelled) setHeld(false)
          }
        })
      } catch {
        // Permission denied, low battery, or unsupported — degrade silently.
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      setHeld(false)
      document.removeEventListener('visibilitychange', onVisibility)
      const sentinel = sentinelRef.current
      sentinelRef.current = null
      if (sentinel) void sentinel.release().catch(() => {})
    }
  }, [active])

  return held
}
