/**
 * Caller identity — a stub, mirroring backend/app/api/deps.py.
 *
 * Identity is asserted by the `X-User-Email` header and believed. There is no
 * `/me` endpoint, so the server never tells us who we are — email and role are
 * held here on the client and sent on every request.
 *
 * `X-User-Role` is sent deliberately: deps.py -> audit.upsert_user writes that
 * role onto the user row, so sending it keeps the client's idea of the role and
 * the server's in agreement instead of letting them drift.
 */

export type Role = 'user' | 'admin'

export interface Identity {
  email: string
  role: Role
}

const STORAGE_KEY = 'trip-planner.identity'

export const DEFAULT_IDENTITY: Identity = {
  email: 'demo@example.com',
  role: 'user',
}

function readStored(): Identity {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_IDENTITY

    const parsed = JSON.parse(raw) as Partial<Identity>
    return {
      email: parsed.email || DEFAULT_IDENTITY.email,
      role: parsed.role === 'admin' ? 'admin' : 'user',
    }
  } catch {
    return DEFAULT_IDENTITY
  }
}

// Module-level so the axios interceptor and the stream client can both read the
// current identity without threading it through every call site.
let current: Identity = readStored()

export function getIdentity(): Identity {
  return current
}

export function setIdentity(next: Identity): void {
  current = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // A private-mode storage failure should not break the app.
  }
}

export function identityHeaders(identity: Identity = current): Record<string, string> {
  return {
    'X-User-Email': identity.email,
    'X-User-Role': identity.role,
  }
}
