import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '@/lib/api'

interface Resource<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** A 403 is an expected answer for a non-admin, not a breakage. */
  forbidden: boolean
  reload: () => void
}

/**
 * Loads one GET endpoint, reloading when `deps` change.
 *
 * Small on purpose: the read-only views are four endpoints with no
 * cross-view caching to do, so this stays cheaper than a query library.
 */
export function useApiResource<T>(load: () => Promise<T>, deps: unknown[]): Resource<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)
    setForbidden(false)

    load()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        if (caught instanceof ApiError && caught.isForbidden) {
          setForbidden(true)
          setError(caught.message)
        } else {
          setError(caught instanceof Error ? caught.message : 'Something went wrong.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, loading, error, forbidden, reload }
}
