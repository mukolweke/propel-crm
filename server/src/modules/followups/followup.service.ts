import { Types } from 'mongoose'
import { FollowUp } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'
import { contactService } from '../contacts/contact.service.js'
import { parseInput, followUpInputSchema } from '../../validators/index.js'
import { startOfDay, endOfDay } from '../../utils/helpers.js'

async function syncOverdueStatus(userId: string) {
  const now = new Date()
  await FollowUp.updateMany(
    { ownerId: userId, status: 'pending', scheduledDate: { $lt: startOfDay(now) } },
    { status: 'overdue' },
  )
}

export const followUpService = {
  async todayFollowUps(userId: string) {
    await syncOverdueStatus(userId)
    const today = new Date()
    return FollowUp.find({
      ownerId: userId,
      scheduledDate: { $gte: startOfDay(today), $lte: endOfDay(today) },
      status: { $in: ['pending', 'overdue'] },
    }).sort({ scheduledDate: 1 })
  },

  async overdueFollowUps(userId: string) {
    await syncOverdueStatus(userId)
    return FollowUp.find({ ownerId: userId, status: 'overdue' }).sort({ scheduledDate: 1 })
  },

  async upcomingFollowUps(userId: string, days = 7) {
    await syncOverdueStatus(userId)
    const start = endOfDay(new Date())
    const end = new Date()
    end.setDate(end.getDate() + days)
    return FollowUp.find({
      ownerId: userId,
      status: 'pending',
      scheduledDate: { $gt: start, $lte: endOfDay(end) },
    }).sort({ scheduledDate: 1 })
  },

  async createFollowUp(userId: string, input: unknown) {
    const data = parseInput(followUpInputSchema, input)
    await contactService.assertContactAccess(userId, data.contactId, true)

    return FollowUp.create({
      ownerId: new Types.ObjectId(userId),
      contactId: new Types.ObjectId(data.contactId),
      scheduledDate: new Date(data.scheduledDate),
      notes: data.notes ?? '',
      status: 'pending',
    })
  },

  async completeFollowUp(userId: string, followUpId: string) {
    const followUp = await FollowUp.findById(followUpId)
    if (!followUp) throw new AppError('Follow-up not found', 'NOT_FOUND', 404)
    if (followUp.ownerId.toString() !== userId) {
      throw new AppError('Not authorized', 'FORBIDDEN', 403)
    }

    followUp.status = 'completed'
    followUp.completedAt = new Date()
    await followUp.save()
    return followUp
  },

  async rescheduleFollowUp(userId: string, followUpId: string, scheduledDate: string) {
    const followUp = await FollowUp.findById(followUpId)
    if (!followUp) throw new AppError('Follow-up not found', 'NOT_FOUND', 404)
    if (followUp.ownerId.toString() !== userId) {
      throw new AppError('Not authorized', 'FORBIDDEN', 403)
    }

    followUp.scheduledDate = new Date(scheduledDate)
    followUp.status = 'pending'
    await followUp.save()
    return followUp
  },
}
