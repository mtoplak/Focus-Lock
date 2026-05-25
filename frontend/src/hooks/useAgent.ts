import { useEffect, useRef, useState } from 'react'
import type { BlockedItem } from '../types'

const AGENT_URL = 'http://127.0.0.1:7777'
const POLL_MS = 4000

export interface InstalledApp {
  exe: string
  displayName: string
  running: boolean
  instances: number
  hasIcon: boolean
}

export const agentIconUrl = (exe: string) =>
  `${AGENT_URL}/icon/${encodeURIComponent(exe)}`

export async function fetchInstalledApps(): Promise<InstalledApp[]> {
  const res = await fetch(`${AGENT_URL}/installed-apps`, { method: 'GET' })
  if (!res.ok) throw new Error(`agent returned ${res.status}`)
  const body = (await res.json()) as { apps: InstalledApp[] }
  return body.apps
}

export type AgentStatus = 'connecting' | 'connected' | 'disconnected'

interface AgentState {
  status: AgentStatus
  version?: string
  lastKill?: string
}

let cachedState: AgentState = { status: 'connecting' }
const listeners = new Set<(s: AgentState) => void>()

const setState = (next: AgentState) => {
  cachedState = next
  listeners.forEach((l) => l(next))
}

let pollHandle: number | null = null
let pollersAttached = 0

const startPolling = () => {
  pollersAttached += 1
  if (pollHandle !== null) return

  const tick = async () => {
    try {
      const res = await fetch(`${AGENT_URL}/status`, { method: 'GET' })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const body = (await res.json()) as { version?: string; lastKill?: string }
      setState({ status: 'connected', version: body.version, lastKill: body.lastKill })
    } catch {
      setState({ status: 'disconnected' })
    }
  }

  void tick()
  pollHandle = window.setInterval(tick, POLL_MS)
}

const stopPolling = () => {
  pollersAttached = Math.max(0, pollersAttached - 1)
  if (pollersAttached === 0 && pollHandle !== null) {
    window.clearInterval(pollHandle)
    pollHandle = null
  }
}

export function useAgent(): AgentState {
  const [state, setLocal] = useState<AgentState>(cachedState)

  useEffect(() => {
    listeners.add(setLocal)
    startPolling()
    return () => {
      listeners.delete(setLocal)
      stopPolling()
    }
  }, [])

  return state
}

/**
 * Push the current block list and focus state to the local agent.
 * Silently no-ops if the agent isn't reachable.
 */
export function useAgentSync(items: BlockedItem[], focusActive: boolean) {
  const lastPayloadRef = useRef<string>('')

  useEffect(() => {
    const apps = items
      .filter((i) => i.enabled && i.kind === 'app')
      .map((i) => i.label)

    const payload = JSON.stringify({ apps, focusActive })
    if (payload === lastPayloadRef.current) return
    lastPayloadRef.current = payload

    const controller = new AbortController()
    fetch(`${AGENT_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      signal: controller.signal,
    }).catch(() => {
      // agent not running — ignore
    })

    return () => controller.abort()
  }, [items, focusActive])
}
