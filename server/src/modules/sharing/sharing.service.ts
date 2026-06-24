import { SharedAccess } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'
import { assertIsOwner } from '../../middleware/authorization.js'
import { findContactForUser } from '../../middleware/query-scope.js'
import { parseInput, shareInputSchema } from '../../validators/index.js'
import { contactService } from '../contacts/contact.service.js'
import type { AuthUser } from '../../types/index.js'

export const sharingService = {
  async sharedUsers(userId: string) {
    return SharedAccess.find({ ownerId: userId })
  },

  async sharedContactsForUser(userId: string) {
    return contactService.sharedContacts(userId)
  },

  async grantAccess(user: AuthUser, input: unknown, meta: { ip?: string; userAgent?: string }) {
    const data = parseInput(shareInputSchema, input)
    return contactService.shareContact(user, data.contactId, data.sharedUserId, data.permission, meta)
  },

  async revokeAccess(user: AuthUser, contactId: string, sharedUserId: string) {
    const contact = await findContactForUser(user, contactId, 'owner')
    if (!contact) throw new AppError('Contact not found', 'NOT_FOUND', 404)
    assertIsOwner(user.id, contact.ownerId)

    await SharedAccess.deleteOne({ contactId, sharedUserId })
    contact.sharedWith = contact.sharedWith.filter((id) => id.toString() !== sharedUserId)
    await contact.save()
    return true
  },
}
