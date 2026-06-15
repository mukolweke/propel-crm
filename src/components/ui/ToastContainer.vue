<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { classNames } from '@/utils/helpers'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

const { toasts, dismiss } = useToast()

const icons = {
  success: CheckCircleIcon,
  error: ExclamationTriangleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
}

const styles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
}
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="classNames(
        'pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg',
        styles[toast.type],
      )"
    >
      <component :is="icons[toast.type]" class="mt-0.5 h-5 w-5 shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-semibold">{{ toast.title }}</p>
        <p v-if="toast.message" class="mt-1 text-sm opacity-90">{{ toast.message }}</p>
      </div>
      <button class="rounded p-1 hover:bg-black/5" @click="dismiss(toast.id)">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
