import { createContext, useContext } from 'react'

export const isValidStudentId = (value: string) => /^\d{17}$/.test(value)

export interface StudentContextValue {
  /** The active 17-digit student ID, or '' when none has been entered yet. */
  studentId: string
  setStudentId: (id: string) => void
}

export const StudentContext = createContext<StudentContextValue | null>(null)

export function useStudent() {
  const context = useContext(StudentContext)
  if (!context) throw new Error('useStudent must be used inside StudentProvider')
  return context
}
