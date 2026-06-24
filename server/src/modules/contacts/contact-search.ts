import { escapeRegex, normalizeEmail, normalizePhone } from '../../utils/normalize.js'
import { notDeletedFilter } from '../../models/Contact.js'
import type { AuthUser, PaginatedResult } from '../../types/index.js'
import { isSuperAdmin } from '../../middleware/rbac.js'
import { Contact } from '../../models/index.js'
import type { IContact } from '../../models/Contact.js'
import { contactSearchSchema, myContactsQuerySchema, parseInput } from '../../validators/index.js'

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

export async function searchContactsPaginated(
  user: AuthUser,
  options: { search?: string; page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<IContact>> {
  const data = parseInput(myContactsQuerySchema, options)
  const safeSearch = normalizeContactSearch(data.search)
  const filter = buildContactSearchFilter(user, safeSearch)

  if (!isSuperAdmin(user)) {
    const items = await Contact.find(filter).sort({ updatedAt: -1 })
    const total = items.length
    return {
      items,
      total,
      page: 1,
      pageSize: total || 1,
      totalPages: 1,
    }
  }

  const skip = (data.page - 1) * data.pageSize
  const [items, total] = await Promise.all([
    Contact.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(data.pageSize),
    Contact.countDocuments(filter),
  ])

  return {
    items,
    total,
    page: data.page,
    pageSize: data.pageSize,
    totalPages: Math.ceil(total / data.pageSize) || 1,
  }
}
