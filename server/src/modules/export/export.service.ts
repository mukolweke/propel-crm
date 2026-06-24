import { Types } from 'mongoose'
import { Contact, FollowUp, Interaction } from '../../models/index.js'
import { buildContactSearchFilter } from '../contacts/contact-search.js'
import { auditService } from '../audit/audit.service.js'
import { isSuperAdmin } from '../../middleware/rbac.js'
import { rowsToCsv } from '../../utils/csv-escape.js'
import { endOfDay, startOfDay } from '../../utils/helpers.js'
import { parseInput, exportContactsSchema, exportReportSchema } from '../../validators/index.js'
import {
  buildReportableContactFilter,
  filterContactsForReport,
  getSharesByContactId,
} from '../reports/report-access.js'
import type { AuthUser } from '../../types/index.js'
import type { IContact } from '../../models/Contact.js'

export type ExportFormat = 'csv' | 'excel' | 'pdf'
export type ReportPeriod = 'daily' | 'monthly'

export interface ExportPayload {
  filename: string
  mimeType: string
  content: string
  recordCount: number
  reportData?: Record<string, unknown>
}

interface ExportMeta {
  ip?: string
  userAgent?: string
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  follow_up: 'Follow Up',
  converted: 'Converted',
  lost: 'Lost',
}

function ownerFilter(user: AuthUser): Record<string, unknown> {
  return isSuperAdmin(user) ? {} : { ownerId: new Types.ObjectId(user.id) }
}

function applyDateRangeFilter(
  filter: Record<string, unknown>,
  dateFrom?: string,
  dateTo?: string,
  field = 'createdAt',
): void {
  if (!dateFrom && !dateTo) return
  const range: Record<string, Date> = {}
  if (dateFrom) range.$gte = startOfDay(new Date(dateFrom))
  if (dateTo) range.$lte = endOfDay(new Date(dateTo))
  filter[field] = range
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isInDateRange(iso: string, from: string, to: string): boolean {
  const day = toLocalDateKey(new Date(iso))
  return day >= from && day <= to
}

function isToday(iso: string): boolean {
  return toLocalDateKey(new Date(iso)) === toLocalDateKey(new Date())
}

function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function logExport(
  user: AuthUser,
  entityType: 'CONTACT' | 'REPORT',
  recordCount: number,
  scope: Record<string, unknown>,
  meta: ExportMeta,
) {
  await auditService.log({
    action: 'EXPORT_GENERATED',
    entityType,
    performedBy: user,
    ownerId: user.id,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    metadata: {
      recordCount,
      scope,
    },
  })
}

function buildContactsCsvRows(contacts: Pick<
  IContact,
  'fullName' | 'phone' | 'email' | 'propertyInterest' | 'budgetRange' | 'preferredLocation' | 'leadSource' | 'status' | 'notes' | 'createdAt' | 'updatedAt'
>[]) {
  const header = [
    'Full Name',
    'Phone',
    'Email',
    'Property Interest',
    'Budget Range',
    'Preferred Location',
    'Lead Source',
    'Status',
    'Notes',
    'Created At',
    'Updated At',
  ]
  const rows = contacts.map((contact) => [
    contact.fullName,
    contact.phone,
    contact.email,
    contact.propertyInterest,
    contact.budgetRange,
    contact.preferredLocation,
    contact.leadSource,
    STATUS_LABELS[contact.status] ?? contact.status,
    contact.notes,
    formatDisplayDate(contact.createdAt.toISOString()),
    formatDisplayDate(contact.updatedAt.toISOString()),
  ])
  return [header, ...rows]
}

interface ReportExportBundle {
  period: ReportPeriod
  dateFrom: string
  dateTo: string
  metrics: {
    leadsCreated: number
    interactions: number
    conversionRate: number
    followUpCompletion: number
  }
  conversionDetails: Array<{
    id: string
    clientName: string
    propertyType: string
    statusLabel: string
    value: string
    date: string
  }>
  leadSources: Array<{ name: string; count: number; percent: number }>
  mostActiveDay: string
  recordCount: number
}

async function gatherReportExportData(
  user: AuthUser,
  period: ReportPeriod,
  dateFrom: string,
  dateTo: string,
): Promise<ReportExportBundle> {
  const owner = ownerFilter(user)
  const reportableContactFilter = await buildReportableContactFilter(user)
  const fromDate = startOfDay(new Date(dateFrom))
  const toDate = endOfDay(new Date(dateTo))

  const [rawContacts, interactions, dailyFollowUpsCompleted, activeFollowUps] = await Promise.all([
    Contact.find(reportableContactFilter).sort({ updatedAt: -1 }).lean(),
    Interaction.find({ ...owner, createdAt: { $gte: fromDate, $lte: toDate } }).lean(),
    FollowUp.countDocuments({
      ...owner,
      status: 'completed',
      completedAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
    }),
    FollowUp.countDocuments({
      ...owner,
      status: { $in: ['pending', 'overdue'] },
    }),
  ])

  const sharesByContactId = await getSharesByContactId(rawContacts.map((c) => c._id))
  const contacts = filterContactsForReport(user, rawContacts, sharesByContactId)

  const contactsInRange = contacts.filter((c) => isInDateRange(c.createdAt.toISOString(), dateFrom, dateTo))
  const exportContacts = contactsInRange.length ? contactsInRange : contacts

  const leadSourceCounts = new Map<string, number>()
  for (const contact of exportContacts) {
    const source = contact.leadSource?.trim() || 'Unknown'
    leadSourceCounts.set(source, (leadSourceCounts.get(source) ?? 0) + 1)
  }
  const leadSourceTotal = exportContacts.length || 1
  const leadSources = [...leadSourceCounts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / leadSourceTotal) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  const conversionDetails = [...exportContacts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((contact) => ({
      id: contact._id.toString(),
      clientName: contact.fullName,
      propertyType: contact.propertyInterest || '—',
      statusLabel: STATUS_LABELS[contact.status] ?? contact.status,
      value: contact.budgetRange || '—',
      date: formatDisplayDate(contact.updatedAt.toISOString()),
    }))

  const convertedInRange = contacts.filter(
    (c) => c.isConverted && isInDateRange(c.updatedAt.toISOString(), dateFrom, dateTo),
  ).length
  const totalInRange = contactsInRange.length
  const conversionRate =
    totalInRange > 0 ? Math.round((convertedInRange / totalInRange) * 1000) / 10 : 0

  const interactionsToday = interactions.filter((i) => isToday(i.createdAt.toISOString())).length
  const leadsToday = contacts.filter((c) => isToday(c.createdAt.toISOString())).length
  const followUpDenom = dailyFollowUpsCompleted + activeFollowUps
  const followUpCompletion =
    followUpDenom > 0 ? Math.round((dailyFollowUpsCompleted / followUpDenom) * 100) : 0

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayCounts = new Array(7).fill(0)
  for (const interaction of interactions) {
    dayCounts[new Date(interaction.createdAt).getDay()]++
  }
  const maxDay = Math.max(...dayCounts)
  const mostActiveDay = maxDay > 0 ? dayNames[dayCounts.indexOf(maxDay)] ?? '—' : '—'

  const metrics =
    period === 'daily'
      ? {
          leadsCreated: leadsToday,
          interactions: interactionsToday,
          conversionRate,
          followUpCompletion,
        }
      : {
          leadsCreated: totalInRange,
          interactions: interactions.length,
          conversionRate,
          followUpCompletion,
        }

  return {
    period,
    dateFrom,
    dateTo,
    metrics,
    conversionDetails,
    leadSources,
    mostActiveDay,
    recordCount: conversionDetails.length,
  }
}

function buildReportCsv(bundle: ReportExportBundle): string {
  const rows = [
    ['Propel CRM Report'],
    ['Period', bundle.period],
    ['Date Range', `${bundle.dateFrom} to ${bundle.dateTo}`],
    [],
    ['Metric', 'Value'],
    ['Leads', String(bundle.metrics.leadsCreated)],
    ['Interactions', String(bundle.metrics.interactions)],
    ['Conversion Rate', `${bundle.metrics.conversionRate}%`],
    ['Follow-up Completion', `${bundle.metrics.followUpCompletion}%`],
    ['Most Active Day', bundle.mostActiveDay],
    [],
    ['Lead Source', 'Count', 'Percent'],
    ...bundle.leadSources.map((s) => [s.name, String(s.count), `${s.percent}%`]),
    [],
    ['Client Name', 'Property Type', 'Status', 'Value', 'Date'],
    ...bundle.conversionDetails.map((row) => [
      row.clientName,
      row.propertyType,
      row.statusLabel,
      row.value,
      row.date,
    ]),
  ]
  return rowsToCsv(rows)
}

function buildReportExcelHtml(bundle: ReportExportBundle): string {
  const metricRows = [
    ['Leads', bundle.metrics.leadsCreated],
    ['Interactions', bundle.metrics.interactions],
    ['Conversion Rate', `${bundle.metrics.conversionRate}%`],
    ['Follow-up Completion', `${bundle.metrics.followUpCompletion}%`],
    ['Most Active Day', bundle.mostActiveDay],
  ]
    .map(
      ([label, value]) =>
        `<tr><td>${escapeHtml(String(label))}</td><td>${escapeHtml(String(value))}</td></tr>`,
    )
    .join('')

  const sourceRows = bundle.leadSources
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.name)}</td><td>${s.count}</td><td>${s.percent}%</td></tr>`,
    )
    .join('')

  const contactRows = bundle.conversionDetails
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.clientName)}</td><td>${escapeHtml(row.propertyType)}</td><td>${escapeHtml(row.statusLabel)}</td><td>${escapeHtml(row.value)}</td><td>${escapeHtml(row.date)}</td></tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8" />
  <style>table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 10px}th{background:#f3f4f6}</style>
</head>
<body>
  <h2>Propel CRM Report (${bundle.period})</h2>
  <p>${bundle.dateFrom} — ${bundle.dateTo}</p>
  <h3>Summary</h3>
  <table><tbody>${metricRows}</tbody></table>
  <h3>Lead Sources</h3>
  <table><thead><tr><th>Source</th><th>Count</th><th>Percent</th></tr></thead><tbody>${sourceRows}</tbody></table>
  <h3>Conversion Details</h3>
  <table>
    <thead><tr><th>Client Name</th><th>Property Type</th><th>Status</th><th>Value</th><th>Date</th></tr></thead>
    <tbody>${contactRows}</tbody>
  </table>
</body>
</html>`
}

export const exportService = {
  async exportContacts(
    user: AuthUser,
    input: unknown,
    meta: ExportMeta,
  ): Promise<ExportPayload> {
    const data = parseInput(exportContactsSchema, input)
    const filter = buildContactSearchFilter(user, data.search)
    applyDateRangeFilter(filter, data.dateFrom, data.dateTo)

    const contacts = await Contact.find(filter).sort({ updatedAt: -1 }).lean()
    const content = rowsToCsv(buildContactsCsvRows(contacts))
    const scope = {
      exportType: 'contacts',
      format: 'csv',
      search: data.search ?? null,
      dateFrom: data.dateFrom ?? null,
      dateTo: data.dateTo ?? null,
    }

    await logExport(user, 'CONTACT', contacts.length, scope, meta)

    return {
      filename: `propel-contacts-${toLocalDateKey(new Date())}.csv`,
      mimeType: 'text/csv;charset=utf-8',
      content: `\uFEFF${content}`,
      recordCount: contacts.length,
    }
  },

  async exportReport(
    user: AuthUser,
    input: unknown,
    meta: ExportMeta,
  ): Promise<ExportPayload> {
    const data = parseInput(exportReportSchema, input)
    const bundle = await gatherReportExportData(user, data.period, data.dateFrom, data.dateTo)

    const scope = {
      exportType: 'report',
      format: data.format,
      period: data.period,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
    }

    await logExport(user, 'REPORT', bundle.recordCount, scope, meta)

    if (data.format === 'pdf') {
      return {
        filename: `propel-report-${data.period}-${data.dateFrom}.pdf`,
        mimeType: 'application/pdf',
        content: '',
        recordCount: bundle.recordCount,
        reportData: bundle as unknown as Record<string, unknown>,
      }
    }

    if (data.format === 'excel') {
      return {
        filename: `propel-report-${data.period}-${data.dateFrom}.xls`,
        mimeType: 'application/vnd.ms-excel;charset=utf-8',
        content: buildReportExcelHtml(bundle),
        recordCount: bundle.recordCount,
      }
    }

    return {
      filename: `propel-report-${data.period}-${data.dateFrom}.csv`,
      mimeType: 'text/csv;charset=utf-8',
      content: `\uFEFF${buildReportCsv(bundle)}`,
      recordCount: bundle.recordCount,
    }
  },
}
