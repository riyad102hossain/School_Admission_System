import { describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { friendlyError } from './messages'

describe('friendlyError', () => {
  it('translates known error codes', () => {
    expect(friendlyError(new ApiError(409, 'NO_SEATS_AVAILABLE', 'No seats'))).toContain('কোনো সিট খালি নেই')
    expect(friendlyError(new ApiError(0, 'NETWORK_ERROR', 'down'))).toContain('যোগাযোগ করা যাচ্ছে না')
  })

  it('keeps the server detail for validation errors', () => {
    expect(friendlyError(new ApiError(400, 'VALIDATION_ERROR', 'totalSeats must be at least 1.'))).toContain(
      'totalSeats must be at least 1.',
    )
  })

  it('falls back to a readable message for anything unexpected', () => {
    expect(friendlyError(new ApiError(500, 'INTERNAL_ERROR', 'boom'))).toContain('সার্ভারে একটি সমস্যা')
    expect(friendlyError(new TypeError('x'))).toContain('আবার চেষ্টা করুন')
  })
})
