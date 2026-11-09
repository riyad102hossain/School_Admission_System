import type { SchoolClass } from '../api/types'

/** A bar showing confirmed, held and free seats as parts of the total. */
export function SeatBar({ schoolClass }: { schoolClass: SchoolClass }) {
  const { totalSeats, confirmedSeats, heldSeats } = schoolClass
  const percent = (n: number) => `${totalSeats > 0 ? (n / totalSeats) * 100 : 0}%`

  return (
    <div className="seat-bar" aria-hidden="true">
      <span className="seat-bar-confirmed" style={{ width: percent(confirmedSeats) }} />
      <span className="seat-bar-held" style={{ width: percent(heldSeats) }} />
    </div>
  )
}
