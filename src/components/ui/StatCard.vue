<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  trend?: string
}>()
</script>

<template>
  <div class="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-slate-500">{{ title }}</p>
        <p class="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          <slot />
        </p>
        <p v-if="description" class="mt-1 text-sm text-slate-500">{{ description }}</p>
        <p v-if="trend" class="mt-2 text-sm font-medium text-brand-600">{{ trend }}</p>
      </div>
      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <slot name="icon" />
      </div>
    </div>
  </div>
</template>
