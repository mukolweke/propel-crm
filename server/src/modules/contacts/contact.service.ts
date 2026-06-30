import { Types } from 'mongoose'
import { Contact, FollowUp, Interaction, SharedAccess, User, notDeletedFilter } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'
import {
  assertCanEdit,
  assertCanView,
  assertIsOwner,
} from '../../middleware/authorization.js'
import {
  findContactForUser,
  type ContactAccessMode,
} from '../../middleware/query-scope.js'
import { isSuperAdmin } from '../../middleware/rbac.js'
import { parseInput, contactInputSchema, contactUpdateSchema } from '../../validators/index.js'
import { maskPhone, sanitizeMetadata } from '../../utils/sanitize.js'
import { auditService } from '../audit/audit.service.js'
import { assertNoDuplicateContact, checkContactDuplicate } from './contact-duplicate.service.js'
import { searchContactsPaginated } from './contact-search.js'
import { findReportableContacts } from '../reports/report-access.js'
import type { AuthUser, PaginatedResult } from '../../types/index.js'

async function getSharesForContact(contactId: string) {
  return SharedAccess.find({ contactId })
}

async function getContactForUser(user: AuthUser, contactId: string, mode: ContactAccessMode) {
  const contact = await findContactForUser(user, contactId, mode)
  if (!contact) throw new AppError('Contact not found', 'NOT_FOUND', 404)
  return contact
}

export const contactService = {
  async myContacts(
    user: AuthUser,
    options: { search?: string; page?: number; pageSize?: number } = {},
  ) {
    return searchContactsPaginated(user, options)
  },

  async reportableContacts(user: AuthUser) {
    return findReportableContacts(user)
  },

  async sharedContacts(userId: string) {
    const shares = await SharedAccess.find({ sharedUserId: userId })
    const contactIds = shares.map((s) => s.contactId)
    if (!contactIds.length) return []
    return Contact.find({ _id: { $in: contactIds }, ...notDeletedFilter }).sort({ updatedAt: -1 })
  },

  async getContact(user: AuthUser, contactId: string) {
    const contact = await getContactForUser(user, contactId, 'view')
    if (isSuperAdmin(user)) return contact
    const shares = await getSharesForContact(contactId)
    assertCanView(user.id, contact, shares)
    return contact
  },

  async createContact(user: AuthUser, input: unknown, meta: { ip?: string; userAgent?: string }) {
    const data = parseInput(contactInputSchema, input)

    await assertNoDuplicateContact(user, data.phone ?? '', data.email ?? '', undefined, meta)

    const contact = await Contact.create({
      ...data,
      ownerId: new Types.ObjectId(user.id),
      nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
    })

    await auditService.log({
      action: 'CONTACT_CREATED',
      entityType: 'CONTACT',
      entityId: contact._id.toString(),
      performedBy: user,
      ownerId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      metadata: { after: { fullName: contact.fullName, status: contact.status } },
    })

    return contact
  },

  async updateContact(
    user: AuthUser,
    contactId: string,
    input: unknown,
    meta: { ip?: string; userAgent?: string },
  ) {
    const contact = await getContactForUser(user, contactId, 'edit')
    const shares = await getSharesForContact(contactId)
    if (!isSuperAdmin(user)) assertCanEdit(user.id, contact, shares)

    const before = sanitizeMetadata({
      fullName: contact.fullName,
      phone: maskPhone(contact.phone),
      status: contact.status,
    })

    const data = parseInput(contactUpdateSchema, input)

    if (data.phone !== undefined || data.email !== undefined) {
      const phoneToCheck = data.phone !== undefined ? data.phone : contact.phone
      const emailToCheck = data.email !== undefined ? data.email : contact.email
      await assertNoDuplicateContact(user, phoneToCheck, emailToCheck, contactId, meta)
    }

    Object.assign(contact, {
      ...data,
      nextFollowUpDate: data.nextFollowUpDate
        ? new Date(data.nextFollowUpDate)
        : data.nextFollowUpDate === null
          ? undefined
          : contact.nextFollowUpDate,
      isConverted: data.status === 'converted' ? true : contact.isConverted,
    })
    await contact.save()

    await auditService.log({
      action: 'CONTACT_UPDATED',
      entityType: 'CONTACT',
      entityId: contact._id.toString(),
      performedBy: user,
      ownerId: contact.ownerId.toString(),
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      metadata: {
        before,
        after: { fullName: contact.fullName, status: contact.status },
      },
    })

    return contact
  },

  async deleteContact(
    user: AuthUser,
    contactId: string,
    meta: { ip?: string; userAgent?: string },
  ) {
    const contact = await getContactForUser(user, contactId, 'owner')
    if (!isSuperAdmin(user)) assertIsOwner(user.id, contact.ownerId)

    contact.deletedAt = new Date()
    contact.deletedBy = new Types.ObjectId(user.id)
    await contact.save()

    await Promise.all([
      Interaction.deleteMany({ contactId: contact._id }),
      FollowUp.deleteMany({ contactId: contact._id }),
      SharedAccess.deleteMany({ contactId: contact._id }),
    ])

    await auditService.log({
      action: 'CONTACT_DELETED',
      entityType: 'CONTACT',
      entityId: contact._id.toString(),
      performedBy: user,
      ownerId: contact.ownerId.toString(),
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    })

    return true
  },

  async shareContact(
    user: AuthUser,
    contactId: string,
    sharedUserId: string,
    permission: 'view' | 'report' | 'edit',
    meta: { ip?: string; userAgent?: string },
  ) {
    const contact = await getContactForUser(user, contactId, 'owner')
    assertIsOwner(user.id, contact.ownerId)

    if (sharedUserId === user.id) {
      throw new AppError('Cannot share with yourself', 'BAD_REQUEST', 400)
    }

    const share = await SharedAccess.findOneAndUpdate(
      { contactId, sharedUserId },
      { ownerId: contact.ownerId, permission },
      { upsert: true, new: true },
    )

    if (!contact.sharedWith.some((id) => id.toString() === sharedUserId)) {
      contact.sharedWith.push(new Types.ObjectId(sharedUserId))
      await contact.save()
    }

    await auditService.log({
      action: 'CONTACT_SHARED',
      entityType: 'CONTACT',
      entityId: contactId,
      performedBy: user,
      ownerId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      metadata: { sharedUserId, permission },
    })

    return share
  },

  async assertContactAccess(user: AuthUser, contactId: string, requireEdit = false) {
    const mode: ContactAccessMode = requireEdit ? 'edit' : 'view'
    const contact = await getContactForUser(user, contactId, mode)
    if (isSuperAdmin(user)) return { contact, shares: [] as Awaited<ReturnType<typeof getSharesForContact>> }
    const shares = await getSharesForContact(contactId)
    if (requireEdit) assertCanEdit(user.id, contact, shares)
    else assertCanView(user.id, contact, shares)
    return { contact, shares }
  },

  async adminListContacts(
    user: AuthUser,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    if (!isSuperAdmin(user)) throw new AppError('Forbidden', 'FORBIDDEN', 403)

    const skip = (page - 1) * pageSize
    const [contacts, total] = await Promise.all([
      Contact.find(notDeletedFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Contact.countDocuments(notDeletedFilter),
    ])

    const ownerIds = [...new Set(contacts.map((c) => c.ownerId.toString()))]
    const owners = await User.find({ _id: { $in: ownerIds } }).select('fullName email').lean()
    const ownerMap = new Map(owners.map((o) => [o._id.toString(), o]))

    const items = contacts.map((c) => {
      const owner = ownerMap.get(c.ownerId.toString())
      return {
        id: c._id.toString(),
        ownerName: owner?.fullName ?? 'Unknown',
        ownerEmail: owner?.email ?? '',
        contactName: c.fullName,
        phone: c.phone,
        status: c.status,
        createdAt: c.createdAt,
      }
    })

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    }
  },

  checkDuplicate(
    user: AuthUser,
    phone: string,
    email: string,
    excludeContactId?: string,
  ) {
    return checkContactDuplicate(user, phone, email, excludeContactId)
  },
}
