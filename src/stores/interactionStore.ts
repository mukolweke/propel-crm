import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Interaction, InteractionFormData } from '@/types'
import { mockInteractions } from '@/mock'
import { delay, generateId } from '@/utils/helpers'
import { useContactsStore } from './contactsStore'

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

  async function fetchInteractions() {
    loading.value = true
    await delay(500)
    interactions.value = [...mockInteractions]
    loading.value = false
  }

  async function logInteraction(data: InteractionFormData) {
    await delay(400)
    const contactsStore = useContactsStore()
    const contact = contactsStore.getContactById(data.contactId)
    if (!contact) throw new Error('Contact not found')

    const interaction: Interaction = {
      id: generateId(),
      contactId: data.contactId,
      contactName: contact.fullName,
      type: data.type,
      notes: data.notes,
      outcome: data.outcome,
      nextFollowUpDate: data.nextFollowUpDate || null,
      createdAt: new Date().toISOString(),
      ownerId: 'user-001',
    }

    interactions.value.unshift(interaction)

    await contactsStore.updateContact(data.contactId, {
      lastInteraction: interaction.createdAt,
      followUpDate: data.nextFollowUpDate || contact.followUpDate,
      status: contact.status === 'new_lead' ? 'contacted' : contact.status,
    })

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
