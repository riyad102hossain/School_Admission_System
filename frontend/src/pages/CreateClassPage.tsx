import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { friendlyError } from '../api/messages'
import type { SchoolClass } from '../api/types'
import { Alert } from '../components/Alert'
import { toBengaliNumber } from '../utils/holds'

const MAX_NAME_LENGTH = 200

export function CreateClassPage() {
  const [name, setName] = useState('')
  const [seats, setSeats] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<SchoolClass | null>(null)

  const trimmedName = name.trim()
  const seatCount = Number(seats)
  const nameError = !trimmedName
    ? 'ক্লাসের নাম দিন।'
    : trimmedName.length > MAX_NAME_LENGTH
      ? `নাম সর্বোচ্চ ${toBengaliNumber(MAX_NAME_LENGTH)} অক্ষরের হতে পারে।`
      : null
  const seatsError = !seats
    ? 'মোট সিট সংখ্যা দিন।'
    : !Number.isInteger(seatCount) || seatCount < 1
      ? 'সিট সংখ্যা ১ বা তার বেশি পূর্ণসংখ্যা হতে হবে।'
      : seatCount > 2_147_483_647
        ? 'সিট সংখ্যা অনেক বেশি।'
        : null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setError(null)
    if (nameError || seatsError) return

    setSaving(true)
    try {
      const schoolClass = await api.createClass(trimmedName, seatCount)
      setCreated(schoolClass)
      setName('')
      setSeats('')
      setSubmitted(false)
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="narrow">
      <p className="eyebrow">স্কুল অ্যাডমিন</p>
      <h1>নতুন ক্লাস তৈরি</h1>
      <p className="muted">ক্লাস ও শিফটের নাম এবং মোট কতটি সিট আছে তা লিখুন।</p>

      {created && (
        <Alert kind="success" onClose={() => setCreated(null)}>
          "{created.name}" তৈরি হয়েছে ({toBengaliNumber(created.totalSeats)}টি সিট)।{' '}
          <Link to="/classes">ক্লাস তালিকায় যান</Link>
        </Alert>
      )}
      {error && <Alert onClose={() => setError(null)}>{error}</Alert>}

      <form className="form card" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="class-name">ক্লাসের নাম</label>
          <input
            id="class-name"
            placeholder="যেমন: ষষ্ঠ শ্রেণি - প্রভাতি শিফট"
            value={name}
            maxLength={MAX_NAME_LENGTH + 20}
            aria-invalid={submitted && Boolean(nameError)}
            onChange={(e) => setName(e.target.value)}
          />
          {submitted && nameError && <p className="hint hint-error">{nameError}</p>}
        </div>

        <div className="field">
          <label htmlFor="total-seats">মোট সিট</label>
          <input
            id="total-seats"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="যেমন: 40"
            value={seats}
            aria-invalid={submitted && Boolean(seatsError)}
            onChange={(e) => setSeats(e.target.value)}
          />
          {submitted && seatsError && <p className="hint hint-error">{seatsError}</p>}
        </div>

        <button type="submit" className="button button-block" disabled={saving}>
          {saving ? 'তৈরি হচ্ছে…' : 'ক্লাস তৈরি করুন'}
        </button>
      </form>
    </section>
  )
}
