const HTML_TAG_REGEX = /<[^>]*>/g
const MONGO_OPERATOR_REGEX = /^\$/

export function sanitizeString(input: string, maxLength = 5000): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(HTML_TAG_REGEX, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, maxLength)
}

export function sanitizeSearchQuery(input: string): string {
  const cleaned = sanitizeString(input, 200)
  if (MONGO_OPERATOR_REGEX.test(cleaned)) return cleaned.slice(1)
  return cleaned
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '****'
  return `${'*'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`
}

export function stripSensitive<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  const copy = { ...obj }
  for (const key of keys) delete copy[key]
  return copy
}

export function sanitizeMetadata(data: Record<string, unknown>): Record<string, unknown> {
  const blocked = ['password', 'token', 'refreshToken', 'accessToken', 'mfaSecret']
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (blocked.some((b) => key.toLowerCase().includes(b))) continue
    if (typeof value === 'string') result[key] = sanitizeString(value)
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeMetadata(value as Record<string, unknown>)
    } else result[key] = value
  }
  return result
}
