import type { TimerMode } from '../types'
import { apiClient } from './api'

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return new Uint8Array([...raw].map((char) => char.charCodeAt(0))) as Uint8Array<ArrayBuffer>
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
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      const { data } = await apiClient.get<{ key: string }>('/api/push/public-key')
      if (!data.key) return false
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.key),
      })
    }
    await apiClient.post('/api/push/subscribe', sub.toJSON())
    return true
  } catch {
    return false
  }
}

/** Ask the backend to push an end-of-interval notification at `endsAt`. */
export async function schedulePushEnd(endsAt: number, mode: TimerMode): Promise<void> {
  try {
    await apiClient.post('/api/push/schedule', { endsAt, mode })
  } catch {
    // best-effort; the in-page / SW alarm still covers the foreground case
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
