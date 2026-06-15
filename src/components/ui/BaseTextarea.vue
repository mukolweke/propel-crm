<script setup lang="ts">
import { computed } from 'vue'
import { classNames } from '@/utils/helpers'

interface Props {
  modelValue?: string
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  rows?: number
  placeholder?: string
  id?: string
  variant?: 'default' | 'filled'
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
  rows: 3,
  variant: 'default',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const textareaId = computed(() => props.id ?? `textarea-${Math.random().toString(36).slice(2, 9)}`)
</script>

<template>
  <div class="space-y-2">
    <label v-if="label" :for="textareaId" class="block text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <textarea
      :id="textareaId"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :class="classNames(
        'block w-full rounded-xl border px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:bg-slate-50',
        variant === 'filled' ? 'border-transparent bg-mint' : 'border-slate-200 bg-white shadow-sm',
        error ? 'border-red-300' : 'focus:border-brand-500',
      )"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>
