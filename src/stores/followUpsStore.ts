import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FollowUp } from '@/types'
import { isOverdue, isThisWeek, isToday, isTomorrow } from '@/utils/helpers'
import { followUpsService, mapApiFollowUp } from '@/services/followups.service'
import { useAuthStore } from '@/stores/authStore'
import { useContactsStore } from '@/stores/contactsStore'
import { useToast } from '@/composables/useToast'

export type FollowUpFilter = 'all' | 'today' | 'tomorrow' | 'week'

export const useFollowUpsStore = defineStore('followUps', () => {
  const followUps = ref<FollowUp[]>([])
  const loading = ref(false)
  const filter = ref<FollowUpFilter>('all')

  const pending = computed(() => followUps.value.filter((f) => !f.completed))

  const filtered = computed(() => {
    let result = pending.value.filter((f) => !isOverdue(f.dueDate))
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

  const overdue = computed(() =>
    pending.value
      .filter((f) => isOverdue(f.dueDate))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  )

  const upcoming = computed(() =>
    pending.value
      .filter((f) => !isOverdue(f.dueDate))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  )

  function contactNameMap() {
    const contactsStore = useContactsStore()
    return new Map(contactsStore.contacts.map((c) => [c.id, c.fullName]))
  }

  async function fetchFollowUps() {
    const authStore = useAuthStore()
    if (!authStore.token) return

    const contactsStore = useContactsStore()
    loading.value = true
    try {
      if (contactsStore.contacts.length === 0) {
        await contactsStore.fetchContacts()
      }

      const items = await followUpsService.fetchFollowUps(authStore.token)
      const names = contactNameMap()
      followUps.value = items.map((item) =>
        mapApiFollowUp(item, names.get(item.contactId) ?? 'Unknown'),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load follow-ups'
      useToast().error('Load failed', message)
    } finally {
      loading.value = false
    }
  }

  function setFilter(f: FollowUpFilter) {
    filter.value = f
  }

  async function completeFollowUp(id: string, notes?: string) {
    const authStore = useAuthStore()
    if (!authStore.token) throw new Error('Not authenticated')

    await followUpsService.completeFollowUp(authStore.token, id)
    const item = followUps.value.find((f) => f.id === id)
    if (item) {
      item.completed = true
      item.completedAt = new Date().toISOString()
      if (notes) item.notes = notes
    }
  }

  async function rescheduleFollowUp(id: string, newDate: string) {
    const authStore = useAuthStore()
    if (!authStore.token) throw new Error('Not authenticated')

    const updated = await followUpsService.rescheduleFollowUp(authStore.token, id, newDate)
    const item = followUps.value.find((f) => f.id === id)
    if (item) {
      item.dueDate = updated.scheduledDate
      item.completed = false
      item.completedAt = null
    }
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
