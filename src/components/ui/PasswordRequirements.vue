<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon, XMarkIcon } from '@heroicons/vue/20/solid'
import { getPasswordChecks } from '@/utils/password'

const props = defineProps<{
  password: string
}>()

const checks = computed(() => getPasswordChecks(props.password))
const allPassed = computed(() => checks.value.every((c) => c.passed))
</script>

<template>
  <div
    class="rounded-xl border border-slate-200 bg-mint/60 px-4 py-3"
    role="status"
    :aria-live="password ? 'polite' : 'off'"
  >
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Password requirements</p>
    <ul class="mt-2 space-y-1.5">
      <li
        v-for="check in checks"
        :key="check.id"
        class="flex items-center gap-2 text-sm transition-colors"
        :class="check.passed ? 'text-brand-800' : 'text-slate-500'"
      >
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          :class="check.passed ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-400'"
        >
          <CheckIcon v-if="check.passed" class="h-3.5 w-3.5" />
          <XMarkIcon v-else class="h-3.5 w-3.5" />
        </span>
        {{ check.label }}
      </li>
    </ul>
    <p
      v-if="password && allPassed"
      class="mt-3 text-xs font-medium text-brand-700"
    >
      Password meets all requirements
    </p>
  </div>
</template>
