import { describe, expect, it } from 'vitest'
import {
  timerNotificationBody,
  timerNotificationOptions,
  timerNotificationTitle,
} from './timerNotificationContent'

describe('timerNotificationContent', () => {
  it('provides stable titles and bodies per mode and event', () => {
    expect(timerNotificationTitle('end', 'focus')).toBe('Focus session complete')
    expect(timerNotificationBody('start', 'focus')).toBe('Time to focus — eyes on the task.')
    expect(timerNotificationBody('end', 'short-break')).toBe("Break's up. Ready to focus?")
  })

  it('uses a unique tag per mode and event so notifications can replace each other', () => {
    const focusEnd = timerNotificationOptions('end', 'focus')
    const focusStart = timerNotificationOptions('start', 'focus')
    const breakEnd = timerNotificationOptions('end', 'short-break')

    expect(focusEnd.tag).toBe('focus-lock-focus-end')
    expect(focusStart.tag).toBe('focus-lock-focus-start')
    expect(breakEnd.tag).toBe('focus-lock-short-break-end')
    expect(focusEnd.renotify).toBe(true)
    expect(focusEnd.icon).toBe('/favicon.svg')
  })
})
