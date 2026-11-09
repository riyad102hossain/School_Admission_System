import { useCallback, useEffect, useRef, useState } from 'react'

interface PollingState<T> {
  data: T | undefined
  error: unknown
  loading: boolean
}

/**
 * Loads data now and again every `intervalMs` until the component unmounts.
 * The next request starts only after the previous one finished, so a slow server
 * never gets a pile of overlapping requests. `load` must be memoised (useCallback);
 * when it changes, polling restarts with the new function.
 */
export function usePolling<T>(load: ((signal: AbortSignal) => Promise<T>) | null, intervalMs: number) {
  const [state, setState] = useState<PollingState<T>>({ data: undefined, error: undefined, loading: load !== null })
  const [reloadToken, setReloadToken] = useState(0)
  const lastLoad = useRef(load)

  useEffect(() => {
    // A different source (e.g. another student ID): drop the old data instead of showing it.
    if (lastLoad.current !== load) {
      lastLoad.current = load
      setState({ data: undefined, error: undefined, loading: load !== null })
    }
    if (!load) return

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined

    const run = async () => {
      try {
        const data = await load(controller.signal)
        if (!controller.signal.aborted) setState({ data, error: undefined, loading: false })
      } catch (error) {
        if (controller.signal.aborted) return
        // Keep showing the last good data; the error is shown next to it.
        setState((previous) => ({ data: previous.data, error, loading: false }))
      }
      if (!controller.signal.aborted) timer = setTimeout(run, intervalMs)
    }

    run()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [load, intervalMs, reloadToken])

  const reload = useCallback(() => setReloadToken((n) => n + 1), [])
  const setData = useCallback((data: T) => setState({ data, error: undefined, loading: false }), [])

  return { ...state, reload, setData }
}
