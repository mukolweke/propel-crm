<script setup lang="ts">
import { ref } from 'vue'
import { useContactsStore } from '@/stores/contactsStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { INTERACTION_TYPES } from '@/utils/constants'
import {
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  DevicePhoneMobileIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
} from '@heroicons/vue/24/outline'
import type { InteractionFormData, InteractionType } from '@/types'

interface Props {
  form: InteractionFormData
  saving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  saving: false,
})

const emit = defineEmits<{ submit: [] }>()

const contactsStore = useContactsStore()
const clientSearch = ref('')

const typeIcons: Record<InteractionType, typeof PhoneIcon> = {
  call: PhoneIcon,
  whatsapp: ChatBubbleLeftRightIcon,
  sms: DevicePhoneMobileIcon,
  meeting: UserGroupIcon,
  property_viewing: BuildingOffice2Icon,
  physical_visit: MapPinIcon,
}

const recentClients = ['Sarah Jenkins', 'Michael Thorne']

function filteredContacts() {
  const q = clientSearch.value.toLowerCase()
  return contactsStore.contacts
    .filter((c) => !q || c.fullName.toLowerCase().includes(q))
    .slice(0, 8)
    .map((c) => ({ value: c.id, label: c.fullName }))
}

function selectClient(id: string, label: string) {
  props.form.contactId = id
  clientSearch.value = label
}

function selectRecent(name: string) {
  const contact = contactsStore.contacts.find((c) => c.fullName === name)
  if (contact) {
    selectClient(contact.id, contact.fullName)
  } else {
    clientSearch.value = name
  }
}

function selectType(type: InteractionType) {
  props.form.type = type
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="emit('submit')">
    <div>
      <label class="mb-2 block text-sm font-medium text-slate-700">Select Client</label>
      <div class="relative">
        <MagnifyingGlassIcon class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          v-model="clientSearch"
          type="search"
          placeholder="Search client name or property..."
          class="w-full rounded-xl border border-transparent bg-mint py-3 pl-11 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          @focus="form.contactId = ''"
        />
      </div>
      <div v-if="clientSearch && filteredContacts().length" class="mt-2 rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          v-for="c in filteredContacts()"
          :key="c.value"
          type="button"
          class="block w-full px-4 py-2.5 text-left text-sm hover:bg-mint"
          @click="selectClient(c.value, c.label)"
        >
          {{ c.label }}
        </button>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <span class="text-xs font-medium text-slate-500">Recent:</span>
        <button
          v-for="name in recentClients"
          :key="name"
          type="button"
          class="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
          @click="selectRecent(name)"
        >
          {{ name }}
        </button>
      </div>
    </div>

    <div>
      <label class="mb-3 block text-sm font-medium text-slate-700">Interaction Type</label>
      <div class="grid grid-cols-3 gap-2 sm:gap-3">
        <button
          v-for="t in INTERACTION_TYPES"
          :key="t.value"
          type="button"
          :class="[
            'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:py-4',
            form.type === t.value
              ? 'border-forest bg-brand-50 text-forest'
              : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200',
          ]"
          @click="selectType(t.value)"
        >
          <component :is="typeIcons[t.value]" class="h-5 w-5" />
          {{ t.label }}
        </button>
      </div>
    </div>

    <BaseTextarea
      v-model="form.notes"
      label="Outcome & Notes"
      :rows="3"
      placeholder="Briefly describe what happened..."
      variant="filled"
    />

    <BaseInput v-model="form.nextFollowUpDate" label="Next Follow-up Date" type="date" variant="filled">
      <template #icon>
        <CalendarDaysIcon class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </template>
    </BaseInput>

    <BaseButton type="submit" block size="lg" :loading="saving">
      Save Interaction
    </BaseButton>
  </form>
</template>
