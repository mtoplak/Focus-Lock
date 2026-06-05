import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function initials(name: string | null, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export function UserMenu() {
  const { user, isGuest, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) return null

  const label = user.name ?? user.email.split('@')[0]

  async function handleLogout() {
    setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] py-1.5 pr-2.5 pl-1.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:bg-[color:var(--color-surface-2)]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="h-8 w-8 rounded-md object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--color-accent-tint)] text-xs font-semibold text-[color:var(--color-accent-strong)]">
            {initials(user.name, user.email)}
          </span>
        )}
        <span className="hidden max-w-[120px] truncate text-xs font-medium text-[color:var(--color-ink-soft)] sm:block">
          {label}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className={`hidden text-[color:var(--color-ink-faint)] sm:block ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] py-1 shadow-lg"
        >
          <div className="border-b border-[color:var(--color-line)] px-3 py-2.5">
            <p className="truncate text-sm font-medium text-[color:var(--color-ink)]">
              {user.name ?? 'Account'}
            </p>
            <p className="truncate text-xs text-[color:var(--color-ink-muted)]">
              {isGuest ? 'Local only — not synced' : user.email}
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            className="w-full cursor-pointer px-3 py-2.5 text-left text-sm text-[color:var(--color-ink-soft)] transition hover:bg-[color:var(--color-surface-2)]"
          >
            {isGuest ? 'Exit guest mode' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
