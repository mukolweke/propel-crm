import type { IUser } from '../../models/User.js'
import type { IContact } from '../../models/Contact.js'
import type { IInteraction } from '../../models/Interaction.js'
import type { IFollowUp } from '../../models/FollowUp.js'
import type { ISharedAccess } from '../../models/SharedAccess.js'

export function mapUser(user: IUser) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage ?? null,
    notificationSettings: user.notificationSettings,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export function mapContact(contact: IContact) {
  return {
    id: contact._id.toString(),
    ownerId: contact.ownerId.toString(),
    fullName: contact.fullName,
    phone: contact.phone,
    email: contact.email,
    propertyInterest: contact.propertyInterest,
    budgetRange: contact.budgetRange,
    preferredLocation: contact.preferredLocation,
    leadSource: contact.leadSource,
    notes: contact.notes,
    status: contact.status,
    lastInteractionDate: contact.lastInteractionDate ?? null,
    nextFollowUpDate: contact.nextFollowUpDate ?? null,
    isConverted: contact.isConverted,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  }
}

export function mapInteraction(interaction: IInteraction) {
  return {
    id: interaction._id.toString(),
    contactId: interaction.contactId.toString(),
    ownerId: interaction.ownerId.toString(),
    interactionType: interaction.interactionType,
    notes: interaction.notes,
    outcome: interaction.outcome,
    nextFollowUpDate: interaction.nextFollowUpDate ?? null,
    createdAt: interaction.createdAt,
  }
}

export function mapFollowUp(followUp: IFollowUp) {
  return {
    id: followUp._id.toString(),
    ownerId: followUp.ownerId.toString(),
    contactId: followUp.contactId.toString(),
    scheduledDate: followUp.scheduledDate,
    status: followUp.status,
    notes: followUp.notes,
    completedAt: followUp.completedAt ?? null,
    createdAt: followUp.createdAt,
  }
}

export function mapSharedAccess(share: ISharedAccess) {
  return {
    id: share._id.toString(),
    contactId: share.contactId.toString(),
    ownerId: share.ownerId.toString(),
    sharedUserId: share.sharedUserId.toString(),
    permission: share.permission,
    createdAt: share.createdAt,
  }
}
