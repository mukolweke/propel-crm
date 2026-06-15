<script setup lang="ts">
import { APP_NAME, APP_TAGLINE, APP_TAGLINE_LONG } from '@/utils/branding'

withDefaults(defineProps<{
  variant?: 'default' | 'auth' | 'compact'
  showTagline?: boolean
  iconOnly?: boolean
}>(), {
  variant: 'default',
  showTagline: true,
  iconOnly: false,
})
</script>

<template>
  <div :class="['flex items-center', iconOnly ? 'justify-center' : 'gap-3']">
    <div
      :class="[
        'flex shrink-0 items-center justify-center rounded-xl bg-forest text-white shadow-sm',
        variant === 'auth' ? 'h-12 w-12' : 'h-10 w-10',
      ]"
    >
      <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none">
        <path d="M5 19V10l7-5 7 5v9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 19v-4h6v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 9c1.2-.8 2.8-.8 4 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <div v-if="!iconOnly" class="min-w-0 overflow-hidden">
      <p
        :class="[
          'truncate font-display font-normal leading-tight text-forest',
          variant === 'auth' ? 'text-2xl' : 'text-lg',
        ]"
      >
        {{ APP_NAME }}
      </p>
      <p
        v-if="showTagline"
        class="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-neutral"
      >
        {{ variant === 'auth' ? APP_TAGLINE_LONG : APP_TAGLINE }}
      </p>
    </div>
  </div>
</template>
