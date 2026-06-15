<script setup lang="ts">
import { onMounted } from 'vue'
import { useReportsStore } from '@/stores/reportsStore'
import type { ReportPeriod } from '@/stores/reportsStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import StatCard from '@/components/ui/StatCard.vue'
import SimpleBarChart from '@/components/ui/SimpleBarChart.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import DateRangePicker from '@/components/ui/DateRangePicker.vue'
import {
  DocumentArrowDownIcon,
  TableCellsIcon,
  DocumentTextIcon,
  UserPlusIcon,
  ChartBarIcon,
  CalendarDaysIcon,
} from '@heroicons/vue/24/outline'

const reportsStore = useReportsStore()

const tabs: { value: ReportPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily Report' },
  { value: 'monthly', label: 'Monthly Report' },
]

const exportActions = [
  { label: 'Export PDF', format: 'pdf' as const, icon: DocumentTextIcon },
  { label: 'Export Excel', format: 'excel' as const, icon: TableCellsIcon },
  { label: 'Export CSV', format: 'csv' as const, icon: DocumentArrowDownIcon },
]

onMounted(() => reportsStore.fetchReports('daily'))

function switchTab(period: ReportPeriod) {
  reportsStore.fetchReports(period)
}

function onDateRangeApply() {
  reportsStore.fetchReports(reportsStore.period)
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h1 class="font-display text-3xl text-slate-900">Analytics & Reports</h1>
        <p class="mt-2 text-sm text-slate-500">Monitor your sales performance and lead conversion trends.</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <BaseButton
          v-for="action in exportActions"
          :key="action.format"
          variant="outline"
          size="md"
          @click="reportsStore.exportReport(action.format)"
        >
          <component :is="action.icon" class="h-4 w-4 shrink-0" />
          {{ action.label }}
        </BaseButton>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-4">
      <DateRangePicker
        v-model:start="reportsStore.dateFrom"
        v-model:end="reportsStore.dateTo"
        @apply="onDateRangeApply"
      />
      <div class="flex gap-1 border-b border-slate-200">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          :class="[
            'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            reportsStore.period === tab.value
              ? 'border-forest text-forest'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          ]"
          @click="switchTab(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div v-if="reportsStore.loading" class="grid gap-5 sm:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-32 animate-pulse rounded-2xl bg-slate-200" />
    </div>
    <div v-else class="grid gap-5 sm:grid-cols-3">
      <StatCard title="Total Leads" trend="+12.5% vs last month">
        {{ reportsStore.metrics.leadsCreated.toLocaleString() }}
        <template #icon><UserPlusIcon class="h-5 w-5" /></template>
      </StatCard>
      <StatCard title="Conversion Rate" trend="+2.1% from target">
        {{ reportsStore.metrics.conversionRate }}%
        <template #icon><ChartBarIcon class="h-5 w-5" /></template>
      </StatCard>
      <StatCard title="Most Active Day" description="Peak time: 10:00 AM - 2:00 PM">
        Tuesday
        <template #icon><CalendarDaysIcon class="h-5 w-5" /></template>
      </StatCard>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <BaseCard>
        <h2 class="mb-5 font-display text-xl text-slate-900">Monthly Conversions</h2>
        <SkeletonLoader v-if="reportsStore.loading" />
        <SimpleBarChart v-else :data="reportsStore.conversionTrend" color="bg-brand-500" />
      </BaseCard>
      <BaseCard>
        <h2 class="mb-5 font-display text-xl text-slate-900">Lead Sources</h2>
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <p class="text-3xl font-bold text-slate-900">1.2k</p>
            <p class="text-sm text-slate-500">Total</p>
          </div>
        </div>
        <div class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-slate-600">Zillow Ads</span><span class="font-medium">45%</span></div>
          <div class="flex justify-between"><span class="text-slate-600">Referrals</span><span class="font-medium">25%</span></div>
          <div class="flex justify-between"><span class="text-slate-600">Organic</span><span class="font-medium">30%</span></div>
        </div>
      </BaseCard>
    </div>

    <BaseCard>
      <div class="mb-5 flex items-center justify-between">
        <h2 class="font-display text-xl text-slate-900">Conversion Details</h2>
        <button class="text-sm font-medium text-brand-600">View All Leads</button>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th class="px-4 py-3">Client Name</th>
              <th class="px-4 py-3">Property Type</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Value</th>
              <th class="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr>
              <td class="px-4 py-4 font-medium">Jonathan Harker</td>
              <td class="px-4 py-4 text-slate-600">Residential Detached</td>
              <td class="px-4 py-4"><BaseBadge class="bg-emerald-50 text-emerald-700">Closed</BaseBadge></td>
              <td class="px-4 py-4">$850,000</td>
              <td class="px-4 py-4 text-slate-500">Oct 24, 2023</td>
            </tr>
            <tr>
              <td class="px-4 py-4 font-medium">Mina Murray</td>
              <td class="px-4 py-4 text-slate-600">Modern Condominium</td>
              <td class="px-4 py-4"><BaseBadge class="bg-blue-50 text-blue-700">Negotiation</BaseBadge></td>
              <td class="px-4 py-4">$420,000</td>
              <td class="px-4 py-4 text-slate-500">Oct 22, 2023</td>
            </tr>
            <tr>
              <td class="px-4 py-4 font-medium">Arthur Holmwood</td>
              <td class="px-4 py-4 text-slate-600">Estate / Luxury</td>
              <td class="px-4 py-4"><BaseBadge class="bg-red-50 text-red-600">Follow-up</BaseBadge></td>
              <td class="px-4 py-4">$2,100,000</td>
              <td class="px-4 py-4 text-slate-500">Oct 21, 2023</td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
