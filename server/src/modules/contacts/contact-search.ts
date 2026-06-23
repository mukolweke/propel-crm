import { escapeRegex, normalizeEmail, normalizePhone } from '../../utils/normalize.js'
import { notDeletedFilter } from '../../models/Contact.js'
import type { AuthUser } from '../../types/index.js'
import { isSuperAdmin } from '../../middleware/rbac.js'
import { Contact } from '../../models/index.js'

export function buildContactSearchFilter(
  user: AuthUser,
  search?: string,
): Record<string, unknown> {
  const baseFilter = isSuperAdmin(user)
    ? { ...notDeletedFilter }
    : { ownerId: user.id, ...notDeletedFilter }

  const trimmed = search?.trim()
  if (!trimmed) return baseFilter

  const phoneNormalized = normalizePhone(trimmed)
  const emailNormalized = normalizeEmail(trimmed)
  const regex = new RegExp(escapeRegex(trimmed), 'i')

  const orConditions: Record<string, unknown>[] = [
    { fullName: regex },
    { phone: regex },
    { email: regex },
  ]

  if (phoneNormalized) {
    orConditions.push({ phoneNormalized })
  }

  if (emailNormalized.includes('@')) {
    orConditions.push({ emailNormalized })
  }

  return { ...baseFilter, $or: orConditions }
}

export async function searchContacts(user: AuthUser, search?: string) {
  const filter = buildContactSearchFilter(user, search)
  return Contact.find(filter).sort({ updatedAt: -1 })
}
