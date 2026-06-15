<script setup lang="ts">
import { computed } from 'vue'
import { classNames } from '@/utils/helpers'

interface Option {
  value: string
  label: string
}

interface Props {
  modelValue?: string
  label?: string
  options: Option[]
  error?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  id?: string
  variant?: 'default' | 'filled'
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
  variant: 'default',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const selectId = computed(() => props.id ?? `select-${Math.random().toString(36).slice(2, 9)}`)
</script>

<template>
  <div class="space-y-2">
    <label v-if="label" :for="selectId" class="block text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <select
      :id="selectId"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      :class="classNames(
        'block w-full rounded-xl border px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:bg-slate-50',
        variant === 'filled' ? 'border-transparent bg-mint' : 'border-slate-200 bg-white shadow-sm',
        error ? 'border-red-300' : 'focus:border-brand-500',
      )"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>
