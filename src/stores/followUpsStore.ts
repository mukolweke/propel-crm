import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FollowUp } from '@/types'
import { mockFollowUps } from '@/mock'
import { delay, isOverdue, isThisWeek, isToday, isTomorrow } from '@/utils/helpers'

export type FollowUpFilter = 'all' | 'today' | 'tomorrow' | 'week'

export const useFollowUpsStore = defineStore('followUps', () => {
  const followUps = ref<FollowUp[]>([])
  const loading = ref(false)
  const filter = ref<FollowUpFilter>('all')

  const pending = computed(() => followUps.value.filter((f) => !f.completed))

  const filtered = computed(() => {
    let result = pending.value
    switch (filter.value) {
      case 'today':
        result = result.filter((f) => isToday(f.dueDate))
        break
      case 'tomorrow':
        result = result.filter((f) => isTomorrow(f.dueDate))
        break
      case 'week':
        result = result.filter((f) => isThisWeek(f.dueDate))
        break
    }
    return [...result].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  })

  const overdue = computed(() => pending.value.filter((f) => isOverdue(f.dueDate)))

  const upcoming = computed(() =>
    pending.value
      .filter((f) => !isOverdue(f.dueDate))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  )

  async function fetchFollowUps() {
    loading.value = true
    await delay(500)
    followUps.value = [...mockFollowUps]
    loading.value = false
  }

  function setFilter(f: FollowUpFilter) {
    filter.value = f
  }

  async function completeFollowUp(id: string, notes?: string) {
    await delay(300)
    const item = followUps.value.find((f) => f.id === id)
    if (!item) return
    item.completed = true
    item.completedAt = new Date().toISOString()
    if (notes) item.notes = notes
  }

  async function rescheduleFollowUp(id: string, newDate: string) {
    await delay(300)
    const item = followUps.value.find((f) => f.id === id)
    if (!item) return
    item.dueDate = newDate
    item.completed = false
    item.completedAt = null
  }

  return {
    followUps,
    loading,
    filter,
    pending,
    filtered,
    overdue,
    upcoming,
    fetchFollowUps,
    setFilter,
    completeFollowUp,
    rescheduleFollowUp,
  }
})
