<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  actionLabel?: string
}>()

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <slot name="icon" />
    </div>
    <h3 class="text-lg font-semibold text-slate-900">{{ title ?? 'No data yet' }}</h3>
    <p v-if="description" class="mt-2 max-w-sm text-sm text-slate-500">{{ description }}</p>
    <div v-if="actionLabel" class="mt-6">
      <slot name="action" />
    </div>
  </div>
</template>
