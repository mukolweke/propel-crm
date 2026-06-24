import type { ActivityItem, ChartDataPoint, InteractionType } from '@/types'
import { toLocalDateKey, toLocalDateKeyFromIso } from '@/utils/helpers'
import { getInteractionLabel } from '@/utils/constants'
import { graphqlRequest } from './graphql'

interface DailyReport {
  date: string
  contactsAdded: number
  interactionsCompleted: number
  convertedClients: number
  followUpsCompleted: number
}

interface MonthlyReport {
  month: string
  year: number
  totalContacts: number
  totalInteractions: number
  conversionPercentage: number
  activeFollowUps: number
}

interface ConversionRateReport {
  converted: number
  total: number
  rate: number
}

interface ApiInteraction {
  id: string
  contactId: string
  interactionType: string
  notes: string
  outcome: string
  createdAt: string
}

export interface DashboardData {
  dailyReport: DailyReport
  monthlyReport: MonthlyReport
  conversionRate: ConversionRateReport
  interactions: ApiInteraction[]
}

const DASHBOARD_QUERY = `
  query Dashboard {
    dailyReport {
      date
      contactsAdded
      interactionsCompleted
      convertedClients
      followUpsCompleted
    }
    monthlyReport {
      month
      year
      totalContacts
      totalInteractions
      conversionPercentage
      activeFollowUps
    }
    conversionRate {
      converted
      total
      rate
    }
    interactions {
      id
      contactId
      interactionType
      notes
      outcome
      createdAt
    }
  }
`

function startOfMonthIso(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

export function buildDailyChart(interactions: ApiInteraction[]): ChartDataPoint[] {
  const points: ChartDataPoint[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = toLocalDateKey(d)
    const label = d.toLocaleDateString('en-US', { weekday: 'short' })
    const value = interactions.filter((item) => toLocalDateKeyFromIso(item.createdAt) === key).length
    points.push({ label, value })
  }
  return points
}

export function buildRecentActivity(
  interactions: ApiInteraction[],
  contactNames: Map<string, string>,
): ActivityItem[] {
  return [...interactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((item) => {
      const contactName = contactNames.get(item.contactId) ?? 'Client'
      const typeLabel = getInteractionLabel(item.interactionType as InteractionType)
      return {
        id: item.id,
        type: 'interaction',
        title: `${typeLabel} with ${contactName}`,
        description: item.notes?.trim() || item.outcome?.trim() || 'No notes recorded',
        timestamp: item.createdAt,
        tag: typeLabel,
        tagClass: 'bg-blue-50 text-blue-700',
      }
    })
}

export const dashboardService = {
  async fetchDashboard(): Promise<DashboardData> {
    const data = await graphqlRequest<{
      dailyReport: DailyReport
      monthlyReport: MonthlyReport
      conversionRate: ConversionRateReport
      interactions: ApiInteraction[]
    }>(DASHBOARD_QUERY)

    return data
  },

  startOfMonthIso,
}
