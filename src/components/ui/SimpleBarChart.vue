<script setup lang="ts">
import { computed } from 'vue'
import type { ChartDataPoint } from '@/types'

const props = defineProps<{
  data: ChartDataPoint[]
  color?: string
}>()

const maxValue = computed(() => Math.max(...props.data.map((d) => d.value), 0))

function barHeight(value: number) {
  return maxValue.value > 0 ? `${(value / maxValue.value) * 100}%` : '0%'
}
</script>

<template>
  <div class="flex h-52 items-end gap-2 px-1 pb-1 pt-2">
    <div
      v-for="point in data"
      :key="point.label"
      class="flex min-w-0 flex-1 flex-col items-center gap-2"
    >
      <div class="flex w-full flex-1 items-end">
        <div
          class="mx-auto w-full max-w-10 rounded-t-md transition-all"
          :class="color ?? 'bg-brand-500'"
          :style="{ height: barHeight(point.value) }"
        />
      </div>
      <span class="truncate pb-0.5 text-center text-xs text-slate-500">{{ point.label }}</span>
    </div>
  </div>
</template>
