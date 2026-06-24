import { escapeRegex, normalizeEmail, normalizePhone } from '../../utils/normalize.js'
import { notDeletedFilter } from '../../models/Contact.js'
import type { AuthUser } from '../../types/index.js'
import { isSuperAdmin } from '../../middleware/rbac.js'
import { Contact } from '../../models/index.js'
import { contactSearchSchema, parseInput } from '../../validators/index.js'

export function normalizeContactSearch(search?: string): string | undefined {
  return parseInput(contactSearchSchema, { search }).search
}

export function buildContactSearchFilter(
  user: AuthUser,
  search?: string,
): Record<string, unknown> {
  const baseFilter = isSuperAdmin(user)
    ? { ...notDeletedFilter }
    : { ownerId: user.id, ...notDeletedFilter }

  if (!search) return baseFilter

  const phoneNormalized = normalizePhone(search)
  const emailNormalized = normalizeEmail(search)
  const regex = new RegExp(escapeRegex(search), 'i')

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
  const safeSearch = normalizeContactSearch(search)
  const filter = buildContactSearchFilter(user, safeSearch)
  return Contact.find(filter).sort({ updatedAt: -1 })
}
