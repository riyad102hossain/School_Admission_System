import { API_URL } from '../config'
import type { ConfirmedHold, CreatedHold, Hold, MyHold, SchoolClass } from './types'

/** A failed request. `code` is the backend's error code, or NETWORK_ERROR when the server could not be reached. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: string
  studentId?: string
  body?: unknown
  signal?: AbortSignal
}

async function request<T>(path: string, { method = 'GET', studentId, body, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (studentId) headers['X-Student-Id'] = studentId
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      payload?.error ?? `HTTP_${response.status}`,
      payload?.message ?? response.statusText,
    )
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

export const api = {
  listClasses: (signal?: AbortSignal) => request<SchoolClass[]>('/classes', { signal }),

  getClass: (classId: string, signal?: AbortSignal) =>
    request<SchoolClass>(`/classes/${encodeURIComponent(classId)}`, { signal }),

  createClass: (name: string, totalSeats: number) =>
    request<SchoolClass>('/classes', { method: 'POST', body: { name, totalSeats } }),

  holdSeat: (classId: string, studentId: string) =>
    request<CreatedHold>(`/classes/${encodeURIComponent(classId)}/holds`, { method: 'POST', studentId }),

  getHold: (holdId: string, signal?: AbortSignal) =>
    request<Hold>(`/holds/${encodeURIComponent(holdId)}`, { signal }),

  confirmHold: (holdId: string, studentId: string) =>
    request<ConfirmedHold>(`/holds/${encodeURIComponent(holdId)}/confirm`, { method: 'POST', studentId }),

  cancelHold: (holdId: string, studentId: string) =>
    request<void>(`/holds/${encodeURIComponent(holdId)}`, { method: 'DELETE', studentId }),

  myHolds: (studentId: string, signal?: AbortSignal) =>
    request<MyHold[]>('/me/holds', { studentId, signal }),
}
