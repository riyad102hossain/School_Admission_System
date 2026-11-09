import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { StudentContext, isValidStudentId } from './studentContext'

const STORAGE_KEY = 'school-admission.studentId'

function readStoredId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? ''
    return isValidStudentId(stored) ? stored : ''
  } catch {
    return ''
  }
}

/** Keeps the student ID in localStorage, so applications are still visible after a refresh. */
export function StudentProvider({ children }: { children: ReactNode }) {
  const [studentId, setState] = useState(readStoredId)

  const setStudentId = useCallback((id: string) => {
    setState(id)
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage can be unavailable (private mode); the ID still works for this session.
    }
  }, [])

  const value = useMemo(() => ({ studentId, setStudentId }), [studentId, setStudentId])
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}
