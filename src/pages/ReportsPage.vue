<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReportsStore } from '@/stores/reportsStore'
import type { ReportPeriod } from '@/stores/reportsStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import StatCard from '@/components/ui/StatCard.vue'
import SimpleBarChart from '@/components/ui/SimpleBarChart.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import DateRangePicker from '@/components/ui/DateRangePicker.vue'
import {
  DocumentArrowDownIcon,
  TableCellsIcon,
  DocumentTextIcon,
  UserPlusIcon,
  ChartBarIcon,
  CalendarDaysIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
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
        clearable
        :default-start="reportsStore.defaultDateFrom"
        :default-end="reportsStore.defaultDateTo"
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
      <StatCard :title="reportsStore.period === 'daily' ? 'Leads Added Today' : 'Leads in Period'">
        {{ reportsStore.metrics.leadsCreated.toLocaleString() }}
        <template #icon><UserPlusIcon class="h-5 w-5" /></template>
      </StatCard>
      <StatCard title="Conversion Rate">
        {{ reportsStore.metrics.conversionRate }}%
        <template #icon><ChartBarIcon class="h-5 w-5" /></template>
      </StatCard>
      <StatCard title="Most Active Day" description="Based on interaction activity">
        {{ reportsStore.mostActiveDay }}
        <template #icon><CalendarDaysIcon class="h-5 w-5" /></template>
      </StatCard>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <BaseCard>
        <h2 class="mb-5 font-display text-xl text-slate-900">
          {{ reportsStore.period === 'daily' ? 'Daily Leads' : 'Monthly Conversions' }}
        </h2>
        <SkeletonLoader v-if="reportsStore.loading" />
        <SimpleBarChart
          v-else-if="reportsStore.hasChartData"
          :data="reportsStore.conversionTrend"
          color="bg-brand-500"
        />
        <EmptyState
          v-else
          :title="reportsStore.period === 'daily' ? 'No leads yet' : 'No conversions yet'"
          :description="
            reportsStore.period === 'daily'
              ? 'New leads from the last 7 days will appear in this chart.'
              : 'Converted contacts will appear in this chart.'
          "
        />
      </BaseCard>
      <BaseCard>
        <h2 class="mb-5 font-display text-xl text-slate-900">Lead Sources</h2>
        <div class="flex items-center justify-center py-8">
          <div class="text-center">
            <p class="text-3xl font-bold text-slate-900">{{ reportsStore.leadSourceTotal }}</p>
            <p class="text-sm text-slate-500">Total</p>
          </div>
        </div>
        <div v-if="reportsStore.leadSources.length" class="mt-4 space-y-2 text-sm">
          <div
            v-for="source in reportsStore.leadSources"
            :key="source.name"
            class="flex justify-between"
          >
            <span class="text-slate-600">{{ source.name }}</span>
            <span class="font-medium">{{ source.percent }}%</span>
          </div>
        </div>
        <p v-else class="mt-4 text-center text-sm text-slate-500">No lead source data in this range.</p>
      </BaseCard>
    </div>

    <BaseCard>
      <div class="mb-5 flex items-center justify-between">
        <h2 class="font-display text-xl text-slate-900">Conversion Details</h2>
        <button
          class="text-sm font-medium text-brand-600 hover:text-brand-700"
          @click="router.push('/contacts')"
        >
          View All Leads
        </button>
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
          <tbody v-if="reportsStore.loading">
            <tr>
              <td colspan="5" class="px-4 py-8">
                <SkeletonLoader :rows="3" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="reportsStore.conversionDetails.length" class="divide-y divide-slate-100">
            <tr v-for="row in reportsStore.conversionDetails" :key="row.id">
              <td class="px-4 py-4 font-medium">{{ row.clientName }}</td>
              <td class="px-4 py-4 text-slate-600">{{ row.propertyType }}</td>
              <td class="px-4 py-4">
                <BaseBadge :class="row.statusClass">{{ row.statusLabel }}</BaseBadge>
              </td>
              <td class="px-4 py-4">{{ row.value }}</td>
              <td class="px-4 py-4 text-slate-500">{{ row.date }}</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="5" class="px-4 py-8 text-center text-sm text-slate-500">
                No contacts in the selected date range.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
