import { Types } from 'mongoose'
import { Contact, SharedAccess } from '../../models/index.js'
import { notDeletedFilter } from '../../models/Contact.js'
import { canReportContact } from '../../middleware/authorization.js'
import { isSuperAdmin } from '../../middleware/rbac.js'
import type { IContact } from '../../models/Contact.js'
import type { ISharedAccess } from '../../models/SharedAccess.js'
import type { AuthUser } from '../../types/index.js'

const REPORT_SHARE_PERMISSIONS = ['report', 'edit'] as const

export async function getSharedReportableContactIds(userId: string): Promise<Types.ObjectId[]> {
  const shares = await SharedAccess.find({
    sharedUserId: userId,
    permission: { $in: [...REPORT_SHARE_PERMISSIONS] },
  }).select('contactId')

  return shares.map((share) => share.contactId)
}

/** Mongo filter for contacts the user may include in activity reports. */
export async function buildReportableContactFilter(user: AuthUser): Promise<Record<string, unknown>> {
  if (isSuperAdmin(user)) {
    return { ...notDeletedFilter }
  }

  const sharedContactIds = await getSharedReportableContactIds(user.id)
  const accessClauses: Record<string, unknown>[] = [{ ownerId: new Types.ObjectId(user.id) }]
  if (sharedContactIds.length > 0) {
    accessClauses.push({ _id: { $in: sharedContactIds } })
  }

  return { ...notDeletedFilter, $or: accessClauses }
}

export async function findReportableContacts(user: AuthUser) {
  const filter = await buildReportableContactFilter(user)
  return Contact.find(filter).sort({ updatedAt: -1 })
}

export async function getSharesByContactId(
  contactIds: Types.ObjectId[] | string[],
): Promise<Map<string, Pick<ISharedAccess, 'sharedUserId' | 'permission'>[]>> {
  if (!contactIds.length) return new Map()

  const shares = await SharedAccess.find({ contactId: { $in: contactIds } }).select(
    'contactId sharedUserId permission',
  )

  const map = new Map<string, Pick<ISharedAccess, 'sharedUserId' | 'permission'>[]>()
  for (const share of shares) {
    const key = share.contactId.toString()
    const existing = map.get(key) ?? []
    existing.push({ sharedUserId: share.sharedUserId, permission: share.permission })
    map.set(key, existing)
  }
  return map
}

/** Second-layer filter using canReportContact after query-level scoping. */
export function filterContactsForReport<T extends Pick<IContact, '_id' | 'ownerId'>>(
  user: AuthUser,
  contacts: T[],
  sharesByContactId: Map<string, Pick<ISharedAccess, 'sharedUserId' | 'permission'>[]>,
): T[] {
  if (isSuperAdmin(user)) return contacts

  return contacts.filter((contact) => {
    const shares = sharesByContactId.get(contact._id.toString()) ?? []
    return canReportContact(user.id, contact, shares)
  })
}
