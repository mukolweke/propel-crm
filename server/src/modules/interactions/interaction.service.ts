import { Types } from 'mongoose'
import { Interaction, FollowUp } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'
import { contactService } from '../contacts/contact.service.js'
import { findInteractionForUser } from '../../middleware/query-scope.js'
import { isSuperAdmin } from '../../middleware/rbac.js'
import { parseInput, interactionInputSchema, interactionUpdateSchema } from '../../validators/index.js'
import { parseObjectId } from '../../utils/objectId.js'
import { auditService } from '../audit/audit.service.js'
import type { AuthUser } from '../../types/index.js'

export const interactionService = {
  async listInteractions(user: AuthUser, contactId?: string) {
    if (contactId) {
      parseObjectId(contactId, 'contact ID')
      await contactService.assertContactAccess(user, contactId)
      const filter: Record<string, unknown> = { contactId }
      if (!isSuperAdmin(user)) filter.ownerId = user.id
      return Interaction.find(filter).sort({ createdAt: -1 })
    }

    if (isSuperAdmin(user)) return Interaction.find().sort({ createdAt: -1 })
    return Interaction.find({ ownerId: user.id }).sort({ createdAt: -1 })
  },

  async interactionHistory(user: AuthUser, contactId: string) {
    await contactService.assertContactAccess(user, contactId)
    const filter: Record<string, unknown> = { contactId }
    if (!isSuperAdmin(user)) filter.ownerId = user.id
    return Interaction.find(filter).sort({ createdAt: -1 })
  },

  async logInteraction(
    user: AuthUser,
    input: unknown,
    meta: { ip?: string; userAgent?: string },
  ) {
    const data = parseInput(interactionInputSchema, input)
    const { contact } = await contactService.assertContactAccess(user, data.contactId, true)

    const interaction = await Interaction.create({
      contactId: new Types.ObjectId(data.contactId),
      ownerId: new Types.ObjectId(user.id),
      interactionType: data.interactionType,
      notes: data.notes ?? '',
      outcome: data.outcome ?? '',
      nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
    })

    contact.lastInteractionDate = new Date()
    if (data.nextFollowUpDate) contact.nextFollowUpDate = new Date(data.nextFollowUpDate)
    if (contact.status === 'new') contact.status = 'contacted'
    await contact.save()

    if (data.nextFollowUpDate) {
      await FollowUp.create({
        ownerId: new Types.ObjectId(user.id),
        contactId: contact._id,
        scheduledDate: new Date(data.nextFollowUpDate),
        status: 'pending',
        notes: data.notes ?? '',
      })
    }

    await auditService.log({
      action: 'INTERACTION_CREATED',
      entityType: 'INTERACTION',
      entityId: interaction._id.toString(),
      performedBy: user,
      ownerId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      metadata: { contactId: data.contactId, type: data.interactionType },
    })

    return interaction
  },

  async updateInteraction(user: AuthUser, interactionId: string, input: unknown) {
    const interaction = await findInteractionForUser(user, interactionId)
    if (!interaction) throw new AppError('Interaction not found', 'NOT_FOUND', 404)
    if (!isSuperAdmin(user) && interaction.ownerId.toString() !== user.id) {
      throw new AppError('Not authorized', 'FORBIDDEN', 403)
    }

    const data = parseInput(interactionUpdateSchema, input)
    Object.assign(interaction, {
      ...data,
      nextFollowUpDate: data.nextFollowUpDate
        ? new Date(data.nextFollowUpDate)
        : interaction.nextFollowUpDate,
    })
    await interaction.save()
    return interaction
  },
}
