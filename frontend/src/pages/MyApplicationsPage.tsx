import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { friendlyError } from '../api/messages'
import { Alert } from '../components/Alert'
import { StatusBadge } from '../components/StatusBadge'
import { POLL_INTERVAL_MS } from '../config'
import { useNow } from '../hooks/useNow'
import { usePolling } from '../hooks/usePolling'
import { useStudent } from '../student/studentContext'
import { effectiveStatus, formatCountdown, formatTime, secondsLeft } from '../utils/holds'

export function MyApplicationsPage() {
  const { studentId } = useStudent()
  const now = useNow()
  const holds = usePolling(
    useMemo(() => (studentId ? (signal: AbortSignal) => api.myHolds(studentId, signal) : null), [studentId]),
    POLL_INTERVAL_MS,
  )

  if (!studentId) {
    return (
      <section>
        <h1>আমার আবেদন</h1>
        <Alert kind="info">নিজের আবেদনগুলো দেখতে উপরে শিক্ষার্থীর ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।</Alert>
      </section>
    )
  }

  return (
    <section>
      <h1>আমার আবেদন</h1>
      <p className="muted">
        জন্ম নিবন্ধন নম্বর <span className="mono">{studentId}</span> দিয়ে করা সব আবেদন, নতুনগুলো আগে।
      </p>

      {holds.error != null && <Alert>{friendlyError(holds.error)}</Alert>}
      {holds.loading && <p className="muted">লোড হচ্ছে…</p>}

      {holds.data?.length === 0 && (
        <div className="empty">
          <p>এই নম্বর দিয়ে এখনো কোনো আবেদন করা হয়নি।</p>
          <Link to="/classes" className="button">
            ক্লাস দেখুন ও আবেদন করুন
          </Link>
        </div>
      )}

      <ul className="list">
        {holds.data?.map((hold) => {
          const status = effectiveStatus(hold, now)
          return (
            <li key={hold.holdId} className="card list-item">
              <div className="list-item-main">
                <h2 className="card-title">{hold.className}</h2>
                <p className="muted">
                  {status === 'HELD'
                    ? `সময় বাকি ${formatCountdown(secondsLeft(hold.expiresAt, now))}`
                    : `মেয়াদ: ${formatTime(hold.expiresAt)}`}
                </p>
              </div>
              <StatusBadge status={status} />
              <Link to={`/holds/${hold.holdId}`} className="button button-secondary">
                {status === 'HELD' ? 'ফি দিন / বিস্তারিত' : 'বিস্তারিত'}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
