import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '../api/client'
import type { SchoolClass } from '../api/types'
import { STUDENT_ID, renderPage } from '../test/render'
import { ClassListPage } from './ClassListPage'

const schoolClass = (overrides: Partial<SchoolClass> = {}): SchoolClass => ({
  id: 'class-1',
  name: 'ষষ্ঠ শ্রেণি - প্রভাতি',
  totalSeats: 2,
  heldSeats: 1,
  confirmedSeats: 0,
  availableSeats: 1,
  ...overrides,
})

describe('ClassListPage', () => {
  it('asks for a student ID before allowing an application', async () => {
    vi.spyOn(api, 'listClasses').mockResolvedValue([schoolClass()])
    const myHolds = vi.spyOn(api, 'myHolds')
    renderPage(<ClassListPage />)

    expect(await screen.findByRole('button', { name: 'আবেদন করুন' })).toBeDisabled()
    expect(screen.getByText(/শিক্ষার্থীর ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন/)).toBeInTheDocument()
    expect(myHolds).not.toHaveBeenCalled()
  })

  it('disables applying to a full class', async () => {
    vi.spyOn(api, 'listClasses').mockResolvedValue([schoolClass({ heldSeats: 2, availableSeats: 0 })])
    vi.spyOn(api, 'myHolds').mockResolvedValue([])
    renderPage(<ClassListPage />, { studentId: STUDENT_ID })

    expect(await screen.findByRole('button', { name: 'সিট খালি নেই' })).toBeDisabled()
  })

  it('shows a friendly message when the last seat was taken first', async () => {
    vi.spyOn(api, 'listClasses').mockResolvedValue([schoolClass()])
    vi.spyOn(api, 'myHolds').mockResolvedValue([])
    vi.spyOn(api, 'holdSeat').mockRejectedValue(new ApiError(409, 'NO_SEATS_AVAILABLE', 'No seats'))
    renderPage(<ClassListPage />, { studentId: STUDENT_ID })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'আবেদন করুন' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('দুঃখিত, এই ক্লাসে এখন কোনো সিট খালি নেই।')
  })

  it('links to the existing application instead of applying twice', async () => {
    vi.spyOn(api, 'listClasses').mockResolvedValue([schoolClass()])
    vi.spyOn(api, 'myHolds').mockResolvedValue([
      {
        holdId: 'hold-1',
        classId: 'class-1',
        className: 'ষষ্ঠ শ্রেণি - প্রভাতি',
        status: 'HELD',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    ])
    renderPage(<ClassListPage />, { studentId: STUDENT_ID })

    expect(await screen.findByRole('link', { name: 'আমার আবেদন দেখুন' })).toHaveAttribute('href', '/holds/hold-1')
    expect(screen.queryByRole('button', { name: 'আবেদন করুন' })).not.toBeInTheDocument()
  })
})
