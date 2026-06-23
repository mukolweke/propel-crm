<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useSettingsStore } from '@/stores/settingsStore'
import StatCard from '@/components/ui/StatCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import SimpleBarChart from '@/components/ui/SimpleBarChart.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { formatRelativeTime } from '@/utils/helpers'
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  PlusIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon,
  BoltIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const dashboardStore = useDashboardStore()
const settingsStore = useSettingsStore()

onMounted(() => {
  dashboardStore.fetchDashboard()
  settingsStore.fetchSettings()
})

const quickActions = [
  { label: 'Add Contact', to: '/contacts/new', icon: PlusIcon, color: 'text-brand-700' },
  { label: 'Log Interaction', to: '/interactions', icon: ChatBubbleLeftRightIcon, color: 'text-blue-600' },
  { label: 'Add Follow Up', to: '/follow-ups', icon: CalendarDaysIcon, color: 'text-red-500' },
  { label: 'Export Report', to: '/reports', icon: DocumentArrowDownIcon, color: 'text-slate-500' },
]

function goTo(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="font-display text-3xl text-slate-900">Agent Overview</h1>
        <p class="mt-2 text-sm text-slate-500">
          Welcome back. Here is what is happening with your pipeline today.
        </p>
      </div>

      <Menu as="div" class="relative shrink-0">
        <MenuButton
          class="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <BoltIcon class="h-4 w-4" />
          Quick Actions
          <ChevronDownIcon class="h-4 w-4 opacity-80" />
        </MenuButton>

        <transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <MenuItems
            class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white py-1 shadow-lg focus:outline-none"
          >
            <MenuItem v-for="action in quickActions" :key="action.label" v-slot="{ active }">
              <button
                type="button"
                :class="[
                  active ? 'bg-mint' : '',
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700',
                ]"
                @click="goTo(action.to)"
              >
                <component :is="action.icon" :class="['h-5 w-5 shrink-0', action.color]" />
                {{ action.label }}
              </button>
            </MenuItem>
          </MenuItems>
        </transition>
      </Menu>
    </div>

    <div v-if="dashboardStore.loading" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="i in 4" :key="i" class="h-32 animate-pulse rounded-2xl bg-slate-200" />
    </div>
    <div v-else class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Contacts Added Today" trend="+8%">
        {{ dashboardStore.kpis.contactsToday }}
        <template #icon><UserGroupIcon class="h-5 w-5" /></template>
      </StatCard>
      <StatCard title="Clients Interacted" description="Today">
        {{ dashboardStore.kpis.interactionsToday }}
        <template #icon><ChatBubbleLeftRightIcon class="h-5 w-5" /></template>
      </StatCard>
      <StatCard title="Follow Ups Pending" description="Due">
        {{ dashboardStore.kpis.pendingFollowUps }}
        <template #icon><CalendarDaysIcon class="h-5 w-5" /></template>
      </StatCard>
      <StatCard title="Converted (Month)" description="Target: 5">
        {{ dashboardStore.kpis.convertedClients }}
        <template #icon><CheckBadgeIcon class="h-5 w-5" /></template>
      </StatCard>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <BaseCard class="flex min-h-88 flex-col">
        <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 class="font-display text-xl text-slate-900">Daily Interactions</h2>
          <div class="flex w-fit rounded-lg border border-slate-200 p-0.5 text-xs">
            <button class="rounded-md bg-white px-3 py-1.5 font-medium text-slate-900 shadow-sm">Last 7 Days</button>
            <button class="rounded-md px-3 py-1.5 font-medium text-slate-500">30 Days</button>
          </div>
        </div>
        <div class="flex flex-1 flex-col px-1 pb-2 pt-1">
          <SkeletonLoader v-if="dashboardStore.loading" />
          <SimpleBarChart v-else class="flex-1" :data="dashboardStore.dailyChart" color="bg-brand-500" />
        </div>
      </BaseCard>

      <BaseCard class="flex min-h-88 flex-col">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="font-display text-xl text-slate-900">Recent Activity</h2>
          <button
            class="text-sm font-medium text-brand-600 hover:text-brand-700"
            @click="router.push('/interactions')"
          >
            View All
          </button>
        </div>
        <div v-if="dashboardStore.loading" class="px-1 pb-2">
          <SkeletonLoader :rows="4" />
        </div>
        <div v-else class="divide-y divide-slate-100 px-1 pb-2">
          <div
            v-for="item in dashboardStore.activity"
            :key="item.id"
            class="flex items-start justify-between gap-4 py-5"
          >
            <div class="min-w-0">
              <p class="font-medium text-slate-900">{{ item.title }}</p>
              <p class="text-sm text-slate-500">{{ item.description }}</p>
            </div>
            <div class="shrink-0 text-right">
              <span class="text-xs text-slate-400">{{ formatRelativeTime(item.timestamp) }}</span>
              <div v-if="item.tag" class="mt-1">
                <BaseBadge :class="item.tagClass">{{ item.tag }}</BaseBadge>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
