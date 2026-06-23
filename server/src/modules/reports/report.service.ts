import { Types } from 'mongoose'
import { Contact, Interaction, FollowUp } from '../../models/index.js'
import { notDeletedFilter } from '../../models/Contact.js'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from '../../utils/helpers.js'
import { isSuperAdmin } from '../../middleware/rbac.js'
import { auditService } from '../audit/audit.service.js'
import type { AuthUser, ConversionRateReport, DailyReport, MonthlyReport } from '../../types/index.js'

function scopedOwnerId(user: AuthUser): Types.ObjectId | null {
  return isSuperAdmin(user) ? null : new Types.ObjectId(user.id)
}

export const reportService = {
  async dailyReport(user: AuthUser, dateInput?: string, meta?: { ip?: string; userAgent?: string }): Promise<DailyReport> {
    const date = dateInput ? new Date(dateInput) : new Date()
    const start = startOfDay(date)
    const end = endOfDay(date)
    const ownerId = scopedOwnerId(user)
    const ownerFilter = ownerId ? { ownerId } : {}

    const [contactsAdded, interactionsCompleted, convertedClients, followUpsCompleted] =
      await Promise.all([
        Contact.countDocuments({ ...ownerFilter, ...notDeletedFilter, createdAt: { $gte: start, $lte: end } }),
        Interaction.countDocuments({ ...ownerFilter, createdAt: { $gte: start, $lte: end } }),
        Contact.countDocuments({
          ...ownerFilter,
          ...notDeletedFilter,
          isConverted: true,
          updatedAt: { $gte: start, $lte: end },
        }),
        FollowUp.countDocuments({
          ...ownerFilter,
          status: 'completed',
          completedAt: { $gte: start, $lte: end },
        }),
      ])

    if (meta) {
      await auditService.log({
        action: 'EXPORT_GENERATED',
        entityType: 'REPORT',
        performedBy: user,
        ownerId: user.id,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        metadata: { reportType: 'daily', date: start.toISOString() },
      })
    }

    return { date: start.toISOString(), contactsAdded, interactionsCompleted, convertedClients, followUpsCompleted }
  },

  async monthlyReport(user: AuthUser, year?: number, month?: number, meta?: { ip?: string; userAgent?: string }): Promise<MonthlyReport> {
    const now = new Date()
    const ref = new Date(year ?? now.getFullYear(), (month ?? now.getMonth() + 1) - 1, 1)
    const start = startOfMonth(ref)
    const end = endOfMonth(ref)
    const ownerFilter = scopedOwnerId(user) ? { ownerId: scopedOwnerId(user) } : {}

    const [totalContacts, totalInteractions, converted, activeFollowUps] = await Promise.all([
      Contact.countDocuments({ ...ownerFilter, ...notDeletedFilter, createdAt: { $lte: end } }),
      Interaction.countDocuments({ ...ownerFilter, createdAt: { $gte: start, $lte: end } }),
      Contact.countDocuments({ ...ownerFilter, ...notDeletedFilter, isConverted: true, updatedAt: { $gte: start, $lte: end } }),
      FollowUp.countDocuments({ ...ownerFilter, status: { $in: ['pending', 'overdue'] }, scheduledDate: { $lte: end } }),
    ])

    if (meta) {
      await auditService.log({
        action: 'EXPORT_GENERATED',
        entityType: 'REPORT',
        performedBy: user,
        ownerId: user.id,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        metadata: { reportType: 'monthly', month: ref.getMonth() + 1, year: ref.getFullYear() },
      })
    }

    return {
      month: ref.toLocaleString('en-US', { month: 'long' }),
      year: ref.getFullYear(),
      totalContacts,
      totalInteractions,
      conversionPercentage: totalContacts > 0 ? Math.round((converted / totalContacts) * 1000) / 10 : 0,
      activeFollowUps,
    }
  },

  async conversionRate(user: AuthUser, from?: string, to?: string): Promise<ConversionRateReport> {
    const periodEnd = to ? new Date(to) : new Date()
    const periodStart = from ? new Date(from) : startOfMonth(periodEnd)
    const ownerFilter = scopedOwnerId(user) ? { ownerId: scopedOwnerId(user) } : {}

    const [total, converted] = await Promise.all([
      Contact.countDocuments({ ...ownerFilter, ...notDeletedFilter, createdAt: { $gte: periodStart, $lte: periodEnd } }),
      Contact.countDocuments({
        ...ownerFilter,
        ...notDeletedFilter,
        isConverted: true,
        updatedAt: { $gte: periodStart, $lte: periodEnd },
      }),
    ])

    return {
      total,
      converted,
      rate: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }
  },
}
