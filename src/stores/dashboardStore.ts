import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ActivityItem, ChartDataPoint, DashboardKpis } from '@/types'
import {
  dashboardService,
  buildDailyChart,
  buildRecentActivity,
} from '@/services/dashboard.service'
import { useAuthStore } from '@/stores/authStore'
import { useContactsStore } from '@/stores/contactsStore'
import { useToast } from '@/composables/useToast'

export const useDashboardStore = defineStore('dashboard', () => {
  const loading = ref(false)
  const activity = ref<ActivityItem[]>([])
  const dailyChart = ref<ChartDataPoint[]>([])
  const weeklyConversions = ref<ChartDataPoint[]>([])
  const monthlyPerformance = ref<ChartDataPoint[]>([])
  const kpiData = ref<DashboardKpis>({
    contactsToday: 0,
    interactionsToday: 0,
    pendingFollowUps: 0,
    convertedClients: 0,
  })

  const kpis = computed(() => kpiData.value)

  async function fetchDashboard() {
    const authStore = useAuthStore()
    if (!authStore.token) return

    const contactsStore = useContactsStore()
    loading.value = true
    try {
      if (contactsStore.contacts.length === 0) {
        await contactsStore.fetchContacts()
      }

      const data = await dashboardService.fetchDashboard(authStore.token)
      const contactNames = new Map(contactsStore.contacts.map((c) => [c.id, c.fullName]))

      kpiData.value = {
        contactsToday: data.dailyReport.contactsAdded,
        interactionsToday: data.dailyReport.interactionsCompleted,
        pendingFollowUps: data.monthlyReport.activeFollowUps,
        convertedClients: data.conversionRate.converted,
      }

      dailyChart.value = buildDailyChart(data.interactions)
      activity.value = buildRecentActivity(data.interactions, contactNames)
      weeklyConversions.value = []
      monthlyPerformance.value = []
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard'
      useToast().error('Dashboard error', message)
    } finally {
      loading.value = false
    }
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
