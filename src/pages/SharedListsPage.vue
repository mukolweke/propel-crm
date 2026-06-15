<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSharedListsStore } from '@/stores/sharedListsStore'
import { useContactsStore } from '@/stores/contactsStore'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { ShareIcon, ShieldCheckIcon, UserPlusIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'
import type { SharePermission } from '@/types'

const sharedListsStore = useSharedListsStore()
const contactsStore = useContactsStore()
const toast = useToast()

const shareListId = ref('')
const shareUserId = ref('')
const sharePermission = ref<SharePermission>('view_report')

const permissionOptions = [
  { value: 'view_only', label: 'View Only' },
  { value: 'view_report', label: 'View + Reports' },
  { value: 'edit', label: 'Edit Access' },
]

onMounted(async () => {
  await Promise.all([sharedListsStore.fetchSharedLists(), contactsStore.fetchContacts()])
})

async function shareList() {
  if (!shareListId.value || !shareUserId.value) return
  await sharedListsStore.shareWithUser(shareListId.value, shareUserId.value, sharePermission.value)
  toast.success('Access granted')
  shareUserId.value = ''
}
</script>

<template>
  <div class="space-y-8">
    <BaseCard class="bg-gradient-to-br from-white to-brand-50/40">
      <h1 class="font-display text-3xl text-slate-900">Sharing & Permissions</h1>
      <p class="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
        Your security is our priority. By default, all property data, leads, and activity logs are private to you.
        Use these controls to collaborate securely with your team or management.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <BaseButton>
          <UserPlusIcon class="h-4 w-4" />
          Invite Manager/Team Member
        </BaseButton>
        <BaseButton variant="outline">
          <ShieldCheckIcon class="h-4 w-4" />
          Security Audit Logs
        </BaseButton>
      </div>
    </BaseCard>

    <div class="grid gap-6 xl:grid-cols-2">
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-xl text-slate-900">My Shared Lists</h2>
          <BaseBadge class="bg-brand-100 text-brand-800">{{ sharedListsStore.myLists.length }} Active Shares</BaseBadge>
        </div>

        <SkeletonLoader v-if="sharedListsStore.loading" />

        <EmptyState
          v-else-if="sharedListsStore.myLists.length === 0"
          title="No shared lists"
          description="Invite team members to collaborate on selected contacts."
        >
          <template #icon><ShareIcon class="h-7 w-7" /></template>
        </EmptyState>

        <BaseCard v-for="list in sharedListsStore.myLists" :key="list.id">
          <div v-for="user in list.sharedWith" :key="user.userId" class="space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
                  {{ user.name.split(' ').map((n) => n[0]).join('').slice(0, 2) }}
                </div>
                <div>
                  <p class="font-semibold text-slate-900">{{ user.name }}</p>
                  <p class="text-xs text-slate-500">{{ list.name }} • Invited recently</p>
                </div>
              </div>
              <button class="text-xs font-medium text-red-600">Revoke</button>
            </div>
            <div>
              <p class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Current Permissions</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="opt in permissionOptions"
                  :key="opt.value"
                  :class="[
                    'rounded-lg px-3 py-1.5 text-xs font-medium',
                    user.permission === opt.value ? 'bg-forest text-white' : 'bg-mint text-slate-600',
                  ]"
                >
                  {{ opt.label }}
                </span>
              </div>
            </div>
          </div>
          <p v-if="list.sharedWith.length === 0" class="text-sm text-slate-500">
            {{ list.name }} — {{ list.contactIds.length }} contacts (not shared yet)
          </p>
        </BaseCard>

        <BaseCard>
          <h3 class="mb-4 text-sm font-semibold text-slate-900">Grant Access</h3>
          <div class="grid gap-4">
            <BaseSelect
              v-model="shareListId"
              label="Shared List"
              placeholder="Select list"
              :options="sharedListsStore.myLists.map((l) => ({ value: l.id, label: l.name }))"
              variant="filled"
            />
            <BaseSelect
              v-model="shareUserId"
              label="User"
              placeholder="Select user"
              :options="sharedListsStore.availableUsers.map((u) => ({ value: u.id, label: u.name }))"
              variant="filled"
            />
            <BaseSelect v-model="sharePermission" label="Permission" :options="permissionOptions" variant="filled" />
          </div>
          <BaseButton class="mt-4" @click="shareList">Grant Access</BaseButton>
        </BaseCard>
      </div>

      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-xl text-slate-900">Shared with Me</h2>
          <span class="text-sm text-slate-500">2 Available Catalogs</span>
        </div>

        <BaseCard>
          <div class="mb-3 flex items-start justify-between">
            <div>
              <p class="font-semibold text-slate-900">Downtown Portfolio</p>
              <p class="text-sm text-slate-500">Shared by <span class="font-medium text-slate-700">Elena Gilbert</span></p>
            </div>
            <BaseBadge class="bg-blue-50 text-blue-700">Edit Access</BaseBadge>
          </div>
          <div class="flex gap-4 text-sm font-medium text-brand-600">
            <button>Open List</button>
            <button>History</button>
          </div>
        </BaseCard>

        <BaseCard>
          <div class="mb-3 flex items-start justify-between">
            <div>
              <p class="font-semibold text-slate-900">Westside Residential</p>
              <p class="text-sm text-slate-500">Shared by <span class="font-medium text-slate-700">Kevin Hart</span></p>
            </div>
            <BaseBadge class="bg-slate-100 text-slate-600">View Only</BaseBadge>
          </div>
          <div class="flex gap-4 text-sm font-medium text-brand-600">
            <button>Open List</button>
            <button>History</button>
          </div>
        </BaseCard>

        <div class="rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
          <div class="flex gap-3">
            <InformationCircleIcon class="h-5 w-5 shrink-0 text-brand-700" />
            <div>
              <p class="text-sm font-semibold text-brand-900">Privacy Tip</p>
              <p class="mt-1 text-sm text-brand-800">
                Changes to permissions are instant. Revoking access will immediately remove the user from all shared documents and dashboards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
