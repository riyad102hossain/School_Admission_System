import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '../api/client'
import type { Hold } from '../api/types'
import { STUDENT_ID, renderPage } from '../test/render'
import { HoldPage } from './HoldPage'

const NOW = new Date('2026-11-10T10:00:00Z')
const hold = (overrides: Partial<Hold> = {}): Hold => ({
  holdId: 'hold-1',
  classId: 'class-1',
  status: 'HELD',
  expiresAt: '2026-11-10T10:00:05Z',
  ...overrides,
})

function renderHoldPage() {
  return renderPage(<HoldPage />, { path: '/holds/hold-1', route: '/holds/:holdId', studentId: STUDENT_ID })
}

describe('HoldPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW)
    vi.spyOn(api, 'getClass').mockResolvedValue({
      id: 'class-1',
      name: 'ষষ্ঠ শ্রেণি - প্রভাতি',
      totalSeats: 10,
      heldSeats: 1,
      confirmedSeats: 0,
      availableSeats: 9,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts down and switches to EXPIRED without a reload, disabling payment', async () => {
    vi.spyOn(api, 'getHold').mockResolvedValue(hold())
    renderHoldPage()

    expect(await screen.findByText('০০:০৫')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ভর্তি ফি দিন' })).toBeEnabled()

    // The server still says HELD; the screen must not wait for it.
    await act(() => vi.advanceTimersByTimeAsync(5000))

    expect(screen.getByText('EXPIRED')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ভর্তি ফি দিন' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'বাতিল' })).toBeDisabled()
  })

  it('confirms the hold when the student pays', async () => {
    vi.spyOn(api, 'getHold').mockResolvedValue(hold())
    const confirm = vi.spyOn(api, 'confirmHold').mockResolvedValue({ holdId: 'hold-1', status: 'CONFIRMED' })
    renderHoldPage()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.click(await screen.findByRole('button', { name: 'ভর্তি ফি দিন' }))

    expect(confirm).toHaveBeenCalledWith('hold-1', STUDENT_ID)
    expect(await screen.findByText('CONFIRMED')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ভর্তি ফি দিন' })).toBeDisabled()
  })

  it('shows a friendly message when payment is refused', async () => {
    vi.spyOn(api, 'getHold').mockResolvedValue(hold())
    vi.spyOn(api, 'confirmHold').mockRejectedValue(new ApiError(403, 'NOT_YOUR_HOLD', 'Forbidden'))
    renderHoldPage()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.click(await screen.findByRole('button', { name: 'ভর্তি ফি দিন' }))

    expect(await screen.findByText(/অন্য একজন শিক্ষার্থীর/)).toBeInTheDocument()
  })

  it('explains when the application does not exist', async () => {
    vi.spyOn(api, 'getHold').mockRejectedValue(new ApiError(404, 'HOLD_NOT_FOUND', 'Not found'))
    renderHoldPage()

    expect(await screen.findByText('এই আবেদনটি খুঁজে পাওয়া যায়নি।')).toBeInTheDocument()
  })
})
