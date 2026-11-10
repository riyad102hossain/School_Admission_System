import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { friendlyError } from '../api/messages'
import type { HoldStatus } from '../api/types'
import { Alert } from '../components/Alert'
import { Icon } from '../components/Icon'
import { StatusBadge } from '../components/StatusBadge'
import { POLL_INTERVAL_MS } from '../config'
import { useNow } from '../hooks/useNow'
import { usePolling } from '../hooks/usePolling'
import { useStudent } from '../student/studentContext'
import { effectiveStatus, formatCountdown, formatTime, secondsLeft, toBengaliNumber } from '../utils/holds'

type Filter = 'ALL' | 'HELD' | 'CONFIRMED' | 'CLOSED'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'সব' },
  { key: 'HELD', label: 'চলমান' },
  { key: 'CONFIRMED', label: 'নিশ্চিত' },
  { key: 'CLOSED', label: 'মেয়াদ শেষ / বাতিল' },
]

const matches = (filter: Filter, status: HoldStatus) =>
  filter === 'ALL' ||
  (filter === 'CLOSED' ? status === 'EXPIRED' || status === 'CANCELLED' : status === filter)

const STATUS_ICON: Record<HoldStatus, ReactNode> = {
  HELD: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  CONFIRMED: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  EXPIRED: (
    <>
      <path d="M6 2h12M6 22h12" />
      <path d="M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4" />
    </>
  ),
  CANCELLED: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
}

export function MyApplicationsPage() {
  const { studentId } = useStudent()
  const now = useNow()
  const [filter, setFilter] = useState<Filter>('ALL')
  const holds = usePolling(
    useMemo(() => (studentId ? (signal: AbortSignal) => api.myHolds(studentId, signal) : null), [studentId]),
    POLL_INTERVAL_MS,
  )

  if (!studentId) {
    return (
      <section>
        <p className="eyebrow">শিক্ষার্থীর আবেদন</p>
        <h1>আমার আবেদন</h1>
        <Alert kind="info">নিজের আবেদনগুলো দেখতে উপরে শিক্ষার্থীর ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।</Alert>
      </section>
    )
  }

  const rows = (holds.data ?? []).map((hold) => ({ hold, status: effectiveStatus(hold, now) }))
  const count = (f: Filter) => rows.filter((r) => matches(f, r.status)).length
  const visible = rows.filter((r) => matches(filter, r.status))

  return (
    <section>
      <div className="page-header">
        <div>
          <p className="eyebrow">শিক্ষার্থীর আবেদন</p>
          <h1>আমার আবেদন</h1>
          <p className="muted">এই শিক্ষার্থীর নামে করা সব আবেদন, নতুনগুলো আগে।</p>
          <p className="id-chip">
            <span className="id-chip-label">
              <Icon size={14}>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="9" cy="12" r="2" />
                <path d="M14 10h4M14 14h3" />
              </Icon>
              জন্ম নিবন্ধন নম্বর
            </span>
            <span className="id-chip-value">{studentId}</span>
          </p>
        </div>
        <Link to="/classes" className="button">
          + নতুন আবেদন
        </Link>
      </div>

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

      {rows.length > 0 && (
        <>
          <dl className="stat-row">
            <div className="stat-card stat-indigo">
              <dt>মোট আবেদন</dt>
              <dd>{toBengaliNumber(rows.length)}</dd>
              <p>এই নম্বর দিয়ে করা</p>
            </div>
            <div className="stat-card stat-amber">
              <dt>চলমান</dt>
              <dd>{toBengaliNumber(count('HELD'))}</dd>
              <p>ফি দেওয়ার অপেক্ষায়</p>
            </div>
            <div className="stat-card stat-green">
              <dt>নিশ্চিত ভর্তি</dt>
              <dd>{toBengaliNumber(count('CONFIRMED'))}</dd>
              <p>ফি দেওয়া হয়েছে</p>
            </div>
            <div className="stat-card stat-gray">
              <dt>মেয়াদ শেষ / বাতিল</dt>
              <dd>{toBengaliNumber(count('CLOSED'))}</dd>
              <p>আর সক্রিয় নয়</p>
            </div>
          </dl>

          <div className="filter-tabs" role="group" aria-label="অবস্থা অনুযায়ী দেখুন">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className="filter-tab"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="filter-count">{toBengaliNumber(count(f.key))}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 && <p className="muted filter-empty">এই ভাগে কোনো আবেদন নেই।</p>}

          <ul className="list">
            {visible.map(({ hold, status }) => {
              const held = status === 'HELD'
              const left = secondsLeft(hold.expiresAt, now)
              return (
                <li key={hold.holdId} className={`card app-row app-row-${status.toLowerCase()}`}>
                  <span className="app-row-icon">
                    <Icon size={20}>{STATUS_ICON[status]}</Icon>
                  </span>

                  <div className="app-row-main">
                    <h2 className="card-title">{hold.className}</h2>
                    <p className="app-row-meta">
                      <span>
                        আবেদন নম্বর <span className="mono">{hold.holdId.slice(0, 8)}</span>
                      </span>
                      <span>{held ? `মেয়াদ শেষ হবে ${formatTime(hold.expiresAt)}` : `মেয়াদ ${formatTime(hold.expiresAt)}`}</span>
                    </p>
                  </div>

                  <div className="app-row-side">
                    {held && (
                      <span className={`app-row-timer ${left <= 60 ? 'app-row-timer-urgent' : ''}`}>
                        <Icon size={14}>
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </Icon>
                        {formatCountdown(left)} বাকি
                      </span>
                    )}
                    <StatusBadge status={status} />
                  </div>

                  <Link to={`/holds/${hold.holdId}`} className={held ? 'button' : 'button button-secondary'}>
                    {held ? 'ফি দিতে যান' : 'বিস্তারিত'}
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
