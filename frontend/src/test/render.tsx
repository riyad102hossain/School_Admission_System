import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { StudentProvider } from '../student/StudentProvider'

export const STUDENT_ID = '20151234567890123'

/** Renders a page at `path`, as the router would, with an optional saved student ID. */
export function renderPage(element: ReactElement, { path = '/', route = '/', studentId = '' } = {}) {
  if (studentId) localStorage.setItem('school-admission.studentId', studentId)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StudentProvider>
        <Routes>
          <Route path={route} element={element} />
          <Route path="*" element={<p>other page</p>} />
        </Routes>
      </StudentProvider>
    </MemoryRouter>,
  )
}
