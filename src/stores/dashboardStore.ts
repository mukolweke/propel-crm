import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ActivityItem, ChartDataPoint, DashboardKpis } from '@/types'
import {
  mockActivity,
  mockContacts,
  mockDailyChart,
  mockFollowUps,
  mockInteractions,
  mockMonthlyPerformance,
  mockWeeklyConversions,
} from '@/mock'
import { delay, isToday } from '@/utils/helpers'

export const useDashboardStore = defineStore('dashboard', () => {
  const loading = ref(false)
  const activity = ref<ActivityItem[]>([])
  const dailyChart = ref<ChartDataPoint[]>([])
  const weeklyConversions = ref<ChartDataPoint[]>([])
  const monthlyPerformance = ref<ChartDataPoint[]>([])

  const kpis = computed<DashboardKpis>(() => ({
    contactsToday: mockContacts.filter((c) => isToday(c.createdAt)).length,
    interactionsToday: mockInteractions.filter((i) => isToday(i.createdAt)).length,
    pendingFollowUps: mockFollowUps.filter((f) => !f.completed).length,
    convertedClients: mockContacts.filter((c) => c.converted).length,
  }))

  async function fetchDashboard() {
    loading.value = true
    await delay(500)
    activity.value = [...mockActivity]
    dailyChart.value = [...mockDailyChart]
    weeklyConversions.value = [...mockWeeklyConversions]
    monthlyPerformance.value = [...mockMonthlyPerformance]
    loading.value = false
  }

  return {
    loading,
    kpis,
    activity,
    dailyChart,
    weeklyConversions,
    monthlyPerformance,
    fetchDashboard,
  }
})
