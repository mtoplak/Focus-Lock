import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearTimerEndInSw,
  registerTimerSwResyncListener,
  scheduleTimerEndInSw,
} from './timerSwSync'

const flushAsync = () => new Promise<void>((resolve) => setImmediate(resolve))

describe('timerSwSync', () => {
  const postMessage = vi.fn()
  let registration: ServiceWorkerRegistration

  beforeEach(() => {
    postMessage.mockClear()

    const worker = { postMessage } as unknown as ServiceWorker
    registration = { active: worker } as unknown as ServiceWorkerRegistration

    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve(registration),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('posts TIMER_SCHEDULE_END when a future interval ends with notifications enabled', async () => {
    const endsAt = Date.now() + 60_000

    scheduleTimerEndInSw({
      endsAt,
      mode: 'focus',
      notificationsEnabled: true,
    })

    await flushAsync()

    expect(postMessage).toHaveBeenCalledWith({
      type: 'TIMER_SCHEDULE_END',
      schedule: {
        endsAt,
        mode: 'focus',
        notificationsEnabled: true,
      },
    })
  })

  it('posts TIMER_CLEAR_END when notifications are disabled or endsAt is in the past', async () => {
    scheduleTimerEndInSw({
      endsAt: Date.now() - 1,
      mode: 'focus',
      notificationsEnabled: true,
    })
    await flushAsync()

    scheduleTimerEndInSw({
      endsAt: Date.now() + 60_000,
      mode: 'focus',
      notificationsEnabled: false,
    })
    await flushAsync()

    expect(postMessage).toHaveBeenCalledWith({ type: 'TIMER_CLEAR_END' })
  })

  it('clearTimerEndInSw posts TIMER_CLEAR_END', async () => {
    clearTimerEndInSw()
    await flushAsync()
    expect(postMessage).toHaveBeenCalledWith({ type: 'TIMER_CLEAR_END' })
  })

  it('resync listener reschedules or clears based on getSchedule()', async () => {
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()

    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve(registration),
        addEventListener,
        removeEventListener,
      },
    })

    const endsAt = Date.now() + 30_000
    const getSchedule = vi
      .fn()
      .mockReturnValueOnce({
        endsAt,
        mode: 'short-break' as const,
        notificationsEnabled: true,
      })
      .mockReturnValueOnce(null)

    const unregister = registerTimerSwResyncListener(getSchedule)
    const onMessage = addEventListener.mock.calls[0][1] as (event: MessageEvent) => void

    onMessage({ data: { type: 'TIMER_REQUEST_SYNC' } } as MessageEvent)
    await flushAsync()

    expect(postMessage).toHaveBeenCalledWith({
      type: 'TIMER_SCHEDULE_END',
      schedule: {
        endsAt,
        mode: 'short-break',
        notificationsEnabled: true,
      },
    })

    postMessage.mockClear()
    onMessage({ data: { type: 'TIMER_REQUEST_SYNC' } } as MessageEvent)
    await flushAsync()

    expect(postMessage).toHaveBeenCalledWith({ type: 'TIMER_CLEAR_END' })
    unregister()
    expect(removeEventListener).toHaveBeenCalled()
  })
})
