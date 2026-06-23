<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { useInteractionStore } from '@/stores/interactionStore'
import { useContactsStore } from '@/stores/contactsStore'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import InteractionLogForm from '@/components/interactions/InteractionLogForm.vue'
import { formatRelativeTime } from '@/utils/helpers'
import {
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import type { InteractionFormData } from '@/types'
import { ApiError } from '@/services/graphql'

const interactionStore = useInteractionStore()
const contactsStore = useContactsStore()
const toast = useToast()
const saving = ref(false)
const showLogModal = ref(false)
const showContactSuggestions = ref(false)

const hasAnyInteractions = computed(() => interactionStore.interactions.length > 0)

const contactSuggestions = computed(() => {
  const q = interactionStore.searchQuery.trim().toLowerCase()
  if (!q) return []
  return contactsStore.contacts
    .filter((c) => c.fullName.toLowerCase().includes(q))
    .slice(0, 6)
})

function setActivitySearch(value: string) {
  interactionStore.searchQuery = value
}

function selectContactFilter(name: string) {
  interactionStore.searchQuery = name
  showContactSuggestions.value = false
}

function clearActivitySearch() {
  interactionStore.searchQuery = ''
  showContactSuggestions.value = false
}

function hideContactSuggestions() {
  window.setTimeout(() => {
    showContactSuggestions.value = false
  }, 150)
}

const form = reactive<InteractionFormData>({
  contactId: '',
  type: 'call',
  notes: '',
  outcome: '',
  nextFollowUpDate: '',
})

onMounted(async () => {
  await contactsStore.fetchContacts()
  await interactionStore.fetchInteractions()
})

function resetFormFields() {
  form.notes = ''
  form.outcome = ''
  form.nextFollowUpDate = ''
}

async function handleSubmit() {
  if (!form.contactId) {
    toast.error('Select a client')
    return
  }
  saving.value = true
  try {
    await interactionStore.logInteraction({ ...form })
    toast.success('Interaction saved')
    resetFormFields()
    showLogModal.value = false
  } catch (err) {
    const message =
      err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to log interaction'
    toast.error('Save failed', message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="font-display text-3xl text-slate-900">Daily Interaction Log</h1>
        <p class="mt-2 text-sm text-slate-500">Capture your client engagement details in seconds.</p>
      </div>
      <BaseButton class="shrink-0 lg:hidden" @click="showLogModal = true">
        <PlusIcon class="h-4 w-4" />
        Quick Log
      </BaseButton>
    </div>

    <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
      <div class="hidden space-y-6 lg:block lg:sticky lg:top-6">
        <BaseCard>
          <div class="mb-6">
            <h2 class="font-display text-xl text-slate-900">Quick Log</h2>
            <p class="mt-1 text-sm text-slate-500">Capture your client engagement details in seconds.</p>
          </div>
          <InteractionLogForm :form="form" :saving="saving" @submit="handleSubmit" />
        </BaseCard>

        <div class="rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
          <div class="flex gap-3">
            <LightBulbIcon class="h-5 w-5 shrink-0 text-brand-700" />
            <p class="text-sm text-brand-900">
              <span class="font-semibold">Pro Tip:</span>
              Adding a follow-up date automatically creates a task in the client's pipeline.
            </p>
          </div>
        </div>
      </div>

      <div class="flex min-h-0 flex-col gap-6 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <div class="rounded-2xl border border-brand-200 bg-brand-50/60 p-5 lg:hidden">
          <div class="flex gap-3">
            <LightBulbIcon class="h-5 w-5 shrink-0 text-brand-700" />
            <p class="text-sm text-brand-900">
              <span class="font-semibold">Pro Tip:</span>
              Adding a follow-up date automatically creates a task in the client's pipeline.
            </p>
          </div>
        </div>

        <BaseCard v-if="hasAnyInteractions" class="flex flex-1 flex-col">
          <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h2 class="font-display text-xl text-slate-900">Activity History</h2>
            <div class="relative w-full sm:max-w-xs">
              <MagnifyingGlassIcon class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                :value="interactionStore.searchQuery"
                type="search"
                placeholder="Search by client name..."
                class="w-full rounded-full border border-slate-200 bg-mint py-2.5 pl-10 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                @focus="showContactSuggestions = true"
                @input="setActivitySearch(($event.target as HTMLInputElement).value); showContactSuggestions = true"
                @blur="hideContactSuggestions"
              />
              <button
                v-if="interactionStore.searchQuery"
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-600"
                aria-label="Clear search"
                @mousedown.prevent="clearActivitySearch"
              >
                <XMarkIcon class="h-4 w-4" />
              </button>
              <div
                v-if="showContactSuggestions && contactSuggestions.length"
                class="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              >
                <button
                  v-for="contact in contactSuggestions"
                  :key="contact.id"
                  type="button"
                  class="block w-full px-4 py-2.5 text-left text-sm hover:bg-mint"
                  @mousedown.prevent="selectContactFilter(contact.fullName)"
                >
                  {{ contact.fullName }}
                </button>
              </div>
            </div>
          </div>

          <p
            v-if="interactionStore.searchQuery && interactionStore.timeline.length"
            class="mb-4 text-xs text-slate-500"
          >
            Showing {{ interactionStore.timeline.length }} of {{ interactionStore.interactions.length }} activities
          </p>

          <SkeletonLoader v-if="interactionStore.loading" />
          <div v-else-if="interactionStore.timeline.length" class="space-y-4">
            <div
              v-for="item in interactionStore.timeline"
              :key="item.id"
              class="rounded-xl border border-slate-100 bg-mint/50 p-4"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="font-medium text-slate-900">{{ item.contactName }}</p>
                  <p class="text-sm capitalize text-brand-700">{{ item.type.replace('_', ' ') }}</p>
                </div>
                <span class="shrink-0 text-xs text-slate-400">{{ formatRelativeTime(item.createdAt) }}</span>
              </div>
              <p v-if="item.notes" class="mt-2 text-sm text-slate-600">{{ item.notes }}</p>
            </div>
          </div>
          <div v-else class="rounded-xl border border-dashed border-slate-200 bg-mint/30 px-4 py-10 text-center">
            <p class="font-medium text-slate-900">No activity found</p>
            <p class="mt-1 text-sm text-slate-500">
              No interactions match "{{ interactionStore.searchQuery }}". Try another client name.
            </p>
            <button
              type="button"
              class="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700"
              @click="clearActivitySearch"
            >
              Clear search
            </button>
          </div>
        </BaseCard>

        <EmptyState
          v-else-if="!interactionStore.loading"
          title="No interactions yet"
          description="Log your first client interaction to start building your activity history."
        >
          <template #icon><ChatBubbleLeftRightIcon class="h-7 w-7" /></template>
          <BaseButton class="mt-4 lg:hidden" @click="showLogModal = true">
            <PlusIcon class="h-4 w-4" />
            Quick Log
          </BaseButton>
        </EmptyState>
      </div>
    </div>

    <TransitionRoot :show="showLogModal" as="template">
      <Dialog class="relative z-50 lg:hidden" @close="showLogModal = false">
        <TransitionChild
          as="template"
          enter="ease-out duration-200"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-150"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-slate-900/40" />
        </TransitionChild>

        <div class="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
          <TransitionChild
            as="template"
            enter="ease-out duration-200"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-7">
              <DialogTitle class="font-display text-xl text-slate-900">Quick Log</DialogTitle>
              <p class="mt-1 text-sm text-slate-500">Capture your client engagement details in seconds.</p>

              <div class="mt-6">
                <InteractionLogForm :form="form" :saving="saving" @submit="handleSubmit" />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>
