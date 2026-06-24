import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Interaction, InteractionFormData } from '@/types'
import { interactionsService, mapApiInteraction } from '@/services/interactions.service'
import { useAuthStore } from '@/stores/authStore'
import { useContactsStore } from './contactsStore'
import { useToast } from '@/composables/useToast'

export const useInteractionStore = defineStore('interactions', () => {
  const interactions = ref<Interaction[]>([])
  const loading = ref(false)
  const searchQuery = ref('')

  const filteredInteractions = computed(() => {
    if (!searchQuery.value) return interactions.value
    const q = searchQuery.value.toLowerCase()
    return interactions.value.filter(
      (i) =>
        i.contactName.toLowerCase().includes(q) ||
        i.notes.toLowerCase().includes(q) ||
        i.outcome.toLowerCase().includes(q),
    )
  })

  const timeline = computed(() =>
    [...filteredInteractions.value].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  )

  function contactNameMap() {
    const contactsStore = useContactsStore()
    return new Map(contactsStore.contacts.map((c) => [c.id, c.fullName]))
  }

  async function fetchInteractions() {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) return

    const contactsStore = useContactsStore()
    if (contactsStore.contacts.length === 0) {
      await contactsStore.fetchContacts()
    }

    loading.value = true
    try {
      const items = await interactionsService.fetchInteractions()
      const names = contactNameMap()
      interactions.value = items.map((item) =>
        mapApiInteraction(item, names.get(item.contactId) ?? 'Unknown'),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load interactions'
      useToast().error('Load failed', message)
    } finally {
      loading.value = false
    }
  }

  async function logInteraction(data: InteractionFormData) {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) throw new Error('Not authenticated')

    const contactsStore = useContactsStore()
    const contact = contactsStore.getContactById(data.contactId)
    if (!contact) throw new Error('Contact not found')

    const created = await interactionsService.logInteraction(data)
    const interaction = mapApiInteraction(created, contact.fullName)
    interactions.value.unshift(interaction)

    await contactsStore.fetchContacts()
    return interaction
  }

  return {
    interactions,
    loading,
    searchQuery,
    filteredInteractions,
    timeline,
    fetchInteractions,
    logInteraction,
  }
})
