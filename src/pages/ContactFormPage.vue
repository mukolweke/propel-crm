<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContactsStore } from '@/stores/contactsStore'
import { useToast } from '@/composables/useToast'
import ContactForm from '@/components/contacts/ContactForm.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { UsersIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import type { ContactFormData } from '@/types'

const route = useRoute()
const router = useRouter()
const contactsStore = useContactsStore()
const toast = useToast()
const saving = ref(false)

const isEdit = computed(() => Boolean(route.params.id))
const contactId = computed(() => route.params.id as string)

const initialData = computed(() => {
  if (!isEdit.value) return undefined
  const contact = contactsStore.getContactById(contactId.value)
  if (!contact) return undefined
  return {
    fullName: contact.fullName,
    phone: contact.phone,
    email: contact.email,
    propertyType: contact.propertyType,
    budgetRange: contact.budgetRange,
    locationPreference: contact.locationPreference,
    leadSource: contact.leadSource,
    notes: contact.notes,
    status: contact.status,
  }
})

onMounted(async () => {
  if (contactsStore.contacts.length === 0) {
    await contactsStore.fetchContacts()
  }
})

async function handleSubmit(data: ContactFormData) {
  saving.value = true
  try {
    if (isEdit.value) {
      await contactsStore.updateContact(contactId.value, data)
      toast.success('Contact updated')
    } else {
      await contactsStore.addContact(data)
      toast.success('Contact saved')
    }
    router.push('/contacts')
  } catch {
    toast.error('Failed to save contact')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <nav class="flex items-center gap-2 text-sm text-slate-500">
      <UsersIcon class="h-4 w-4" />
      <router-link to="/contacts" class="hover:text-forest">Contacts</router-link>
      <span>/</span>
      <span class="text-slate-900">{{ isEdit ? 'Edit Contact' : 'New Contact' }}</span>
    </nav>

    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="font-display text-3xl text-forest">
          {{ isEdit ? 'Edit Contact' : 'Add New Contact' }}
        </h1>
      </div>
      <button
        class="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
        @click="router.push('/contacts')"
      >
        <XMarkIcon class="h-4 w-4" />
        Cancel
      </button>
    </div>

    <BaseCard>
      <ContactForm :initial="initialData" :loading="saving" @submit="handleSubmit">
        <template #actions>
          <BaseButton variant="secondary" type="button" @click="router.push('/contacts')">
            Cancel
          </BaseButton>
          <BaseButton variant="soft" type="button" @click="router.push('/interactions')">
            Save & Add Activity
          </BaseButton>
          <BaseButton type="submit" :loading="saving">
            Save Contact
          </BaseButton>
        </template>
      </ContactForm>
    </BaseCard>
  </div>
</template>
