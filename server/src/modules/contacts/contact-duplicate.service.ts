import { Types } from 'mongoose'
import { Contact, User, notDeletedFilter, type IContact } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'
import { findContactForUser } from '../../middleware/query-scope.js'
import { isSuperAdmin } from '../../middleware/rbac.js'
import { normalizeEmail, normalizePhone } from '../../utils/normalize.js'
import { isValidObjectId } from '../../utils/objectId.js'
import { maskPhone } from '../../utils/sanitize.js'
import { auditService } from '../audit/audit.service.js'
import type { AuthUser } from '../../types/index.js'

export type DuplicateMatchedField = 'phone' | 'email'
export type DuplicateReason = 'own_duplicate' | 'owned_by_other_agent'

export interface DuplicateOwnerInfo {
  duplicateOwnerId: string
  duplicateOwnerEmail: string
  duplicateOwnerName: string
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  matchedField?: DuplicateMatchedField
  reason?: DuplicateReason
  existingContact?: IContact
  ownerInfo?: DuplicateOwnerInfo
}

export interface ContactDuplicateInfo {
  isDuplicate: boolean
  matchedField?: DuplicateMatchedField
  message?: string
  code?: string
  duplicateOwnerId?: string
  duplicateOwnerEmail?: string
  duplicateOwnerName?: string
}

interface AssertDuplicateMeta {
  ip?: string
  userAgent?: string
}

function resolveMatchedField(
  existing: IContact,
  phoneNormalized: string,
  emailNormalized: string,
): DuplicateMatchedField {
  if (phoneNormalized && existing.phoneNormalized === phoneNormalized) return 'phone'
  if (emailNormalized && existing.emailNormalized === emailNormalized) return 'email'
  return 'phone'
}

/** Builds the MongoDB filter used for duplicate detection (exported for tests). */
export function buildDuplicateQuery(
  phone: string,
  email: string,
  excludeContactId?: string,
): Record<string, unknown> | null {
  const phoneNormalized = normalizePhone(phone)
  const emailNormalized = normalizeEmail(email)

  const orConditions: Record<string, string>[] = []
  if (phoneNormalized) orConditions.push({ phoneNormalized })
  if (emailNormalized) orConditions.push({ emailNormalized })

  if (!orConditions.length) return null

  const filter: Record<string, unknown> = {
    ...notDeletedFilter,
    $or: orConditions,
  }

  if (excludeContactId) {
    filter._id = { $ne: new Types.ObjectId(excludeContactId) }
  }

  return filter
}

/**
 * Returns excludeContactId only when the caller may edit that contact.
 * Foreign or unknown IDs are dropped silently to avoid leaking existence.
 */
export async function resolveExcludeContactId(
  user: AuthUser,
  excludeContactId?: string,
): Promise<string | undefined> {
  if (!excludeContactId?.trim()) return undefined
  if (!isValidObjectId(excludeContactId)) return undefined

  const contact = await findContactForUser(user, excludeContactId, 'edit')
  return contact ? excludeContactId : undefined
}

export async function findDuplicateContact(
  phone: string,
  email: string,
  excludeContactId?: string,
): Promise<DuplicateCheckResult> {
  const phoneNormalized = normalizePhone(phone)
  const emailNormalized = normalizeEmail(email)

  const filter = buildDuplicateQuery(phone, email, excludeContactId)
  if (!filter) return { isDuplicate: false }

  const existing = await Contact.findOne(filter)
  if (!existing) return { isDuplicate: false }

  const matchedField = resolveMatchedField(existing, phoneNormalized, emailNormalized)

  return {
    isDuplicate: true,
    matchedField,
    existingContact: existing,
  }
}

async function loadOwnerInfo(ownerId: string): Promise<DuplicateOwnerInfo | undefined> {
  const owner = await User.findById(ownerId).select('fullName email').lean()
  if (!owner) return undefined
  return {
    duplicateOwnerId: owner._id.toString(),
    duplicateOwnerEmail: owner.email,
    duplicateOwnerName: owner.fullName,
  }
}

function buildDuplicateError(
  user: AuthUser,
  matchedField: DuplicateMatchedField,
  isOwnDuplicate: boolean,
  ownerInfo?: DuplicateOwnerInfo,
): AppError {
  const conflict = resolveDuplicateConflict(user, matchedField, isOwnDuplicate, ownerInfo)
  return new AppError(
    conflict.message,
    conflict.code,
    409,
    conflict.field,
    conflict.extra as Record<string, unknown> | undefined,
  )
}

/** Pure conflict resolver — used by error builder and tests. */
export function resolveDuplicateConflict(
  user: AuthUser,
  matchedField: DuplicateMatchedField,
  isOwnDuplicate: boolean,
  ownerInfo?: DuplicateOwnerInfo,
): {
  code: string
  message: string
  field: string
  extra?: DuplicateOwnerInfo
} {
  if (isOwnDuplicate) {
    return {
      code: 'CONTACT_ALREADY_EXISTS',
      message: 'Contact already exists in your account.',
      field: matchedField,
    }
  }

  if (matchedField === 'phone') {
    return {
      code: 'PHONE_ALREADY_EXISTS',
      message: 'Phone number already exists under another account.',
      field: 'phone',
      extra: isSuperAdmin(user) && ownerInfo ? ownerInfo : undefined,
    }
  }

  return {
    code: 'EMAIL_ALREADY_EXISTS',
    message: 'Email already exists under another account.',
    field: 'email',
    extra: isSuperAdmin(user) && ownerInfo ? ownerInfo : undefined,
  }
}

async function logDuplicateAttempt(
  user: AuthUser,
  phone: string,
  email: string,
  reason: DuplicateReason,
  meta: AssertDuplicateMeta,
) {
  await auditService.log({
    action: 'CONTACT_DUPLICATE_ATTEMPT',
    entityType: 'CONTACT',
    performedBy: user,
    ownerId: user.id,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    metadata: {
      attemptedPhone: maskPhone(phone),
      attemptedEmail: email ? normalizeEmail(email) : '',
      reason,
    },
  })
}

/**
 * Validates that phone/email are not duplicated. Throws AppError on conflict.
 * Super admins receive duplicate owner details in error extensions only.
 */
export async function assertNoDuplicateContact(
  user: AuthUser,
  phone: string,
  email: string,
  excludeContactId: string | undefined,
  meta: AssertDuplicateMeta,
): Promise<void> {
  const safeExcludeId = await resolveExcludeContactId(user, excludeContactId)
  const result = await findDuplicateContact(phone, email, safeExcludeId)
  if (!result.isDuplicate || !result.existingContact || !result.matchedField) return

  const ownerId = result.existingContact.ownerId.toString()
  const isOwnDuplicate = ownerId === user.id
  const reason: DuplicateReason = isOwnDuplicate ? 'own_duplicate' : 'owned_by_other_agent'

  await logDuplicateAttempt(user, phone, email, reason, meta)

  const ownerInfo = isSuperAdmin(user) ? await loadOwnerInfo(ownerId) : undefined
  throw buildDuplicateError(user, result.matchedField, isOwnDuplicate, ownerInfo)
}

/**
 * Privacy-safe duplicate preview for create/update forms.
 * Super admins receive owner details; agents receive generic messages only.
 */
export async function checkContactDuplicate(
  user: AuthUser,
  phone: string,
  email: string,
  excludeContactId?: string,
): Promise<ContactDuplicateInfo> {
  const safeExcludeId = await resolveExcludeContactId(user, excludeContactId)
  const result = await findDuplicateContact(phone, email, safeExcludeId)
  if (!result.isDuplicate || !result.existingContact || !result.matchedField) {
    return { isDuplicate: false }
  }

  const ownerId = result.existingContact.ownerId.toString()
  const isOwnDuplicate = ownerId === user.id

  if (isOwnDuplicate) {
    return {
      isDuplicate: true,
      matchedField: result.matchedField,
      code: 'CONTACT_ALREADY_EXISTS',
      message: 'Contact already exists in your account.',
    }
  }

  const conflict = resolveDuplicateConflict(
    user,
    result.matchedField,
    false,
    isSuperAdmin(user) ? await loadOwnerInfo(ownerId) : undefined,
  )

  const response: ContactDuplicateInfo = {
    isDuplicate: true,
    matchedField: result.matchedField,
    code: conflict.code,
    message: conflict.message,
  }

  if (conflict.extra) {
    response.duplicateOwnerId = conflict.extra.duplicateOwnerId
    response.duplicateOwnerEmail = conflict.extra.duplicateOwnerEmail
    response.duplicateOwnerName = conflict.extra.duplicateOwnerName
  }

  return response
}
