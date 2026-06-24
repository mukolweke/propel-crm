<script setup lang="ts">
import { ShieldExclamationIcon } from '@heroicons/vue/24/outline'
import { EXPORT_CONFIDENTIALITY_NOTICE } from '@/utils/legal'
</script>

<template>
  <div
    class="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    role="note"
  >
    <ShieldExclamationIcon class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
    <p>{{ EXPORT_CONFIDENTIALITY_NOTICE }}</p>
  </div>
</template>
