import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChartDataPoint, ReportMetrics } from '@/types'
import {
  mockConversionTrend,
  mockDailyReport,
  mockLeadsGrowth,
  mockMonthlyReport,
  mockWeeklyReport,
} from '@/mock'
import { delay, downloadFile } from '@/utils/helpers'
import { useToast } from '@/composables/useToast'

export type ReportPeriod = 'daily' | 'weekly' | 'monthly'

export const useReportsStore = defineStore('reports', () => {
  const loading = ref(false)
  const period = ref<ReportPeriod>('daily')
  const dateFrom = ref('2023-10-01')
  const dateTo = ref('2023-10-31')
  const metrics = ref<ReportMetrics>(mockDailyReport)
  const leadsGrowth = ref<ChartDataPoint[]>([])
  const conversionTrend = ref<ChartDataPoint[]>([])

  async function fetchReports(p: ReportPeriod = 'daily') {
    loading.value = true
    period.value = p
    await delay(600)

    switch (p) {
      case 'weekly':
        metrics.value = { ...mockWeeklyReport }
        break
      case 'monthly':
        metrics.value = { ...mockMonthlyReport }
        break
      default:
        metrics.value = { ...mockDailyReport }
    }

    leadsGrowth.value = [...mockLeadsGrowth]
    conversionTrend.value = [...mockConversionTrend]
    loading.value = false
  }

  function exportReport(format: 'csv' | 'excel' | 'pdf') {
    const toast = useToast()
    const m = metrics.value
    const content = [
      'Metric,Value',
      `Leads Created,${m.leadsCreated}`,
      `Interactions,${m.interactions}`,
      `Conversion Rate,${m.conversionRate}%`,
      `Follow-up Completion,${m.followUpCompletion}%`,
    ].join('\n')

    const ext = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : 'csv'
    downloadFile(`propel-report-${period.value}.${ext}`, content)
    toast.success('Export started', `Your ${format.toUpperCase()} report is downloading.`)
  }

  return {
    loading,
    period,
    dateFrom,
    dateTo,
    metrics,
    leadsGrowth,
    conversionTrend,
    fetchReports,
    exportReport,
  }
})
