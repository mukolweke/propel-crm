import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Contact, ContactFilters, ContactFormData, PaginatedResult } from '@/types'
import { mockContacts } from '@/mock'
import { delay, generateId, isThisWeek, isToday } from '@/utils/helpers'

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
    loading.value = true
    await delay(600)
    contacts.value = [...mockContacts]
    loading.value = false
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
    await delay(400)
    const now = new Date().toISOString()
    const contact: Contact = {
      id: generateId(),
      ...data,
      lastInteraction: null,
      followUpDate: null,
      converted: data.status === 'converted',
      createdAt: now,
      updatedAt: now,
      ownerId: 'user-001',
    }
    contacts.value.unshift(contact)
    return contact
  }

  async function updateContact(id: string, data: Partial<ContactFormData> & Partial<Pick<Contact, 'lastInteraction' | 'followUpDate' | 'converted'>>) {
    await delay(400)
    const index = contacts.value.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Contact not found')
    contacts.value[index] = {
      ...contacts.value[index],
      ...data,
      converted: data.status === 'converted' ? true : contacts.value[index].converted,
      updatedAt: new Date().toISOString(),
    }
    return contacts.value[index]
  }

  async function deleteContact(id: string) {
    await delay(300)
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
