import { Types } from 'mongoose'
import { Contact, Interaction, FollowUp } from '../../models/index.js'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from '../../utils/helpers.js'
import type { ConversionRateReport, DailyReport, MonthlyReport } from '../../types/index.js'

export const reportService = {
  async dailyReport(userId: string, dateInput?: string): Promise<DailyReport> {
    const date = dateInput ? new Date(dateInput) : new Date()
    const start = startOfDay(date)
    const end = endOfDay(date)
    const ownerId = new Types.ObjectId(userId)

    const [contactsAdded, interactionsCompleted, convertedClients, followUpsCompleted] =
      await Promise.all([
        Contact.countDocuments({ ownerId, createdAt: { $gte: start, $lte: end } }),
        Interaction.countDocuments({ ownerId, createdAt: { $gte: start, $lte: end } }),
        Contact.countDocuments({
          ownerId,
          isConverted: true,
          updatedAt: { $gte: start, $lte: end },
        }),
        FollowUp.countDocuments({
          ownerId,
          status: 'completed',
          completedAt: { $gte: start, $lte: end },
        }),
      ])

    return {
      date: start.toISOString(),
      contactsAdded,
      interactionsCompleted,
      convertedClients,
      followUpsCompleted,
    }
  },

  async monthlyReport(userId: string, year?: number, month?: number): Promise<MonthlyReport> {
    const now = new Date()
    const ref = new Date(year ?? now.getFullYear(), (month ?? now.getMonth() + 1) - 1, 1)
    const start = startOfMonth(ref)
    const end = endOfMonth(ref)
    const ownerId = new Types.ObjectId(userId)

    const [totalContacts, totalInteractions, converted, activeFollowUps] = await Promise.all([
      Contact.countDocuments({ ownerId, createdAt: { $lte: end } }),
      Interaction.countDocuments({ ownerId, createdAt: { $gte: start, $lte: end } }),
      Contact.countDocuments({ ownerId, isConverted: true, updatedAt: { $gte: start, $lte: end } }),
      FollowUp.countDocuments({
        ownerId,
        status: { $in: ['pending', 'overdue'] },
        scheduledDate: { $lte: end },
      }),
    ])

    const conversionPercentage =
      totalContacts > 0 ? Math.round((converted / totalContacts) * 1000) / 10 : 0

    return {
      month: ref.toLocaleString('en-US', { month: 'long' }),
      year: ref.getFullYear(),
      totalContacts,
      totalInteractions,
      conversionPercentage,
      activeFollowUps,
    }
  },

  async conversionRate(userId: string, from?: string, to?: string): Promise<ConversionRateReport> {
    const periodEnd = to ? new Date(to) : new Date()
    const periodStart = from ? new Date(from) : startOfMonth(periodEnd)
    const ownerId = new Types.ObjectId(userId)

    const [total, converted] = await Promise.all([
      Contact.countDocuments({ ownerId, createdAt: { $gte: periodStart, $lte: periodEnd } }),
      Contact.countDocuments({
        ownerId,
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
