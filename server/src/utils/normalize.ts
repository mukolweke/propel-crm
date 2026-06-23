import { env } from '../config/env.js'

const DEFAULT_COUNTRY_CODE = env.DEFAULT_PHONE_COUNTRY_CODE

/** Strip formatting characters from a phone string. */
function stripPhoneFormatting(phone: string): string {
  return phone.replace(/[\s\-().[\]]/g, '')
}

/**
 * Normalize a phone number into a single comparable E.164-style format.
 *
 * Examples (Kenya +254):
 *   0712345678      → +254712345678
 *   254712345678    → +254712345678
 *   +254712345678   → +254712345678
 */
export function normalizePhone(
  phone: string | null | undefined,
  countryCode = DEFAULT_COUNTRY_CODE,
): string {
  if (!phone?.trim()) return ''

  const cleaned = stripPhoneFormatting(phone.trim())

  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1).replace(/\D/g, '')
    return digits ? `+${digits}` : ''
  }

  const digits = cleaned.replace(/\D/g, '')
  if (!digits) return ''

  if (digits.startsWith('0')) {
    return `+${countryCode}${digits.slice(1)}`
  }

  if (digits.startsWith(countryCode)) {
    return `+${digits}`
  }

  return `+${digits}`
}

/** Lowercase and trim an email for duplicate comparison. */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email?.trim()) return ''
  return email.trim().toLowerCase()
}

/** Escape special regex characters for safe MongoDB regex search. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
