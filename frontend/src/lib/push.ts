import type { TimerMode } from '../types'
import { apiClient } from './api'

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return new Uint8Array([...raw].map((char) => char.charCodeAt(0))) as Uint8Array<ArrayBuffer>
}

function keysEqual(a: Uint8Array, b: ArrayBuffer | null | undefined): boolean {
  if (!b) return false
  const other = new Uint8Array(b)
  return a.length === other.length && a.every((byte, i) => byte === other[i])
}

function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window
  )
}

/**
 * Subscribe this browser to web push and register the subscription with the
 * backend. Best-effort: requires an authenticated user (apiClient attaches the
 * token) and the VAPID public key from the server. Returns false on any miss.
 */
export async function ensurePushSubscription(): Promise<boolean> {
  if (!pushSupported()) return false
  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
    return false
  }

  try {
    const reg = await navigator.serviceWorker.ready
    const { data } = await apiClient.get<{ key: string }>('/api/push/public-key')
    if (!data.key) {
      console.warn('[push] server returned no VAPID public key')
      return false
    }

    const applicationServerKey = urlBase64ToUint8Array(data.key)
    let sub = await reg.pushManager.getSubscription()

    if (sub && !keysEqual(applicationServerKey, sub.options.applicationServerKey ?? null)) {
      await sub.unsubscribe()
      sub = null
    }

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
    }

    await apiClient.post('/api/push/subscribe', sub.toJSON())
    return true
  } catch (error) {
    console.warn('[push] ensurePushSubscription failed', error)
    return false
  }
}

/** Ask the backend to push an end-of-interval notification at `endsAt`. */
export async function schedulePushEnd(endsAt: number, mode: TimerMode): Promise<boolean> {
  try {
    await apiClient.post('/api/push/schedule', { endsAt, mode })
    return true
  } catch (error) {
    console.warn('[push] schedulePushEnd failed', error)
    return false
  }
}

/** Cancel any pending server-side end-of-interval push for this user. */
export async function cancelPushEnd(): Promise<void> {
  try {
    await apiClient.post('/api/push/cancel')
  } catch {
    // best-effort
  }
}
