declare global {
  interface Window {
    __APP_CONFIG__?: { API_URL?: string }
  }
}

const DEFAULT_API_URL = 'http://localhost:8080'

/**
 * Where the backend lives. Docker sets it at container start through config.js,
 * so the same image works with any API address; `VITE_API_URL` covers local builds.
 */
export const API_URL = (
  window.__APP_CONFIG__?.API_URL ||
  import.meta.env.VITE_API_URL ||
  DEFAULT_API_URL
).replace(/\/+$/, '')

/** How often seat counts and application lists are refreshed. */
export const POLL_INTERVAL_MS = 3000
