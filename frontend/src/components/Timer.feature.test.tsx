import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Timer } from './Timer'
import type { UseTimerResult } from '../hooks/useTimer'
import { DEFAULT_SETTINGS } from '../types'

function buildTimer(overrides: Partial<UseTimerResult> = {}): UseTimerResult {
  return {
    mode: 'short-break',
    setMode: vi.fn(),
    secondsLeft: 300,
    totalSeconds: 300,
    isRunning: false,
    start: vi.fn(),
    pause: vi.fn(),
    reset: vi.fn(),
    resetCycle: vi.fn(),
    resetSessionStats: vi.fn(),
    skip: vi.fn(),
    completedFocusSessions: 2,
    completedInCycle: 2,
    canResetCycle: true,
    ...overrides,
  }
}

describe('Timer feature', () => {
  it('shows Reset cycle when the Pomodoro cycle has progressed', () => {
    render(
      <Timer
        timer={buildTimer()}
        settings={DEFAULT_SETTINGS}
        task=""
        onTaskChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /reset cycle/i })).toBeInTheDocument()
    // After 2 completed focuses the user is on a short break — next up is Focus 3.
    expect(screen.getByText(/focus 2 of 4/i)).toBeInTheDocument()
  })

  it('calls resetCycle when Reset cycle is clicked', async () => {
    const user = userEvent.setup()
    const resetCycle = vi.fn()

    render(
      <Timer
        timer={buildTimer({ resetCycle })}
        settings={DEFAULT_SETTINGS}
        task=""
        onTaskChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /reset cycle/i }))
    expect(resetCycle).toHaveBeenCalledOnce()
  })

  it('does not show Reset cycle at the beginning of a cycle', () => {
    render(
      <Timer
        timer={buildTimer({
          mode: 'focus',
          completedInCycle: 0,
          canResetCycle: false,
          completedFocusSessions: 0,
        })}
        settings={DEFAULT_SETTINGS}
        task=""
        onTaskChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /reset cycle/i })).not.toBeInTheDocument()
    expect(screen.getByText(/focus 1 of 4/i)).toBeInTheDocument()
  })
})
