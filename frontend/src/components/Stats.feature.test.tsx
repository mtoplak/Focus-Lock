import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Stats } from './Stats'

vi.mock('../hooks/useAgent', () => ({
  useAgent: () => ({ status: 'connected' as const }),
}))

const sampleHistory = [
  { date: '2026-06-01', focusMinutes: 50, completedSessions: 2 },
  { date: '2026-06-02', focusMinutes: 25, completedSessions: 1 },
]

describe('Stats feature', () => {
  it('renders blocked sites from props', () => {
    render(
      <Stats
        history={sampleHistory}
        blockCounts={[]}
        urlBlockCounts={[{ key: 'youtube.com', label: 'youtube.com', count: 12 }]}
        onResetStats={vi.fn()}
      />,
    )

    expect(screen.getByText('youtube.com')).toBeInTheDocument()
    expect(screen.getByText('12×')).toBeInTheDocument()
    const totalSessionsCard = screen.getByText('Total sessions').parentElement
    expect(totalSessionsCard).toHaveTextContent('3')
  })

  it('shows an empty state when there are no blocked sites', () => {
    render(
      <Stats
        history={[]}
        blockCounts={[]}
        urlBlockCounts={[]}
        onResetStats={vi.fn()}
      />,
    )

    expect(
      screen.getByText(/no blocked site lookups yet/i),
    ).toBeInTheDocument()
  })

  it('confirms reset and calls onResetStats', async () => {
    const user = userEvent.setup()
    const onResetStats = vi.fn()

    render(
      <Stats
        history={sampleHistory}
        blockCounts={[{ key: 'discord.exe', label: 'Discord', count: 4 }]}
        urlBlockCounts={[]}
        onResetStats={onResetStats}
      />,
    )

    await user.click(screen.getByRole('button', { name: /reset all stats/i }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/reset all stats\?/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^reset stats$/i }))
    expect(onResetStats).toHaveBeenCalledOnce()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('dismisses the reset dialog on cancel', async () => {
    const user = userEvent.setup()

    render(
      <Stats
        history={[]}
        blockCounts={[]}
        urlBlockCounts={[]}
        onResetStats={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /reset all stats/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
