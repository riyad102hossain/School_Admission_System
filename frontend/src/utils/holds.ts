import type { Hold, HoldStatus } from '../api/types'

/** Whole seconds left until `expiresAt`, never negative. */
export function secondsLeft(expiresAt: string, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000))
}

/**
 * The status to show right now. A HELD hold whose time has passed is shown as EXPIRED
 * immediately, without waiting for the next server refresh. The server applies the
 * same rule, so it would refuse a payment at that point anyway.
 */
export function effectiveStatus(hold: Pick<Hold, 'status' | 'expiresAt'>, now: number): HoldStatus {
  return hold.status === 'HELD' && secondsLeft(hold.expiresAt, now) === 0 ? 'EXPIRED' : hold.status
}

const bnDigits = new Intl.NumberFormat('bn-BD', { useGrouping: false })
const pad = (n: number) => bnDigits.format(n).padStart(2, bnDigits.format(0))

/** Formats seconds as mm:ss (or h:mm:ss) with Bengali digits. */
export function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0 ? `${bnDigits.format(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

export const toBengaliNumber = (n: number) => n.toLocaleString('bn-BD')

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })
