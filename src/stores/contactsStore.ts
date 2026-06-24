import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Contact, ContactFilters, ContactFormData, PaginatedResult } from '@/types'
import { isThisWeek, isToday } from '@/utils/helpers'
import { contactsService } from '@/services/contacts.service'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'

const defaultFilters = (): ContactFilters => ({
  search: '',
  status: 'all',
  period: 'all',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
})

export const useContactsStore = defineStore('contacts', () => {
  const contacts = ref<Contact[]>([])
  const loading = ref(false)
  const filters = ref<ContactFilters>(defaultFilters())
  const page = ref(1)
  const pageSize = ref(10)
  const viewMode = ref<'table' | 'grid'>('table')

  const filteredContacts = computed(() => {
    let result = [...contacts.value]

    if (filters.value.search) {
      const q = filters.value.search.toLowerCase()
      result = result.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.propertyType.toLowerCase().includes(q),
      )
    }

    if (filters.value.status !== 'all') {
      result = result.filter((c) => c.status === filters.value.status)
    }

    switch (filters.value.period) {
      case 'today':
        result = result.filter((c) => isToday(c.createdAt))
        break
      case 'week':
        result = result.filter((c) => isThisWeek(c.createdAt))
        break
      case 'converted':
        result = result.filter((c) => c.converted)
        break
      case 'pending_follow_up':
        result = result.filter((c) => c.followUpDate && !c.converted)
        break
      case 'new_leads':
        result = result.filter((c) => c.status === 'new_lead')
        break
    }

    const { sortBy, sortOrder } = filters.value
    result.sort((a, b) => {
      const aVal = a[sortBy] ?? ''
      const bVal = b[sortBy] ?? ''
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  })

  const paginatedContacts = computed<PaginatedResult<Contact>>(() => {
    const total = filteredContacts.value.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize.value))
    const start = (page.value - 1) * pageSize.value
    return {
      items: filteredContacts.value.slice(start, start + pageSize.value),
      total,
      page: page.value,
      pageSize: pageSize.value,
      totalPages,
    }
  })

  async function fetchContacts() {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) return

    loading.value = true
    try {
      contacts.value = await contactsService.fetchContacts(
        filters.value.search || undefined,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load contacts'
      useToast().error('Load failed', message)
    } finally {
      loading.value = false
    }
  }

  function setFilters(partial: Partial<ContactFilters>) {
    filters.value = { ...filters.value, ...partial }
    page.value = 1
  }

  function setPage(p: number) {
    page.value = p
  }

  function setViewMode(mode: 'table' | 'grid') {
    viewMode.value = mode
  }

  function getContactById(id: string) {
    return contacts.value.find((c) => c.id === id)
  }

  async function addContact(data: ContactFormData) {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) throw new Error('Not authenticated')

    const contact = await contactsService.createContact(data)
    contacts.value.unshift(contact)
    return contact
  }

  async function updateContact(
    id: string,
    data: Partial<ContactFormData> & Partial<Pick<Contact, 'lastInteraction' | 'followUpDate' | 'converted'>>,
  ) {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) throw new Error('Not authenticated')

    const existing = getContactById(id)
    if (!existing) throw new Error('Contact not found')

    const formData: ContactFormData = {
      fullName: data.fullName ?? existing.fullName,
      phone: data.phone ?? existing.phone,
      email: data.email ?? existing.email,
      propertyType: data.propertyType ?? existing.propertyType,
      budgetRange: data.budgetRange ?? existing.budgetRange,
      locationPreference: data.locationPreference ?? existing.locationPreference,
      leadSource: data.leadSource ?? existing.leadSource,
      notes: data.notes ?? existing.notes,
      status: data.status ?? existing.status,
    }

    const contact = await contactsService.updateContact(id, formData)
    const index = contacts.value.findIndex((c) => c.id === id)
    if (index !== -1) contacts.value[index] = contact
    return contact
  }

  async function deleteContact(id: string) {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) throw new Error('Not authenticated')

    await contactsService.deleteContact(id)
    contacts.value = contacts.value.filter((c) => c.id !== id)
  }

  return {
    contacts,
    loading,
    filters,
    page,
    pageSize,
    viewMode,
    filteredContacts,
    paginatedContacts,
    fetchContacts,
    setFilters,
    setPage,
    setViewMode,
    getContactById,
    addContact,
    updateContact,
    deleteContact,
  }
})
