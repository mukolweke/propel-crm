import { Types } from 'mongoose'
import { Contact, SharedAccess } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'
import {
  assertCanEdit,
  assertCanView,
  assertIsOwner,
  canViewContact,
} from '../../middleware/authorization.js'
import { parseInput, contactInputSchema, contactUpdateSchema } from '../../validators/index.js'

async function getSharesForContact(contactId: string) {
  return SharedAccess.find({ contactId })
}

async function getContactOrThrow(contactId: string) {
  const contact = await Contact.findById(contactId)
  if (!contact) throw new AppError('Contact not found', 'NOT_FOUND', 404)
  return contact
}

export const contactService = {
  async myContacts(userId: string) {
    return Contact.find({ ownerId: userId }).sort({ updatedAt: -1 })
  },

  async sharedContacts(userId: string) {
    const shares = await SharedAccess.find({ sharedUserId: userId })
    const contactIds = shares.map((s) => s.contactId)
    if (!contactIds.length) return []
    return Contact.find({ _id: { $in: contactIds } }).sort({ updatedAt: -1 })
  },

  async getContact(userId: string, contactId: string) {
    const contact = await getContactOrThrow(contactId)
    const shares = await getSharesForContact(contactId)
    assertCanView(userId, contact, shares)
    return contact
  },

  async createContact(userId: string, input: unknown) {
    const data = parseInput(contactInputSchema, input)
    return Contact.create({
      ...data,
      ownerId: new Types.ObjectId(userId),
      email: data.email || '',
      status: data.status ?? 'new',
      nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
    })
  },

  async updateContact(userId: string, contactId: string, input: unknown) {
    const contact = await getContactOrThrow(contactId)
    const shares = await getSharesForContact(contactId)
    assertCanEdit(userId, contact, shares)

    const data = parseInput(contactUpdateSchema, input)
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
    return contact
  },

  async deleteContact(userId: string, contactId: string) {
    const contact = await getContactOrThrow(contactId)
    assertIsOwner(userId, contact.ownerId)
    await SharedAccess.deleteMany({ contactId })
    await contact.deleteOne()
    return true
  },

  async shareContact(
    userId: string,
    contactId: string,
    sharedUserId: string,
    permission: 'view' | 'report' | 'edit',
  ) {
    const contact = await getContactOrThrow(contactId)
    assertIsOwner(userId, contact.ownerId)

    if (sharedUserId === userId) {
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

    return share
  },

  async getAccessibleContactIds(userId: string): Promise<Types.ObjectId[]> {
    const owned = await Contact.find({ ownerId: userId }).select('_id')
    const shares = await SharedAccess.find({ sharedUserId: userId }).select('contactId')
    const ids = new Set([
      ...owned.map((c) => c._id.toString()),
      ...shares.map((s) => s.contactId.toString()),
    ])
    return [...ids].map((id) => new Types.ObjectId(id))
  },

  async assertContactAccess(userId: string, contactId: string, requireEdit = false) {
    const contact = await getContactOrThrow(contactId)
    const shares = await getSharesForContact(contactId)
    if (requireEdit) assertCanEdit(userId, contact, shares)
    else assertCanView(userId, contact, shares)
    return { contact, shares }
  },

  canViewContact,
}
