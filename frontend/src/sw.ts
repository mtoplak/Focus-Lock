/// <reference lib="webworker" />

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import type { TimerMode } from './types'
import {
  timerNotificationOptions,
  timerNotificationTitle,
} from './lib/timerNotificationContent'
import type { TimerEndSchedule, TimerSwOutboundMessage } from './lib/timerSwSync'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

const navigationHandler = createHandlerBoundToURL('/index.html')
registerRoute(new NavigationRoute(navigationHandler))

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
)

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
)

self.skipWaiting()
clientsClaim()

let endAlarmId: ReturnType<typeof setTimeout> | null = null

function clearEndAlarm(): void {
  if (endAlarmId !== null) {
    clearTimeout(endAlarmId)
    endAlarmId = null
  }
}

async function showTimerEndNotification(mode: TimerMode): Promise<void> {
  const title = timerNotificationTitle('end', mode)
  const options = timerNotificationOptions('end', mode)
  await self.registration.showNotification(title, options)
}

function scheduleEndAlarm(schedule: TimerEndSchedule): void {
  clearEndAlarm()
  if (!schedule.notificationsEnabled) return

  const delay = schedule.endsAt - Date.now()
  if (delay <= 0) return

  endAlarmId = setTimeout(() => {
    endAlarmId = null
    void showTimerEndNotification(schedule.mode)
  }, delay)
}

function requestClientResync(): void {
  void self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: 'TIMER_REQUEST_SYNC' })
    }
  })
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as TimerSwOutboundMessage | undefined
  if (!data || typeof data.type !== 'string') return

  if (data.type === 'TIMER_SCHEDULE_END') {
    scheduleEndAlarm(data.schedule)
    return
  }

  if (data.type === 'TIMER_CLEAR_END') {
    clearEndAlarm()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      requestClientResync()
    })(),
  )
})
