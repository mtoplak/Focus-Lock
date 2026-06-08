import { useCallback, useEffect, useState } from 'react'
import { useAuthOptional } from '../context/AuthContext'
import { API_URL } from '../lib/config'

const EXTERNAL_PROBE_URL = 'https://connectivitycheck.gstatic.com/generate_204'
const POLL_MS = 3_000

async function probeExternalInternet(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 4_000)
    await fetch(EXTERNAL_PROBE_URL, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    })
    window.clearTimeout(timeout)
    return true
  } catch {
    return false
  }
}

async function probeApiHealth(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 4_000)
    const res = await fetch(`${API_URL}/api/health`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    window.clearTimeout(timeout)
    return res.ok
  } catch {
    return false
  }
}

export type ConnectivityState = {
  /** Show the offline / degraded banner. */
  showBanner: boolean
  /** Browser reports offline (`navigator.onLine` or `offline` event). */
  browserOffline: boolean
  /** No route to the public internet (Wi‑Fi off, cable unplugged, etc.). */
  noInternet: boolean
  /** Signed-in session restored from cache because `/me` failed. */
  sessionOffline: boolean
  /** Backend health check failed while the browser claims to be online. */
  apiUnreachable: boolean
}

export function useConnectivity(): ConnectivityState {
  const auth = useAuthOptional()
  const sessionOffline = auth?.sessionOffline ?? false

  const [browserOffline, setBrowserOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  )
  const [noInternet, setNoInternet] = useState(false)
  const [apiUnreachable, setApiUnreachable] = useState(false)

  const syncBrowserOffline = useCallback(() => {
    setBrowserOffline(!navigator.onLine)
  }, [])

  const runProbes = useCallback(async () => {
    if (!navigator.onLine) {
      setNoInternet(true)
      setApiUnreachable(false)
      return
    }

    const [hasInternet, hasApi] = await Promise.all([
      probeExternalInternet(),
      auth?.isGuest || auth?.loading ? Promise.resolve(true) : probeApiHealth(),
    ])

    setNoInternet(!hasInternet)
    setApiUnreachable(!hasApi && !auth?.isGuest && !auth?.loading)
  }, [auth?.isGuest, auth?.loading])

  useEffect(() => {
    syncBrowserOffline()

    const onOnline = () => {
      syncBrowserOffline()
      void runProbes()
    }
    const onOffline = () => {
      syncBrowserOffline()
      setNoInternet(true)
      setApiUnreachable(false)
    }
    const onFocus = () => {
      syncBrowserOffline()
      void runProbes()
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('focus', onFocus)

    void runProbes()
    const id = window.setInterval(() => {
      syncBrowserOffline()
      void runProbes()
    }, POLL_MS)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('focus', onFocus)
      window.clearInterval(id)
    }
  }, [runProbes, syncBrowserOffline])

  const showBanner =
    browserOffline || noInternet || sessionOffline || apiUnreachable

  return {
    showBanner,
    browserOffline,
    noInternet,
    sessionOffline,
    apiUnreachable,
  }
}
