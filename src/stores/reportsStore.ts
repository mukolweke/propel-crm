import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ChartDataPoint, ReportMetrics } from '@/types'
import { endOfMonth, startOfMonth } from '@/utils/helpers'
import { exportReportFromServerPayload } from '@/utils/reportExport'
import {
  reportsService,
  chartHasData,
  type ConversionDetailRow,
  type LeadSourceStat,
} from '@/services/reports.service'
import { exportService } from '@/services/export.service'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'

const emptyMetrics: ReportMetrics = {
  leadsCreated: 0,
  interactions: 0,
  conversionRate: 0,
  followUpCompletion: 0,
}

export type ReportPeriod = 'daily' | 'monthly'

export const useReportsStore = defineStore('reports', () => {
  const loading = ref(false)
  const period = ref<ReportPeriod>('daily')
  const dateFrom = ref(startOfMonth())
  const dateTo = ref(endOfMonth())
  const metrics = ref<ReportMetrics>({ ...emptyMetrics })
  const leadsGrowth = ref<ChartDataPoint[]>([])
  const conversionTrend = ref<ChartDataPoint[]>([])
  const leadSources = ref<LeadSourceStat[]>([])
  const conversionDetails = ref<ConversionDetailRow[]>([])
  const mostActiveDay = ref('—')
  const leadSourceTotal = ref(0)

  const hasChartData = computed(() => chartHasData(conversionTrend.value))
  const defaultDateFrom = computed(() => startOfMonth())
  const defaultDateTo = computed(() => endOfMonth())

  function resetDateRange() {
    dateFrom.value = startOfMonth()
    dateTo.value = endOfMonth()
  }

  async function fetchReports(p: ReportPeriod = period.value) {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) return

    loading.value = true
    period.value = p
    try {
      const data = await reportsService.fetchReports({
        from: dateFrom.value,
        to: dateTo.value,
        period: p,
      })

      metrics.value = data.metrics
      conversionTrend.value = data.conversionTrend
      leadSources.value = data.leadSources
      conversionDetails.value = data.conversionDetails
      mostActiveDay.value = data.mostActiveDay
      leadSourceTotal.value = data.leadSourceTotal
      leadsGrowth.value = []
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reports'
      useToast().error('Reports error', message)
      metrics.value = { ...emptyMetrics }
      conversionTrend.value = []
      leadSources.value = []
      conversionDetails.value = []
      mostActiveDay.value = '—'
      leadSourceTotal.value = 0
    } finally {
      loading.value = false
    }
  }

  async function exportReport(format: 'csv' | 'excel' | 'pdf') {
    const toast = useToast()
    loading.value = true
    try {
      const payload = await exportService.exportReport({
        format,
        period: period.value,
        dateFrom: dateFrom.value,
        dateTo: dateTo.value,
      })

      exportReportFromServerPayload(format, {
        filename: payload.filename,
        mimeType: payload.mimeType,
        content: payload.content,
        reportData: payload.reportData
          ? {
              period: payload.reportData.period,
              dateFrom: payload.reportData.dateFrom,
              dateTo: payload.reportData.dateTo,
              metrics: payload.reportData.metrics,
              conversionDetails: payload.reportData.conversionDetails.map((row) => ({
                ...row,
                status: 'new_lead' as const,
                statusClass: '',
              })),
              leadSources: payload.reportData.leadSources,
              mostActiveDay: payload.reportData.mostActiveDay,
            }
          : undefined,
      })

      const label = format === 'excel' ? 'Excel' : format.toUpperCase()
      toast.success('Export complete', `Your ${label} report has been downloaded.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      toast.error('Export failed', message)
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    period,
    dateFrom,
    dateTo,
    defaultDateFrom,
    defaultDateTo,
    resetDateRange,
    metrics,
    leadsGrowth,
    conversionTrend,
    leadSources,
    conversionDetails,
    mostActiveDay,
    leadSourceTotal,
    hasChartData,
    fetchReports,
    exportReport,
  }
})
