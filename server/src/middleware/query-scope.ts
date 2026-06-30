import { Types } from 'mongoose'
import { Contact, SharedAccess } from '../models/index.js'
import { notDeletedFilter } from '../models/Contact.js'
import type { IContact } from '../models/Contact.js'
import type { IFollowUp } from '../models/FollowUp.js'
import type { IInteraction } from '../models/Interaction.js'
import type { SharePermission } from '../types/index.js'
import type { AuthUser } from '../types/index.js'
import { isSuperAdmin } from './rbac.js'
import { parseObjectId } from '../utils/objectId.js'
import { FollowUp, Interaction } from '../models/index.js'

export type ContactAccessMode = 'view' | 'edit' | 'owner'

const VIEW_SHARE_PERMISSIONS: SharePermission[] = ['view', 'report', 'edit']
const EDIT_SHARE_PERMISSIONS: SharePermission[] = ['edit']

export async function getSharedContactIdsForUser(
  userId: string,
  mode: ContactAccessMode,
): Promise<Types.ObjectId[]> {
  if (mode === 'owner') return []

  const permissions = mode === 'edit' ? EDIT_SHARE_PERMISSIONS : VIEW_SHARE_PERMISSIONS
  const shares = await SharedAccess.find({
    sharedUserId: userId,
    permission: { $in: permissions },
  }).select('contactId')

  return shares.map((share) => share.contactId)
}

export function buildContactScopedFilter(
  userId: string,
  contactId: string,
  sharedContactIds: Types.ObjectId[],
  mode: ContactAccessMode,
): Record<string, unknown> {
  parseObjectId(contactId, 'contact ID')
  const base: Record<string, unknown> = { _id: contactId, ...notDeletedFilter }

  if (mode === 'owner') {
    return { ...base, ownerId: userId }
  }

  const accessClauses: Record<string, unknown>[] = [{ ownerId: userId }]
  if (sharedContactIds.length > 0) {
    accessClauses.push({ _id: { $in: sharedContactIds } })
  }

  return { ...base, $or: accessClauses }
}

export function buildContactAdminFilter(contactId: string): Record<string, unknown> {
  parseObjectId(contactId, 'contact ID')
  return { _id: contactId, ...notDeletedFilter }
}

export function buildOwnerEntityFilter(
  userId: string,
  entityId: string,
  isAdmin: boolean,
): Record<string, unknown> {
  parseObjectId(entityId, 'entity ID')
  const base: Record<string, unknown> = { _id: entityId }
  return isAdmin ? base : { ...base, ownerId: userId }
}

export async function findContactForUser(
  user: AuthUser,
  contactId: string,
  mode: ContactAccessMode,
): Promise<IContact | null> {
  if (isSuperAdmin(user)) {
    return Contact.findOne(buildContactAdminFilter(contactId))
  }

  const sharedContactIds = await getSharedContactIdsForUser(user.id, mode)
  const filter = buildContactScopedFilter(user.id, contactId, sharedContactIds, mode)
  return Contact.findOne(filter)
}

export async function findInteractionForUser(
  user: AuthUser,
  interactionId: string,
): Promise<IInteraction | null> {
  const filter = buildOwnerEntityFilter(user.id, interactionId, isSuperAdmin(user))
  return Interaction.findOne(filter)
}

export async function findFollowUpForUser(
  user: AuthUser,
  followUpId: string,
): Promise<IFollowUp | null> {
  const filter = buildOwnerEntityFilter(user.id, followUpId, isSuperAdmin(user))
  return FollowUp.findOne(filter)
}

export async function getAccessibleActiveContactIds(user: AuthUser): Promise<Types.ObjectId[]> {
  if (isSuperAdmin(user)) {
    return Contact.find(notDeletedFilter).distinct('_id')
  }

  const sharedContactIds = await getSharedContactIdsForUser(user.id, 'view')
  const accessClauses: Record<string, unknown>[] = [{ ownerId: user.id }]
  if (sharedContactIds.length > 0) {
    accessClauses.push({ _id: { $in: sharedContactIds } })
  }

  return Contact.find({ ...notDeletedFilter, $or: accessClauses }).distinct('_id')
}
