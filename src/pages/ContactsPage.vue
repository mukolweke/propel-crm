<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContactsStore } from '@/stores/contactsStore'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import Pagination from '@/components/ui/Pagination.vue'
import {
  getStatusColor,
  getStatusLabel,
  getInitials,
  getAvatarColor,
} from '@/utils/constants'
import { formatRelativeTime, isOverdue, classNames } from '@/utils/helpers'
import {
  PlusIcon,
  Squares2X2Icon,
  TableCellsIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  UsersIcon,
  FunnelIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const contactsStore = useContactsStore()
const { confirm } = useConfirm()
const toast = useToast()

function followUpLabel(date: string | null) {
  if (!date) return '—'
  if (isOverdue(date)) return 'Overdue'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(date))
}

const periodFilters = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'converted', label: 'Converted' },
  { value: 'pending_follow_up', label: 'Follow Up Needed' },
] as const

onMounted(() => {
  const initialSearch = typeof route.query.search === 'string' ? route.query.search : ''
  if (initialSearch) {
    contactsStore.setFilters({ search: initialSearch.slice(0, 200) })
  } else {
    void contactsStore.fetchContacts()
  }
})

async function handleDelete(id: string, name: string) {
  const ok = await confirm({
    title: 'Delete contact',
    message: `Are you sure you want to delete ${name}? This cannot be undone.`,
    confirmLabel: 'Delete',
    variant: 'danger',
  })
  if (ok) {
    await contactsStore.deleteContact(id)
    toast.success('Contact deleted')
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="font-display text-3xl text-slate-900">Contacts & Leads</h1>
        <p class="mt-2 text-sm text-slate-500">Manage your pipeline and client relationships effectively.</p>
      </div>
      <BaseButton size="lg" @click="router.push('/contacts/new')">
        <PlusIcon class="h-4 w-4" />
        New Contact
      </BaseButton>
    </div>

    <BaseCard>
      <div class="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="f in periodFilters"
            :key="f.value"
            :class="[
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              contactsStore.filters.period === f.value
                ? 'border-forest bg-forest text-white'
                : 'border-brand-200 bg-white text-forest hover:bg-brand-50',
            ]"
            @click="contactsStore.setFilters({ period: f.value })"
          >
            {{ f.label }}
          </button>
          <BaseButton variant="outline" size="sm">
            <FunnelIcon class="h-4 w-4" />
            Advanced Filters
          </BaseButton>
        </div>
        <div class="flex items-center gap-3">
          <input
            :value="contactsStore.filters.search"
            type="search"
            maxlength="200"
            placeholder="Search contacts or leads..."
            class="w-full rounded-full border border-slate-200 bg-mint px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 xl:w-72"
            @input="contactsStore.setFilters({ search: ($event.target as HTMLInputElement).value })"
          />
          <div class="hidden rounded-xl border border-slate-200 p-0.5 sm:flex">
            <button
              :class="['rounded-lg p-2', contactsStore.viewMode === 'table' ? 'bg-mint' : '']"
              @click="contactsStore.setViewMode('table')"
            >
              <TableCellsIcon class="h-4 w-4 text-slate-600" />
            </button>
            <button
              :class="['rounded-lg p-2', contactsStore.viewMode === 'grid' ? 'bg-mint' : '']"
              @click="contactsStore.setViewMode('grid')"
            >
              <Squares2X2Icon class="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <SkeletonLoader v-if="contactsStore.loading" />

      <EmptyState
        v-else-if="contactsStore.paginatedContacts.total === 0"
        title="No contacts found"
        description="Try adjusting your filters or add a new contact to get started."
      >
        <template #icon><UsersIcon class="h-7 w-7" /></template>
        <template #action>
          <BaseButton @click="router.push('/contacts/new')">New Contact</BaseButton>
        </template>
      </EmptyState>

      <div v-else-if="contactsStore.viewMode === 'table'" class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th class="px-4 py-4">Client Name</th>
              <th class="px-4 py-4">Property Interest</th>
              <th class="px-4 py-4">Status</th>
              <th class="px-4 py-4 hidden lg:table-cell">Last Interaction</th>
              <th class="px-4 py-4 hidden lg:table-cell">Next Follow-Up</th>
              <th class="px-4 py-4">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="contact in contactsStore.paginatedContacts.items"
              :key="contact.id"
              class="transition-colors hover:bg-mint/50"
            >
              <td class="px-4 py-5">
                <div class="flex items-center gap-3">
                  <div
                    :class="classNames(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                      getAvatarColor(contact.fullName),
                    )"
                  >
                    {{ getInitials(contact.fullName) }}
                  </div>
                  <div>
                    <p class="font-semibold text-slate-900">{{ contact.fullName }}</p>
                    <p class="text-slate-500">{{ contact.phone }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-5">
                <p class="font-medium text-slate-900">{{ contact.propertyType }}</p>
                <p class="font-medium text-brand-700">{{ contact.budgetRange }}</p>
              </td>
              <td class="px-4 py-5">
                <BaseBadge :class="getStatusColor(contact.status)">
                  {{ getStatusLabel(contact.status) }}
                </BaseBadge>
              </td>
              <td class="hidden px-4 py-5 text-slate-500 lg:table-cell">
                {{ contact.lastInteraction ? formatRelativeTime(contact.lastInteraction) : '—' }}
              </td>
              <td class="hidden px-4 py-5 lg:table-cell">
                <div class="flex items-center gap-1.5">
                  <CalendarDaysIcon
                    v-if="contact.followUpDate && !isOverdue(contact.followUpDate)"
                    class="h-4 w-4 text-slate-400"
                  />
                  <ExclamationTriangleIcon
                    v-else-if="contact.followUpDate && isOverdue(contact.followUpDate)"
                    class="h-4 w-4 text-red-500"
                  />
                  <CheckIcon v-else-if="contact.converted" class="h-4 w-4 text-brand-600" />
                  <span
                    :class="contact.followUpDate && isOverdue(contact.followUpDate) ? 'font-medium text-red-600' : 'text-slate-500'"
                  >
                    {{ contact.converted ? 'Completed' : followUpLabel(contact.followUpDate) }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-5">
                <div class="flex gap-1">
                  <button
                    class="rounded-lg p-2 text-slate-400 hover:bg-mint hover:text-slate-600"
                    title="Edit"
                    @click="router.push(`/contacts/${contact.id}/edit`)"
                  >
                    <PencilIcon class="h-4 w-4" />
                  </button>
                  <button
                    class="rounded-lg p-2 text-slate-400 hover:bg-mint hover:text-slate-600"
                    title="Delete"
                    @click="handleDelete(contact.id, contact.fullName)"
                  >
                    <TrashIcon class="h-4 w-4" />
                  </button>
                  <button class="rounded-lg p-2 text-slate-400 hover:bg-mint hover:text-slate-600" title="Share">
                    <ShareIcon class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="contact in contactsStore.paginatedContacts.items"
          :key="contact.id"
          class="rounded-2xl border border-slate-200/80 p-5 transition-shadow hover:shadow-md"
        >
          <div class="flex items-start gap-3">
            <div :class="classNames('flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold', getAvatarColor(contact.fullName))">
              {{ getInitials(contact.fullName) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-semibold text-slate-900">{{ contact.fullName }}</h3>
                <BaseBadge :class="getStatusColor(contact.status)">{{ getStatusLabel(contact.status) }}</BaseBadge>
              </div>
              <p class="mt-1 text-sm text-slate-500">{{ contact.propertyType }}</p>
              <p class="text-sm font-medium text-brand-700">{{ contact.budgetRange }}</p>
            </div>
          </div>
          <BaseButton class="mt-4" size="sm" variant="soft" @click="router.push(`/contacts/${contact.id}/edit`)">
            <PencilIcon class="h-3.5 w-3.5" /> Edit
          </BaseButton>
        </div>
      </div>

      <Pagination
        v-if="!contactsStore.loading && contactsStore.paginatedContacts.total > 0"
        class="mt-8"
        :page="contactsStore.paginatedContacts.page"
        :total-pages="contactsStore.paginatedContacts.totalPages"
        :total="contactsStore.paginatedContacts.total"
        @update:page="contactsStore.setPage"
      />
    </BaseCard>
  </div>
</template>
