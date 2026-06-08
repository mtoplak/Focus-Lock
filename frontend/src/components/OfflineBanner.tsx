import { useConnectivity } from '../hooks/useConnectivity'

export function OfflineBanner() {
  const { showBanner, browserOffline, noInternet, sessionOffline, apiUnreachable } =
    useConnectivity()

  if (!showBanner) return null

  let message =
    "You're offline. Timer and blocking still work. Sign-in and push notifications need a connection."

  if (sessionOffline && !browserOffline && !noInternet) {
    message =
      "Can't reach the server — using your saved session. Timer and blocking still work."
  } else if (apiUnreachable && !browserOffline && !noInternet && !sessionOffline) {
    message =
      "Can't reach the Focus Lock server. Timer and blocking still work if the desktop agent is running."
  } else if (!browserOffline && noInternet) {
    message =
      "No internet connection. Timer and blocking still work locally. Sign-in and push notifications need a connection."
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] border-b border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-center text-[13px] leading-snug text-amber-900 shadow-sm dark:text-amber-200"
    >
      {message}
    </div>
  )
}

/** Reserve space below the fixed offline banner so content is not covered. */
export function OfflineBannerSpacer() {
  const { showBanner } = useConnectivity()
  if (!showBanner) return null
  return <div className="h-10 shrink-0" aria-hidden="true" />
}
