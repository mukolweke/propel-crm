import { Types } from 'mongoose'
import { FollowUp } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'
import { contactService } from '../contacts/contact.service.js'
import { findFollowUpForUser, getAccessibleActiveContactIds } from '../../middleware/query-scope.js'
import { isSuperAdmin } from '../../middleware/rbac.js'
import { parseInput, followUpInputSchema } from '../../validators/index.js'
import { startOfDay, endOfDay } from '../../utils/helpers.js'
import { auditService } from '../audit/audit.service.js'
import type { AuthUser } from '../../types/index.js'

async function syncOverdueStatus(user: AuthUser) {
  const filter: Record<string, unknown> = { status: 'pending', scheduledDate: { $lt: startOfDay(new Date()) } }
  if (!isSuperAdmin(user)) filter.ownerId = user.id
  await FollowUp.updateMany(filter, { status: 'overdue' })
}

function ownerFilter(user: AuthUser): Record<string, unknown> {
  return isSuperAdmin(user) ? {} : { ownerId: user.id }
}

async function followUpFilter(user: AuthUser, extra: Record<string, unknown> = {}) {
  const activeContactIds = await getAccessibleActiveContactIds(user)
  return { ...ownerFilter(user), contactId: { $in: activeContactIds }, ...extra }
}

export const followUpService = {
  async todayFollowUps(user: AuthUser) {
    await syncOverdueStatus(user)
    const today = new Date()
    return FollowUp.find(
      await followUpFilter(user, {
        scheduledDate: { $gte: startOfDay(today), $lte: endOfDay(today) },
        status: { $in: ['pending', 'overdue'] },
      }),
    ).sort({ scheduledDate: 1 })
  },

  async overdueFollowUps(user: AuthUser) {
    await syncOverdueStatus(user)
    return FollowUp.find(await followUpFilter(user, { status: 'overdue' })).sort({ scheduledDate: 1 })
  },

  async upcomingFollowUps(user: AuthUser, days = 7) {
    await syncOverdueStatus(user)
    const start = endOfDay(new Date())
    const end = new Date()
    end.setDate(end.getDate() + days)
    return FollowUp.find(
      await followUpFilter(user, {
        status: 'pending',
        scheduledDate: { $gt: start, $lte: endOfDay(end) },
      }),
    ).sort({ scheduledDate: 1 })
  },

  async createFollowUp(
    user: AuthUser,
    input: unknown,
    meta: { ip?: string; userAgent?: string },
  ) {
    const data = parseInput(followUpInputSchema, input)
    await contactService.assertContactAccess(user, data.contactId, true)

    const followUp = await FollowUp.create({
      ownerId: new Types.ObjectId(user.id),
      contactId: new Types.ObjectId(data.contactId),
      scheduledDate: new Date(data.scheduledDate),
      notes: data.notes ?? '',
      status: 'pending',
    })

    await auditService.log({
      action: 'FOLLOWUP_CREATED',
      entityType: 'FOLLOWUP',
      entityId: followUp._id.toString(),
      performedBy: user,
      ownerId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    })

    return followUp
  },

  async completeFollowUp(
    user: AuthUser,
    followUpId: string,
    meta: { ip?: string; userAgent?: string },
  ) {
    const followUp = await findFollowUpForUser(user, followUpId)
    if (!followUp) throw new AppError('Follow-up not found', 'NOT_FOUND', 404)
    if (!isSuperAdmin(user) && followUp.ownerId.toString() !== user.id) {
      throw new AppError('Not authorized', 'FORBIDDEN', 403)
    }

    followUp.status = 'completed'
    followUp.completedAt = new Date()
    await followUp.save()

    await auditService.log({
      action: 'FOLLOWUP_COMPLETED',
      entityType: 'FOLLOWUP',
      entityId: followUpId,
      performedBy: user,
      ownerId: followUp.ownerId.toString(),
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    })

    return followUp
  },

  async rescheduleFollowUp(user: AuthUser, followUpId: string, scheduledDate: string) {
    const followUp = await findFollowUpForUser(user, followUpId)
    if (!followUp) throw new AppError('Follow-up not found', 'NOT_FOUND', 404)
    if (!isSuperAdmin(user) && followUp.ownerId.toString() !== user.id) {
      throw new AppError('Not authorized', 'FORBIDDEN', 403)
    }

    followUp.scheduledDate = new Date(scheduledDate)
    followUp.status = 'pending'
    await followUp.save()
    return followUp
  },
}
