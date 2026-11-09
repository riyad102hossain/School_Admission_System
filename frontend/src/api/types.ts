export type HoldStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED'

export interface SchoolClass {
  id: string
  name: string
  totalSeats: number
  heldSeats: number
  confirmedSeats: number
  availableSeats: number
}

export interface CreatedHold {
  holdId: string
  classId: string
  studentId: string
  status: HoldStatus
  expiresAt: string
}

export interface Hold {
  holdId: string
  classId: string
  status: HoldStatus
  expiresAt: string
}

export interface MyHold extends Hold {
  className: string
}

export interface ConfirmedHold {
  holdId: string
  status: HoldStatus
}
