import { SharedAccess, User, Contact } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'
import { assertIsOwner } from '../../middleware/authorization.js'
import { parseInput, shareInputSchema } from '../../validators/index.js'
import { contactService } from '../contacts/contact.service.js'

export const sharingService = {
  async sharedUsers(userId: string) {
    const shares = await SharedAccess.find({ ownerId: userId }).populate('sharedUserId', 'fullName email')
    return shares
  },

  async sharedContactsForUser(userId: string) {
    return contactService.sharedContacts(userId)
  },

  async grantAccess(userId: string, input: unknown) {
    const data = parseInput(shareInputSchema, input)
    return contactService.shareContact(userId, data.contactId, data.sharedUserId, data.permission)
  },

  async revokeAccess(userId: string, contactId: string, sharedUserId: string) {
    const contact = await Contact.findById(contactId)
    if (!contact) throw new AppError('Contact not found', 'NOT_FOUND', 404)
    assertIsOwner(userId, contact.ownerId)

    await SharedAccess.deleteOne({ contactId, sharedUserId })
    contact.sharedWith = contact.sharedWith.filter((id) => id.toString() !== sharedUserId)
    await contact.save()
    return true
  },

  async findUserByEmail(email: string) {
    return User.findOne({ email: email.toLowerCase() })
  },
}
