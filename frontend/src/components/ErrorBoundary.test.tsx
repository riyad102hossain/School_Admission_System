import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Broken(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('shows a Bengali message and a reload button instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('কিছু একটা ভুল হয়েছে')
    expect(screen.getByRole('button', { name: 'আবার লোড করুন' })).toBeInTheDocument()
  })

  it('renders its children when nothing goes wrong', () => {
    render(
      <ErrorBoundary>
        <p>সব ঠিক আছে</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('সব ঠিক আছে')).toBeInTheDocument()
  })
})
