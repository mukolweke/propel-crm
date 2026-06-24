import { graphqlRequest } from './graphql'

export interface ExportPayload {
  filename: string
  mimeType: string
  content: string
  recordCount: number
  reportData?: {
    period: 'daily' | 'monthly'
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
}

const EXPORT_CONTACTS = `
  mutation ExportContacts($input: ExportContactsInput!) {
    exportContacts(input: $input) {
      filename
      mimeType
      content
      recordCount
    }
  }
`

const EXPORT_REPORT = `
  mutation ExportReport($input: ExportReportInput!) {
    exportReport(input: $input) {
      filename
      mimeType
      content
      recordCount
      reportData
    }
  }
`

export const exportService = {
  async exportContacts(input: {
    search?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<ExportPayload> {
    const data = await graphqlRequest<{ exportContacts: ExportPayload }>(EXPORT_CONTACTS, { input })
    return data.exportContacts
  },

  async exportReport(input: {
    format: 'csv' | 'excel' | 'pdf'
    period: 'daily' | 'monthly'
    dateFrom: string
    dateTo: string
  }): Promise<ExportPayload> {
    const data = await graphqlRequest<{ exportReport: ExportPayload }>(EXPORT_REPORT, { input })
    return data.exportReport
  },
}
