import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { STUDENT_ID, renderPage } from '../test/render'
import { StudentBar } from './StudentBar'

describe('StudentBar', () => {
  it('rejects an ID that is not 17 digits', async () => {
    renderPage(<StudentBar />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('শিক্ষার্থীর জন্ম নিবন্ধন নম্বর'), '12345abc')
    await user.click(screen.getByRole('button', { name: 'সংরক্ষণ করুন' }))

    expect(screen.getByText(/ঠিক ১৭ অঙ্কের হতে হবে/)).toBeInTheDocument()
    expect(screen.getByLabelText('শিক্ষার্থীর জন্ম নিবন্ধন নম্বর')).toHaveValue('12345') // letters are dropped
    expect(localStorage.getItem('school-admission.studentId')).toBeNull()
  })

  it('remembers a valid ID across page loads', async () => {
    const { unmount } = renderPage(<StudentBar />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('শিক্ষার্থীর জন্ম নিবন্ধন নম্বর'), STUDENT_ID)
    await user.click(screen.getByRole('button', { name: 'সংরক্ষণ করুন' }))
    unmount()

    // A fresh render stands in for a browser refresh.
    renderPage(<StudentBar />)
    expect(screen.getByLabelText('শিক্ষার্থীর জন্ম নিবন্ধন নম্বর')).toHaveValue(STUDENT_ID)
    expect(screen.getByRole('button', { name: 'সংরক্ষিত' })).toBeDisabled()
  })
})
