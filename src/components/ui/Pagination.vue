<script setup lang="ts">
import BaseButton from './BaseButton.vue'

defineProps<{
  page: number
  totalPages: number
  total: number
  pageSize?: number
}>()

const emit = defineEmits<{ 'update:page': [page: number] }>()
</script>

<template>
  <div class="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-sm text-slate-500">
      Showing {{ total === 0 ? 0 : (page - 1) * (pageSize ?? 10) + 1 }}-{{ Math.min(page * (pageSize ?? 10), total) }} of {{ total }} contacts
    </p>
    <div class="flex gap-2">
      <BaseButton
        variant="secondary"
        size="sm"
        :disabled="page <= 1"
        @click="emit('update:page', page - 1)"
      >
        Previous
      </BaseButton>
      <BaseButton
        variant="secondary"
        size="sm"
        :disabled="page >= totalPages"
        @click="emit('update:page', page + 1)"
      >
        Next
      </BaseButton>
    </div>
  </div>
</template>
