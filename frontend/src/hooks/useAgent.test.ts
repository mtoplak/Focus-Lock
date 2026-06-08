import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pushAgentSync, useAgentSync } from './useAgent'
import type { BlockedItem } from '../types'

const blocked: BlockedItem[] = [
  { id: '1', label: 'youtube.com', kind: 'url', enabled: true },
  { id: '2', label: 'Discord.exe', kind: 'app', enabled: true },
]

describe('pushAgentSync', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns true when the agent accepts the sync', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }))

    const ok = await pushAgentSync({
      apps: ['Discord.exe'],
      urls: ['youtube.com'],
      focusActive: true,
    })

    expect(ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:7777/sync',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          apps: ['Discord.exe'],
          urls: ['youtube.com'],
          focusActive: true,
        }),
      }),
    )
  })

  it('returns false when the request fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))

    const ok = await pushAgentSync({
      apps: [],
      urls: ['youtube.com'],
      focusActive: true,
    })

    expect(ok).toBe(false)
  })
})

describe('useAgentSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('retries after a failed sync until the agent responds', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    renderHook(() => useAgentSync(blocked, true))

    await act(async () => {
      await Promise.resolve()
    })
    expect(fetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('pushes again when the browser comes back online', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    renderHook(() => useAgentSync(blocked, true))

    await act(async () => {
      await Promise.resolve()
    })
    expect(fetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await Promise.resolve()
    })

    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
