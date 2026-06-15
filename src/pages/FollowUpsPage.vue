<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useFollowUpsStore } from '@/stores/followUpsStore'
import type { FollowUpFilter } from '@/stores/followUpsStore'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { formatDate, isOverdue } from '@/utils/helpers'
import { CalendarDaysIcon, CheckIcon } from '@heroicons/vue/24/outline'

const followUpsStore = useFollowUpsStore()
const toast = useToast()
const rescheduleId = ref<string | null>(null)
const rescheduleDate = ref('')
const noteText = ref('')

const filters: { value: FollowUpFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'This Week' },
]

onMounted(() => followUpsStore.fetchFollowUps())

async function complete(id: string) {
  await followUpsStore.completeFollowUp(id, noteText.value || undefined)
  noteText.value = ''
  toast.success('Follow-up completed')
}

async function reschedule(id: string) {
  if (!rescheduleDate.value) return
  await followUpsStore.rescheduleFollowUp(id, rescheduleDate.value)
  rescheduleId.value = null
  rescheduleDate.value = ''
  toast.success('Follow-up rescheduled')
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Follow Ups</h1>
      <p class="mt-1 text-sm text-slate-500">Stay on top of your client follow-ups</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="f in filters"
        :key="f.value"
        :class="[
          'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
          followUpsStore.filter === f.value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
        ]"
        @click="followUpsStore.setFilter(f.value)"
      >
        {{ f.label }}
      </button>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <BaseCard>
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-red-600">Overdue</h2>
          <BaseBadge class="bg-red-100 text-red-700">{{ followUpsStore.overdue.length }}</BaseBadge>
        </div>
        <SkeletonLoader v-if="followUpsStore.loading" :rows="3" />
        <EmptyState
          v-else-if="followUpsStore.overdue.length === 0"
          title="No overdue follow-ups"
          description="You're all caught up!"
        >
          <template #icon><CheckIcon class="h-7 w-7" /></template>
        </EmptyState>
        <div v-else class="space-y-3">
          <div
            v-for="item in followUpsStore.overdue"
            :key="item.id"
            class="rounded-lg border border-red-100 bg-red-50 p-4"
          >
            <div class="flex items-start justify-between">
              <div>
                <p class="font-medium text-slate-900">{{ item.contactName }}</p>
                <p class="text-sm text-red-600">Due {{ formatDate(item.dueDate) }}</p>
                <p class="mt-1 text-sm text-slate-600">{{ item.notes }}</p>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <BaseButton size="sm" @click="complete(item.id)">Complete</BaseButton>
              <BaseButton size="sm" variant="secondary" @click="rescheduleId = item.id">Reschedule</BaseButton>
            </div>
            <div v-if="rescheduleId === item.id" class="mt-3 flex gap-2">
              <input v-model="rescheduleDate" type="date" class="rounded-lg border border-slate-200 px-2 py-1 text-sm" />
              <BaseButton size="sm" @click="reschedule(item.id)">Save</BaseButton>
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900">Upcoming</h2>
          <BaseBadge class="bg-brand-100 text-brand-700">{{ followUpsStore.filtered.length }}</BaseBadge>
        </div>
        <SkeletonLoader v-if="followUpsStore.loading" :rows="3" />
        <EmptyState
          v-else-if="followUpsStore.filtered.length === 0"
          title="No upcoming follow-ups"
          description="Add follow-up dates when logging interactions."
        >
          <template #icon><CalendarDaysIcon class="h-7 w-7" /></template>
        </EmptyState>
        <div v-else class="space-y-3">
          <div
            v-for="item in followUpsStore.filtered"
            :key="item.id"
            class="rounded-lg border border-slate-200 p-4"
          >
            <div class="flex items-start justify-between">
              <div>
                <p class="font-medium text-slate-900">{{ item.contactName }}</p>
                <p class="text-sm text-slate-500">Due {{ formatDate(item.dueDate) }}</p>
                <p class="mt-1 text-sm text-slate-600">{{ item.notes }}</p>
              </div>
              <BaseBadge v-if="isOverdue(item.dueDate)" class="bg-red-100 text-red-700">Overdue</BaseBadge>
            </div>
            <div class="mt-3">
              <input
                v-model="noteText"
                type="text"
                placeholder="Add completion notes..."
                class="mb-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              />
              <div class="flex gap-2">
                <BaseButton size="sm" @click="complete(item.id)">Complete</BaseButton>
                <BaseButton size="sm" variant="secondary" @click="rescheduleId = item.id">Reschedule</BaseButton>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
