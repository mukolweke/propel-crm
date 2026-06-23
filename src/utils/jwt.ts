/** Client-side JWT expiry check (no signature verification). */
export function isTokenExpired(token: string | null | undefined, skewSeconds = 30): boolean {
  if (!token) return true
  try {
    const segment = token.split('.')[1]
    if (!segment) return true
    const payload = JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    if (!payload.exp) return true
    return payload.exp * 1000 <= Date.now() + skewSeconds * 1000
  } catch {
    return true
  }
}
