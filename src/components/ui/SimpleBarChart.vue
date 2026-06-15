<script setup lang="ts">
import type { ChartDataPoint } from '@/types'

defineProps<{
  data: ChartDataPoint[]
  color?: string
}>()

function barHeight(value: number, max: number) {
  return max > 0 ? `${(value / max) * 100}%` : '0%'
}
</script>

<template>
  <div class="flex h-52 items-end gap-3 px-1 pb-1 pt-2">
    <div
      v-for="point in data"
      :key="point.label"
      class="flex flex-1 flex-col items-center gap-3"
    >
      <div class="flex w-full flex-1 items-end">
        <div
          class="w-full rounded-t-md transition-all"
          :class="color ?? 'bg-brand-500'"
          :style="{ height: barHeight(point.value, Math.max(...data.map((d) => d.value))) }"
        />
      </div>
      <span class="pb-0.5 text-xs text-slate-500">{{ point.label }}</span>
    </div>
  </div>
</template>
