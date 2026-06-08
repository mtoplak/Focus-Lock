import webpush from 'web-push'
import { env } from '../config/env.js'
import {
  claimDuePushes,
  deleteSubscription,
  getSubscriptions,
} from '../repositories/pushRepository.js'

let configured = false

/** Wire up VAPID details. Returns false (and stays a no-op) if keys are absent. */
export function initPush(): boolean {
  if (!env.push.vapidPublic || !env.push.vapidPrivate) {
    console.warn('[push] VAPID keys not set — web push disabled')
    return false
  }
  webpush.setVapidDetails(
    env.push.vapidSubject,
    env.push.vapidPublic,
    env.push.vapidPrivate,
  )
  configured = true
  return true
}

async function sendToUser(userId: string, payload: object): Promise<void> {
  const subs = await getSubscriptions(userId)
  const body = JSON.stringify(payload)
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        )
      } catch (error) {
        // 404/410 mean the browser dropped the subscription — prune it.
        const code =
          error && typeof error === 'object' && 'statusCode' in error
            ? (error as { statusCode: number }).statusCode
            : 0
        if (code === 404 || code === 410) {
          await deleteSubscription(sub.endpoint)
        } else {
          console.error('[push] send failed', code || error)
        }
      }
    }),
  )
}

let timer: ReturnType<typeof setInterval> | null = null

/**
 * Poll the scheduled_pushes table and deliver anything due. DB-backed (not an
 * in-memory setTimeout) so scheduled notifications survive a server restart.
 */
export function startPushPoller(intervalMs = 10_000): void {
  if (!configured || timer) return

  const tick = async (): Promise<void> => {
    try {
      const due = await claimDuePushes()
      await Promise.all(
        due.map((row) => sendToUser(row.user_id, { type: 'timer-end', mode: row.mode })),
      )
    } catch (error) {
      console.error('[push] poller error', error)
    }
  }

  timer = setInterval(() => void tick(), intervalMs)
  timer.unref?.()
}

export function stopPushPoller(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
