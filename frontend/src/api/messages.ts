import { ApiError } from './client'
import type { HoldStatus } from './types'

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
  SERVICE_BUSY: 'সার্ভার এই মুহূর্তে ব্যস্ত। কয়েক সেকেন্ড পর আবার চেষ্টা করুন।',
  INVALID_STUDENT_ID: 'জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ অঙ্কের হতে হবে।',
  CLASS_NOT_FOUND: 'এই ক্লাসটি খুঁজে পাওয়া যায়নি।',
  HOLD_NOT_FOUND: 'এই আবেদনটি খুঁজে পাওয়া যায়নি।',
  NOT_FOUND: 'যা খুঁজছেন তা পাওয়া যায়নি।',
  NOT_YOUR_HOLD: 'এই আবেদনটি অন্য একজন শিক্ষার্থীর। উপরের জন্ম নিবন্ধন নম্বরটি মিলিয়ে দেখুন।',
  NO_SEATS_AVAILABLE: 'দুঃখিত, এই ক্লাসে এখন কোনো সিট খালি নেই।',
  ALREADY_APPLIED: 'এই ক্লাসে আপনার একটি আবেদন আগে থেকেই চালু আছে।',
  HOLD_EXPIRED: 'আবেদনের সময় শেষ হয়ে গেছে। চাইলে আবার আবেদন করুন।',
  HOLD_CANCELLED: 'এই আবেদনটি বাতিল করা হয়েছে।',
  ALREADY_CONFIRMED: 'ভর্তি ফি দেওয়া হয়ে গেছে, তাই এই আবেদন আর বাতিল করা যাবে না।',
  VALIDATION_ERROR: 'তথ্যগুলো ঠিকভাবে পূরণ করা হয়নি।',
}

/** A message a parent or student can understand, never a raw error or a blank screen. */
export function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    // Validation messages from the server name the exact field, so keep them.
    if (error.code === 'VALIDATION_ERROR') return `${MESSAGES.VALIDATION_ERROR} (${error.message})`
    if (MESSAGES[error.code]) return MESSAGES[error.code]
    if (error.status >= 500) return 'সার্ভারে একটি সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।'
  }
  return 'কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।'
}

export const STATUS_LABELS: Record<HoldStatus, string> = {
  HELD: 'সিট সংরক্ষিত',
  CONFIRMED: 'ভর্তি নিশ্চিত',
  EXPIRED: 'মেয়াদ শেষ',
  CANCELLED: 'বাতিল',
}
