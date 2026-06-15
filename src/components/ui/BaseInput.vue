<script setup lang="ts">
import { computed } from 'vue'
import { classNames } from '@/utils/helpers'

interface Props {
  modelValue?: string | number
  label?: string
  type?: string
  placeholder?: string
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  id?: string
  uppercaseLabel?: boolean
  variant?: 'default' | 'filled'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false,
  uppercaseLabel: false,
  variant: 'default',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const inputId = computed(() => props.id ?? `input-${Math.random().toString(36).slice(2, 9)}`)
</script>

<template>
  <div class="space-y-2">
    <div v-if="label" class="flex items-center justify-between">
      <label
        :for="inputId"
        :class="classNames(
          'block font-semibold text-slate-600',
          uppercaseLabel ? 'text-[11px] uppercase tracking-wider' : 'text-sm',
        )"
      >
        {{ label }}
        <span v-if="required" class="text-red-500">*</span>
      </label>
      <slot name="label-action" />
    </div>
    <div class="relative">
      <slot name="icon" />
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :class="classNames(
          'block w-full rounded-xl border px-4 py-3 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:bg-slate-50 disabled:text-slate-500',
          variant === 'filled' ? 'border-transparent bg-mint' : 'border-slate-200 bg-white shadow-sm',
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/25' : 'focus:border-brand-500',
          $slots.icon ? 'pl-11' : '',
        )"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-else-if="hint" class="text-sm text-slate-500">{{ hint }}</p>
  </div>
</template>
