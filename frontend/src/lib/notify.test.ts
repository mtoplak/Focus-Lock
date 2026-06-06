import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureNotificationPermission, notificationsSupported, notifyTimer } from './notify'

describe('notify', () => {
  const showNotification = vi.fn()
  const requestPermission = vi.fn()

  beforeEach(() => {
    showNotification.mockResolvedValue(undefined)
    requestPermission.mockResolvedValue('granted')

    class MockNotification {
      static permission: NotificationPermission = 'granted'
      static requestPermission = requestPermission
      constructor(
        public title: string,
        public options?: NotificationOptions,
      ) {}
    }

    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      writable: true,
      value: MockNotification,
    })

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue({ showNotification }),
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('detects Notification API support', () => {
    expect(notificationsSupported()).toBe(true)
  })

  it('returns existing permission without re-prompting', async () => {
    ;(Notification as unknown as { permission: NotificationPermission }).permission = 'granted'
    await expect(ensureNotificationPermission()).resolves.toBe('granted')
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('requests permission when still default', async () => {
    ;(Notification as unknown as { permission: NotificationPermission }).permission = 'default'
    await expect(ensureNotificationPermission()).resolves.toBe('granted')
    expect(requestPermission).toHaveBeenCalledOnce()
  })

  it('shows timer notifications through the service worker when registered', async () => {
    await notifyTimer('start', 'focus')

    expect(showNotification).toHaveBeenCalledWith('Focus session started', {
      body: 'Time to focus — eyes on the task.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'focus-lock-focus-start',
      renotify: true,
    })
  })

  it('does not notify when permission is denied', async () => {
    ;(Notification as unknown as { permission: NotificationPermission }).permission = 'denied'

    await notifyTimer('end', 'focus')

    expect(showNotification).not.toHaveBeenCalled()
  })

  it('falls back to Notification when service worker registration is unavailable', async () => {
    vi.spyOn(navigator.serviceWorker, 'getRegistration').mockResolvedValue(undefined)

    await notifyTimer('end', 'long-break')

    expect(showNotification).not.toHaveBeenCalled()
  })
})
