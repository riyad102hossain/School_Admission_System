import { useEffect, useState } from 'react'

/** Current time in milliseconds, updated every `intervalMs`. Drives the countdowns. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
