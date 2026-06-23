import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReportMetrics } from '@/types'
import type { ConversionDetailRow, LeadSourceStat } from '@/services/reports.service'
import type { ReportPeriod } from '@/stores/reportsStore'

export interface ReportExportData {
  period: ReportPeriod
  dateFrom: string
  dateTo: string
  metrics: ReportMetrics
  conversionDetails: ConversionDetailRow[]
  leadSources: LeadSourceStat[]
  mostActiveDay: string
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function buildCsvContent(data: ReportExportData): string {
  const rows = [
    ['Propel CRM Report'],
    [`Period`, data.period],
    [`Date Range`, `${data.dateFrom} to ${data.dateTo}`],
    [],
    ['Metric', 'Value'],
    ['Leads', String(data.metrics.leadsCreated)],
    ['Interactions', String(data.metrics.interactions)],
    ['Conversion Rate', `${data.metrics.conversionRate}%`],
    ['Follow-up Completion', `${data.metrics.followUpCompletion}%`],
    ['Most Active Day', data.mostActiveDay],
    [],
    ['Lead Source', 'Count', 'Percent'],
    ...data.leadSources.map((s) => [s.name, String(s.count), `${s.percent}%`]),
    [],
    ['Client Name', 'Property Type', 'Status', 'Value', 'Date'],
    ...data.conversionDetails.map((row) => [
      row.clientName,
      row.propertyType,
      row.statusLabel,
      row.value,
      row.date,
    ]),
  ]

  return rows.map((row) => row.map((cell) => escapeCsv(cell ?? '')).join(',')).join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildExcelHtml(data: ReportExportData): string {
  const metricRows = [
    ['Leads', data.metrics.leadsCreated],
    ['Interactions', data.metrics.interactions],
    ['Conversion Rate', `${data.metrics.conversionRate}%`],
    ['Follow-up Completion', `${data.metrics.followUpCompletion}%`],
    ['Most Active Day', data.mostActiveDay],
  ]
    .map(
      ([label, value]) =>
        `<tr><td>${escapeHtml(String(label))}</td><td>${escapeHtml(String(value))}</td></tr>`,
    )
    .join('')

  const sourceRows = data.leadSources
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.name)}</td><td>${s.count}</td><td>${s.percent}%</td></tr>`,
    )
    .join('')

  const contactRows = data.conversionDetails
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.clientName)}</td><td>${escapeHtml(row.propertyType)}</td><td>${escapeHtml(row.statusLabel)}</td><td>${escapeHtml(row.value)}</td><td>${escapeHtml(row.date)}</td></tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 10px}th{background:#f3f4f6}</style>
</head>
<body>
  <h2>Propel CRM Report (${data.period})</h2>
  <p>${data.dateFrom} — ${data.dateTo}</p>
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

export function exportReportCsv(data: ReportExportData): void {
  const content = `\uFEFF${buildCsvContent(data)}`
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  downloadBlob(`propel-report-${data.period}-${data.dateFrom}.csv`, blob)
}

export function exportReportExcel(data: ReportExportData): void {
  const blob = new Blob([buildExcelHtml(data)], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  })
  downloadBlob(`propel-report-${data.period}-${data.dateFrom}.xls`, blob)
}

export function exportReportPdf(data: ReportExportData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

  doc.setFontSize(16)
  doc.text('Propel CRM Report', 40, 40)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`${data.period} report · ${data.dateFrom} to ${data.dateTo}`, 40, 58)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 72,
    head: [['Metric', 'Value']],
    body: [
      ['Leads', String(data.metrics.leadsCreated)],
      ['Interactions', String(data.metrics.interactions)],
      ['Conversion Rate', `${data.metrics.conversionRate}%`],
      ['Follow-up Completion', `${data.metrics.followUpCompletion}%`],
      ['Most Active Day', data.mostActiveDay],
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 101, 52] },
  })

  const afterSummary = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20

  if (data.leadSources.length) {
    doc.setFontSize(12)
    doc.text('Lead Sources', 40, afterSummary)
    autoTable(doc, {
      startY: afterSummary + 8,
      head: [['Source', 'Count', 'Percent']],
      body: data.leadSources.map((s) => [s.name, String(s.count), `${s.percent}%`]),
      theme: 'grid',
      headStyles: { fillColor: [22, 101, 52] },
    })
  }

  const afterSources = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20

  doc.setFontSize(12)
  doc.text('Conversion Details', 40, afterSources)
  autoTable(doc, {
    startY: afterSources + 8,
    head: [['Client', 'Property Type', 'Status', 'Value', 'Date']],
    body: data.conversionDetails.map((row) => [
      row.clientName,
      row.propertyType,
      row.statusLabel,
      row.value,
      row.date,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [22, 101, 52] },
  })

  doc.save(`propel-report-${data.period}-${data.dateFrom}.pdf`)
}

export function exportReport(format: 'csv' | 'excel' | 'pdf', data: ReportExportData): void {
  if (format === 'csv') exportReportCsv(data)
  else if (format === 'excel') exportReportExcel(data)
  else exportReportPdf(data)
}
