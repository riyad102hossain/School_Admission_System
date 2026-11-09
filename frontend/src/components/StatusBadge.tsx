import { STATUS_LABELS } from '../api/messages'
import type { HoldStatus } from '../api/types'

export function StatusBadge({ status }: { status: HoldStatus }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {STATUS_LABELS[status]} <span className="badge-code">{status}</span>
    </span>
  )
}
