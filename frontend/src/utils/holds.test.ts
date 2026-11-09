import { describe, expect, it } from 'vitest'
import { effectiveStatus, formatCountdown, secondsLeft } from './holds'

const now = Date.parse('2026-11-10T10:00:00Z')

describe('secondsLeft', () => {
  it('rounds partial seconds up and never goes negative', () => {
    expect(secondsLeft('2026-11-10T10:00:01.200Z', now)).toBe(2)
    expect(secondsLeft('2026-11-10T09:59:00Z', now)).toBe(0)
  })
})

describe('effectiveStatus', () => {
  it('shows a held hold as expired as soon as its time is up', () => {
    expect(effectiveStatus({ status: 'HELD', expiresAt: '2026-11-10T10:00:05Z' }, now)).toBe('HELD')
    expect(effectiveStatus({ status: 'HELD', expiresAt: '2026-11-10T10:00:00Z' }, now)).toBe('EXPIRED')
  })

  it('never changes a final status', () => {
    expect(effectiveStatus({ status: 'CONFIRMED', expiresAt: '2026-11-10T09:00:00Z' }, now)).toBe('CONFIRMED')
    expect(effectiveStatus({ status: 'CANCELLED', expiresAt: '2026-11-10T09:00:00Z' }, now)).toBe('CANCELLED')
  })
})

describe('formatCountdown', () => {
  it('uses Bengali digits in mm:ss, adding hours only when needed', () => {
    expect(formatCountdown(600)).toBe('১০:০০')
    expect(formatCountdown(65)).toBe('০১:০৫')
    expect(formatCountdown(3725)).toBe('১:০২:০৫')
  })
})
