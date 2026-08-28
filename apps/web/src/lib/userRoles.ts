/** Persisted profile roles (DB value → display label). */
export type UserRole = 'admin' | 'family'

export const USER_ROLE_OPTIONS: { value: UserRole | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'admin', label: 'admin' },
  { value: 'family', label: '家' },
]

export function parseUserRole(value: string | null | undefined): UserRole | null {
  if (value === 'admin' || value === 'family') return value
  return null
}

export function roleDisplayLabel(role: UserRole | null | undefined): string {
  if (role === 'admin') return 'admin'
  if (role === 'family') return '家'
  return '—'
}

/** Admin panel access or admin badge (allowlist or assigned admin role). */
export function hasAdminAccess(
  email: string | null | undefined,
  role: UserRole | null | undefined,
  isAdminEmail: (email: string | null | undefined) => boolean,
): boolean {
  return isAdminEmail(email) || role === 'admin'
}
