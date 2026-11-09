import { useState, type FormEvent } from 'react'
import { isValidStudentId, useStudent } from '../student/studentContext'

/** The student ID box at the top of every page. All requests are made for this student. */
export function StudentBar() {
  const { studentId, setStudentId } = useStudent()
  const [draft, setDraft] = useState(studentId)
  const [touched, setTouched] = useState(false)

  const valid = isValidStudentId(draft)
  const changed = draft !== studentId

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (valid) setStudentId(draft)
  }

  return (
    <form className="student-bar" onSubmit={submit} noValidate>
      <label htmlFor="student-id">শিক্ষার্থীর জন্ম নিবন্ধন নম্বর</label>
      <div className="student-bar-row">
        <input
          id="student-id"
          inputMode="numeric"
          autoComplete="off"
          placeholder="১৭ অঙ্কের নম্বর, যেমন 20151234567890123"
          maxLength={17}
          value={draft}
          aria-invalid={touched && !valid}
          aria-describedby="student-id-hint"
          onChange={(e) => {
            setDraft(e.target.value.replace(/\D/g, ''))
            setTouched(false)
          }}
        />
        <button type="submit" className="button" disabled={!changed && Boolean(studentId)}>
          {studentId && !changed ? 'সংরক্ষিত' : 'সংরক্ষণ করুন'}
        </button>
      </div>
      <p id="student-id-hint" className={touched && !valid ? 'hint hint-error' : 'hint'}>
        {touched && !valid
          ? `নম্বরটি ঠিক ১৭ অঙ্কের হতে হবে (এখন ${draft.length} অঙ্ক)।`
          : studentId
            ? changed
              ? 'নতুন নম্বর ব্যবহার করতে "সংরক্ষণ করুন" চাপুন।'
              : 'এই নম্বর দিয়ে আবেদন করা হবে। ব্রাউজার বন্ধ করলেও মনে থাকবে।'
            : 'আবেদন করতে বা নিজের আবেদন দেখতে আগে নম্বরটি দিন।'}
      </p>
    </form>
  )
}
