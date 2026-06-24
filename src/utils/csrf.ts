/** Read the double-submit CSRF cookie set by the API (not httpOnly). */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)propel_csrf=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

/** Remove legacy bearer tokens from browser storage after cookie-auth migration. */
export function clearLegacyAuthStorage(): void {
  const legacyKeys = ['propel_auth_token', 'propel_auth_refresh', 'propel_auth_user', 'propel_remember_me']
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of legacyKeys) {
      storage.removeItem(key)
    }
  }
}
