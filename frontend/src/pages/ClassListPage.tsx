import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { friendlyError } from '../api/messages'
import type { MyHold, SchoolClass } from '../api/types'
import { Alert } from '../components/Alert'
import { Icon } from '../components/Icon'
import { SeatBar } from '../components/SeatBar'
import { POLL_INTERVAL_MS } from '../config'
import { useNow } from '../hooks/useNow'
import { usePolling } from '../hooks/usePolling'
import { useStudent } from '../student/studentContext'
import { effectiveStatus, toBengaliNumber } from '../utils/holds'

export function ClassListPage() {
  const { studentId } = useStudent()
  const navigate = useNavigate()
  const now = useNow()
  const [applyingTo, setApplyingTo] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  const classes = usePolling(useCallback((signal: AbortSignal) => api.listClasses(signal), []), POLL_INTERVAL_MS)
  const myHolds = usePolling(
    useMemo(() => (studentId ? (signal: AbortSignal) => api.myHolds(studentId, signal) : null), [studentId]),
    POLL_INTERVAL_MS,
  )

  // The student's current (held or confirmed) application per class, if any.
  const activeHoldByClass = new Map<string, MyHold>()
  if (studentId) {
    for (const hold of myHolds.data ?? []) {
      const status = effectiveStatus(hold, now)
      if (status === 'HELD' || status === 'CONFIRMED') activeHoldByClass.set(hold.classId, hold)
    }
  }

  const apply = async (schoolClass: SchoolClass) => {
    setApplyError(null)
    setApplyingTo(schoolClass.id)
    try {
      const hold = await api.holdSeat(schoolClass.id, studentId)
      navigate(`/holds/${hold.holdId}`)
    } catch (error) {
      setApplyError(`"${schoolClass.name}": ${friendlyError(error)}`)
      classes.reload()
      myHolds.reload()
    } finally {
      setApplyingTo(null)
    }
  }

  const summary = classes.data?.length
    ? {
        classCount: classes.data.length,
        totalSeats: classes.data.reduce((sum, c) => sum + c.totalSeats, 0),
        confirmedSeats: classes.data.reduce((sum, c) => sum + c.confirmedSeats, 0),
        availableSeats: classes.data.reduce((sum, c) => sum + c.availableSeats, 0),
      }
    : null

  return (
    <section>
      <div className="page-header">
        <div>
          <p className="eyebrow">ভর্তি ডেস্ক</p>
          <h1>ক্লাস তালিকা</h1>
          <p className="muted">সিটের সংখ্যা প্রতি কয়েক সেকেন্ডে নিজে থেকেই হালনাগাদ হয়।</p>
        </div>
        <Link to="/classes/new" className="button button-secondary admin-action">
          + নতুন ক্লাস <span className="admin-tag">অ্যাডমিন</span>
        </Link>
      </div>

      {summary && (
        <dl className="stat-row">
          <div className="stat-card stat-indigo">
            <span className="stat-icon">
              <Icon size={18}>
                <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
                <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
              </Icon>
            </span>
            <dt>মোট ক্লাস</dt>
            <dd>{toBengaliNumber(summary.classCount)}</dd>
            <p>ভর্তির জন্য খোলা</p>
          </div>
          <div className="stat-card stat-blue">
            <span className="stat-icon">
              <Icon size={18}>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </Icon>
            </span>
            <dt>মোট সিট</dt>
            <dd>{toBengaliNumber(summary.totalSeats)}</dd>
            <p>সব ক্লাস মিলিয়ে</p>
          </div>
          <div className="stat-card stat-green">
            <span className="stat-icon">
              <Icon size={18}>
                <circle cx="12" cy="12" r="9" />
                <path d="m8 12 3 3 5-6" />
              </Icon>
            </span>
            <dt>নিশ্চিত ভর্তি</dt>
            <dd>{toBengaliNumber(summary.confirmedSeats)}</dd>
            <p>ফি দেওয়া হয়েছে</p>
          </div>
          <div className="stat-card stat-amber">
            <span className="stat-icon">
              <Icon size={18}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </Icon>
            </span>
            <dt>খালি সিট</dt>
            <dd>{toBengaliNumber(summary.availableSeats)}</dd>
            <p>এখনই আবেদন করা যাবে</p>
          </div>
        </dl>
      )}

      {!studentId && <Alert kind="info">আবেদন করতে উপরে শিক্ষার্থীর ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।</Alert>}
      {applyError && <Alert onClose={() => setApplyError(null)}>{applyError}</Alert>}
      {classes.error != null && (
        <Alert>
          {friendlyError(classes.error)}
          {classes.data && ' নিচে সর্বশেষ পাওয়া তথ্য দেখানো হচ্ছে।'}
        </Alert>
      )}

      {classes.loading && <p className="muted">লোড হচ্ছে…</p>}

      {classes.data?.length === 0 && (
        <div className="empty">
          <p>এখনো কোনো ক্লাস তৈরি করা হয়নি।</p>
          <Link to="/classes/new" className="button">
            প্রথম ক্লাস তৈরি করুন
          </Link>
        </div>
      )}

      <ul className="card-grid">
        {classes.data?.map((schoolClass) => {
          const activeHold = activeHoldByClass.get(schoolClass.id)
          const full = schoolClass.availableSeats <= 0
          return (
            <li key={schoolClass.id} className={full ? 'card class-card class-card-full' : 'card class-card'}>
              <h2 className="card-title">{schoolClass.name}</h2>
              <SeatBar schoolClass={schoolClass} />
              <dl className="seat-stats">
                <div>
                  <dt>মোট সিট</dt>
                  <dd>{toBengaliNumber(schoolClass.totalSeats)}</dd>
                </div>
                <div>
                  <dt>সংরক্ষিত</dt>
                  <dd>{toBengaliNumber(schoolClass.heldSeats)}</dd>
                </div>
                <div>
                  <dt>নিশ্চিত</dt>
                  <dd>{toBengaliNumber(schoolClass.confirmedSeats)}</dd>
                </div>
                <div>
                  <dt>খালি</dt>
                  <dd className={full ? 'text-danger' : 'text-success'}>{toBengaliNumber(schoolClass.availableSeats)}</dd>
                </div>
              </dl>
              {activeHold ? (
                <Link to={`/holds/${activeHold.holdId}`} className="button button-secondary button-block">
                  আমার আবেদন দেখুন
                </Link>
              ) : (
                <button
                  type="button"
                  className="button button-block"
                  disabled={!studentId || full || applyingTo !== null}
                  onClick={() => apply(schoolClass)}
                >
                  {applyingTo === schoolClass.id ? 'আবেদন হচ্ছে…' : full ? 'সিট খালি নেই' : 'আবেদন করুন'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
