/** Persisted profile roles (DB value → display label). */
export type UserRole = 'admin' | 'family'

export const USER_ROLE_OPTIONS: { value: UserRole | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'admin', label: 'admin' },
  { value: 'family', label: '家' },
]
