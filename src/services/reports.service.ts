import type { ChartDataPoint, Contact, ContactStatus, Interaction, ReportMetrics } from '@/types'
import { getStatusColor, getStatusLabel } from '@/utils/constants'
import { formatDate, isToday, parseLocalDate, toLocalDateKey, toLocalDateKeyFromIso } from '@/utils/helpers'
import { graphqlRequest } from './graphql'

export interface ConversionDetailRow {
  id: string
  clientName: string
  propertyType: string
  status: ContactStatus
  statusLabel: string
  statusClass: string
  value: string
  date: string
}

export interface LeadSourceStat {
  name: string
  count: number
  percent: number
}

interface ConversionRateReport {
  rate: number
  converted: number
  total: number
  periodStart: string
  periodEnd: string
}

interface DailyReport {
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

const REPORTS_QUERY = `
  query Reports(
    $from: DateTime
    $to: DateTime
    $year: Int
    $month: Int
    $date: DateTime
  ) {
    conversionRate(from: $from, to: $to) {
      rate
      converted
      total
      periodStart
      periodEnd
    }
    dailyReport(date: $date) {
      contactsAdded
      interactionsCompleted
      convertedClients
      followUpsCompleted
    }
    monthlyReport(year: $year, month: $month) {
      month
      year
      totalContacts
      totalInteractions
      conversionPercentage
      activeFollowUps
    }
    interactions {
      id
      contactId
      createdAt
    }
    myContacts {
      id
      fullName
      propertyInterest
      budgetRange
      leadSource
      status
      isConverted
      createdAt
      updatedAt
    }
    reportableContacts {
      id
      fullName
      propertyInterest
      budgetRange
      leadSource
      status
      isConverted
      createdAt
      updatedAt
    }
  }
`

const STATUS_FROM_API: Record<string, ContactStatus> = {
  new: 'new_lead',
  contacted: 'contacted',
  interested: 'interested',
  follow_up: 'follow_up',
  converted: 'converted',
  lost: 'lost',
}

function mapApiStatus(status: string): ContactStatus {
  return STATUS_FROM_API[status] ?? 'new_lead'
}

function mapApiContact(c: {
  id: string
  fullName: string
  propertyInterest: string
  budgetRange: string
  leadSource: string
  status: string
  isConverted: boolean
  createdAt: string
  updatedAt: string
}): Contact {
  return {
    id: c.id,
    fullName: c.fullName,
    propertyType: c.propertyInterest,
    budgetRange: c.budgetRange || '—',
    leadSource: c.leadSource || 'Unknown',
    status: mapApiStatus(c.status),
    converted: c.isConverted,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    phone: '',
    email: '',
    locationPreference: '',
    notes: '',
    lastInteraction: null,
    followUpDate: null,
    ownerId: '',
  }
}

export function isInDateRange(iso: string, from: string, to: string): boolean {
  const day = toLocalDateKeyFromIso(iso)
  return day >= from && day <= to
}

function buildLastDaysLeadChart(contacts: Contact[], endDateKey: string, days = 7): ChartDataPoint[] {
  const end = parseLocalDate(endDateKey)
  const points: ChartDataPoint[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    const key = toLocalDateKey(d)
    const label = d.toLocaleDateString('en-US', { weekday: 'short' })
    const value = contacts.filter((c) => toLocalDateKeyFromIso(c.createdAt) === key).length
    points.push({ label, value })
  }

  return points
}

function buildMonthlyConversionChart(contacts: Contact[], from: string, to: string): ChartDataPoint[] {
  const converted = contacts.filter(
    (c) => c.converted && isInDateRange(c.updatedAt, from, to),
  )
  const endDay = parseLocalDate(to).getDate()
  const numWeeks = Math.ceil(endDay / 7)
  const buckets = Array.from({ length: numWeeks }, () => 0)

  for (const contact of converted) {
    const day = new Date(contact.updatedAt).getDate()
    const weekIndex = Math.min(Math.ceil(day / 7) - 1, numWeeks - 1)
    buckets[weekIndex]++
  }

  return buckets.map((value, index) => ({
    label: `Week ${index + 1}`,
    value,
  }))
}

export function buildConversionTrend(
  contacts: Contact[],
  from: string,
  to: string,
  period: 'daily' | 'monthly',
): ChartDataPoint[] {
  if (period === 'daily') {
    const todayKey = toLocalDateKey(new Date())
    const endDateKey = to < todayKey ? to : todayKey
    return buildLastDaysLeadChart(contacts, endDateKey)
  }

  return buildMonthlyConversionChart(contacts, from, to)
}

export function chartHasData(points: ChartDataPoint[]): boolean {
  return points.some((point) => point.value > 0)
}

export function buildLeadSources(contacts: Contact[]): LeadSourceStat[] {
  const counts = new Map<string, number>()
  for (const contact of contacts) {
    const source = contact.leadSource?.trim() || 'Unknown'
    counts.set(source, (counts.get(source) ?? 0) + 1)
  }
  const total = contacts.length || 1
  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

export function buildConversionDetails(contacts: Contact[]): ConversionDetailRow[] {
  return [...contacts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((contact) => ({
      id: contact.id,
      clientName: contact.fullName,
      propertyType: contact.propertyType || '—',
      status: contact.status,
      statusLabel: getStatusLabel(contact.status),
      statusClass: getStatusColor(contact.status),
      value: contact.budgetRange || '—',
      date: formatDate(contact.updatedAt),
    }))
}

export function computeMostActiveDay(interactions: Interaction[]): string {
  if (!interactions.length) return '—'
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const counts = new Array(7).fill(0)
  for (const item of interactions) {
    counts[new Date(item.createdAt).getDay()]++
  }
  const max = Math.max(...counts)
  if (max === 0) return '—'
  return dayNames[counts.indexOf(max)] ?? '—'
}

export interface ReportsPayload {
  metrics: ReportMetrics
  conversionTrend: ChartDataPoint[]
  leadSources: LeadSourceStat[]
  conversionDetails: ConversionDetailRow[]
  mostActiveDay: string
  leadSourceTotal: number
}

export const reportsService = {
  async fetchReports(
    options: {
      from: string
      to: string
      period: 'daily' | 'monthly'
    },
  ): Promise<ReportsPayload> {
    const fromDate = new Date(`${options.from}T00:00:00`)
    const toDate = new Date(`${options.to}T23:59:59`)
    const today = new Date()
    today.setHours(12, 0, 0, 0)

    const data = await graphqlRequest<{
      conversionRate: ConversionRateReport
      dailyReport: DailyReport
      monthlyReport: MonthlyReport
      interactions: { id: string; contactId: string; createdAt: string }[]
      myContacts: Parameters<typeof mapApiContact>[0][]
      reportableContacts: Parameters<typeof mapApiContact>[0][]
    }>(
      REPORTS_QUERY,
      {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        year: fromDate.getFullYear(),
        month: fromDate.getMonth() + 1,
        date: today.toISOString(),
      },
    )

    const contacts = data.reportableContacts.map(mapApiContact)
    const contactsInRange = contacts.filter((c) => isInDateRange(c.createdAt, options.from, options.to))
    const leadsAddedToday = contacts.filter((c) => isToday(c.createdAt)).length
    const interactionsToday = data.interactions.filter((i) => isToday(i.createdAt)).length
    const interactionsInRange = data.interactions
      .filter((i) => isInDateRange(i.createdAt, options.from, options.to))
      .map((i) => ({
        id: i.id,
        contactId: i.contactId,
        contactName: '',
        type: 'call' as const,
        notes: '',
        outcome: '',
        nextFollowUpDate: null,
        createdAt: i.createdAt,
        ownerId: '',
      }))

    const conversion = data.conversionRate
    const daily = data.dailyReport
    const monthly = data.monthlyReport

    const followUpDenom = daily.followUpsCompleted + monthly.activeFollowUps
    const followUpCompletion =
      followUpDenom > 0 ? Math.round((daily.followUpsCompleted / followUpDenom) * 100) : 0

    const metrics: ReportMetrics =
      options.period === 'daily'
        ? {
            leadsCreated: leadsAddedToday,
            interactions: interactionsToday,
            conversionRate: conversion.rate,
            followUpCompletion,
          }
        : {
            leadsCreated: contactsInRange.length,
            interactions: monthly.totalInteractions,
            conversionRate: monthly.conversionPercentage,
            followUpCompletion,
          }

    return {
      metrics,
      conversionTrend: buildConversionTrend(contacts, options.from, options.to, options.period),
      leadSources: buildLeadSources(contactsInRange.length ? contactsInRange : contacts),
      conversionDetails: buildConversionDetails(contactsInRange.length ? contactsInRange : contacts),
      mostActiveDay: computeMostActiveDay(interactionsInRange),
      leadSourceTotal: contactsInRange.length || contacts.length,
    }
  },
}
