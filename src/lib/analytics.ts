let initialized = false

export function initializeAnalytics() {
  initialized = true
}

export function syncAnalyticsPage(pathname: string, search = '') {
  if (!initialized || typeof navigator === 'undefined') return

  const payload = {
    event: 'page_view',
    pathname,
    search,
    referrer: document.referrer || '',
    ts: Date.now(),
  }

  try {
    const body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }))
      return
    }

    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
  } catch {
    // Analytics should never block the user-facing workflow.
  }
}
