import { Types } from 'mongoose'
import { Interaction, FollowUp } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'
import { contactService } from '../contacts/contact.service.js'
import { parseInput, interactionInputSchema, interactionUpdateSchema } from '../../validators/index.js'

export const interactionService = {
  async listInteractions(userId: string, contactId?: string) {
    const filter: Record<string, unknown> = { ownerId: userId }

    if (contactId) {
      await contactService.assertContactAccess(userId, contactId)
      filter.contactId = contactId
    }

    return Interaction.find(filter).sort({ createdAt: -1 })
  },

  async interactionHistory(userId: string, contactId: string) {
    await contactService.assertContactAccess(userId, contactId)
    return Interaction.find({ contactId }).sort({ createdAt: -1 })
  },

  async logInteraction(userId: string, input: unknown) {
    const data = parseInput(interactionInputSchema, input)
    const { contact } = await contactService.assertContactAccess(userId, data.contactId, true)

    const interaction = await Interaction.create({
      contactId: new Types.ObjectId(data.contactId),
      ownerId: new Types.ObjectId(userId),
      interactionType: data.interactionType,
      notes: data.notes ?? '',
      outcome: data.outcome ?? '',
      nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
    })

    contact.lastInteractionDate = new Date()
    if (data.nextFollowUpDate) {
      contact.nextFollowUpDate = new Date(data.nextFollowUpDate)
    }
    if (contact.status === 'new') contact.status = 'contacted'
    await contact.save()

    if (data.nextFollowUpDate) {
      await FollowUp.create({
        ownerId: new Types.ObjectId(userId),
        contactId: contact._id,
        scheduledDate: new Date(data.nextFollowUpDate),
        status: 'pending',
        notes: data.notes ?? '',
      })
    }

    return interaction
  },

  async updateInteraction(userId: string, interactionId: string, input: unknown) {
    const interaction = await Interaction.findById(interactionId)
    if (!interaction) throw new AppError('Interaction not found', 'NOT_FOUND', 404)
    if (interaction.ownerId.toString() !== userId) {
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
