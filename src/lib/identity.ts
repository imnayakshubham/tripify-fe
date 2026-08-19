

export type Role = 'user' | 'admin'

export interface Identity {
  email: string
  role: Role
}

const STORAGE_KEY = 'trip-planner.identity'

const DEFAULT_IDENTITY: Identity = {
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

// Module-level so the axios interceptor and the stream client read the same value.
let current: Identity = readStored()

export function getIdentity(): Identity {
  return current
}

export function setIdentity(next: Identity): void {
  current = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode: storage is unavailable, in-memory identity still works.
  }
}

export function identityHeaders(identity: Identity = current): Record<string, string> {
  return {
    'X-User-Email': identity.email,
    'X-User-Role': identity.role,
  }
}
