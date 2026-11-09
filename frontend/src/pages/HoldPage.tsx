import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import { friendlyError } from '../api/messages'
import type { Hold, SchoolClass } from '../api/types'
import { Alert } from '../components/Alert'
import { StatusBadge } from '../components/StatusBadge'
import { POLL_INTERVAL_MS } from '../config'
import { useNow } from '../hooks/useNow'
import { usePolling } from '../hooks/usePolling'
import { useStudent } from '../student/studentContext'
import { effectiveStatus, formatCountdown, formatTime, secondsLeft } from '../utils/holds'

/** The application screen: countdown, pay and cancel. */
export function HoldPage() {
  const { holdId = '' } = useParams()
  const { studentId } = useStudent()
  const now = useNow()
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null)

  const hold = usePolling(useCallback((signal: AbortSignal) => api.getHold(holdId, signal), [holdId]), POLL_INTERVAL_MS)

  const classId = hold.data?.classId
  useEffect(() => {
    if (!classId) return
    const controller = new AbortController()
    api.getClass(classId, controller.signal).then(setSchoolClass, () => {})
    return () => controller.abort()
  }, [classId])

  if (hold.error instanceof ApiError && hold.error.status === 404 && !hold.data) {
    return (
      <section className="narrow">
        <Alert>{friendlyError(hold.error)}</Alert>
        <Link to="/my-applications">আমার আবেদনগুলো দেখুন</Link>
      </section>
    )
  }

  if (!hold.data) {
    return (
      <section className="narrow">
        {hold.error != null ? <Alert>{friendlyError(hold.error)}</Alert> : <p className="muted">লোড হচ্ছে…</p>}
      </section>
    )
  }

  const current: Hold = hold.data
  const status = effectiveStatus(current, now)
  const remaining = secondsLeft(current.expiresAt, now)
  const isHeld = status === 'HELD'

  const confirm = async () => {
    setBusy('confirm')
    setActionError(null)
    try {
      const result = await api.confirmHold(current.holdId, studentId)
      hold.setData({ ...current, status: result.status })
    } catch (error) {
      setActionError(friendlyError(error))
      hold.reload()
    } finally {
      setBusy(null)
    }
  }

  const cancel = async () => {
    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই আবেদন বাতিল করতে চান? সিটটি অন্যদের জন্য খুলে দেওয়া হবে।')) return
    setBusy('cancel')
    setActionError(null)
    try {
      await api.cancelHold(current.holdId, studentId)
      hold.setData({ ...current, status: 'CANCELLED' })
    } catch (error) {
      setActionError(friendlyError(error))
      hold.reload()
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="narrow">
      <p>
        <Link to="/my-applications">← আমার আবেদন</Link>
      </p>
      <div className="card hold-card">
        <div className="hold-header">
          <div>
            <p className="muted">ভর্তির আবেদন</p>
            <h1 className="card-title">{schoolClass?.name ?? 'ক্লাস'}</h1>
          </div>
          <StatusBadge status={status} />
        </div>

        {isHeld && (
          <div className={`countdown ${remaining <= 60 ? 'countdown-urgent' : ''}`} role="timer" aria-live="off">
            <span className="countdown-label">ভর্তি ফি দেওয়ার জন্য সময় বাকি</span>
            <span className="countdown-value">{formatCountdown(remaining)}</span>
          </div>
        )}
        {status === 'CONFIRMED' && (
          <Alert kind="success">অভিনন্দন! ভর্তি ফি পরিশোধিত হয়েছে, সিটটি আপনার জন্য নিশ্চিত।</Alert>
        )}
        {status === 'EXPIRED' && (
          <Alert kind="info">
            নির্ধারিত সময়ের মধ্যে ভর্তি ফি দেওয়া হয়নি, তাই সিটটি ছেড়ে দেওয়া হয়েছে।{' '}
            <Link to="/classes">আবার আবেদন করুন</Link>
          </Alert>
        )}
        {status === 'CANCELLED' && <Alert kind="info">এই আবেদনটি বাতিল করা হয়েছে।</Alert>}

        {actionError && <Alert onClose={() => setActionError(null)}>{actionError}</Alert>}
        {hold.error != null && <Alert>{friendlyError(hold.error)}</Alert>}
        {!studentId && isHeld && <Alert kind="info">ফি দিতে বা বাতিল করতে উপরে নিজের জন্ম নিবন্ধন নম্বর দিন।</Alert>}

        <dl className="details">
          <div>
            <dt>আবেদন নম্বর</dt>
            <dd className="mono">{current.holdId}</dd>
          </div>
          <div>
            <dt>মেয়াদ শেষ হবে</dt>
            <dd>{formatTime(current.expiresAt)}</dd>
          </div>
        </dl>

        <div className="actions">
          <button
            type="button"
            className="button"
            disabled={!isHeld || !studentId || busy !== null}
            onClick={confirm}
          >
            {busy === 'confirm' ? 'অপেক্ষা করুন…' : 'ভর্তি ফি দিন'}
          </button>
          <button
            type="button"
            className="button button-danger"
            disabled={!isHeld || !studentId || busy !== null}
            onClick={cancel}
          >
            {busy === 'cancel' ? 'বাতিল হচ্ছে…' : 'বাতিল'}
          </button>
        </div>
      </div>
    </section>
  )
}
