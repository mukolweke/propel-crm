<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { CalendarDaysIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { formatIsoDateShort } from '@/utils/helpers'

interface Props {
  start: string
  end: string
  clearable?: boolean
  defaultStart?: string
  defaultEnd?: string
  clearLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  clearable: false,
  clearLabel: 'This month',
})

const emit = defineEmits<{
  'update:start': [value: string]
  'update:end': [value: string]
  apply: []
}>()

const draftStart = ref(props.start)
const draftEnd = ref(props.end)
const rangeError = ref('')

watch(
  () => [props.start, props.end] as const,
  ([start, end]) => {
    draftStart.value = start
    draftEnd.value = end
  },
)

const displayLabel = computed(
  () => `${formatIsoDateShort(props.start)} — ${formatIsoDateShort(props.end)}`,
)

const canReset = computed(
  () =>
    props.clearable &&
    Boolean(props.defaultStart && props.defaultEnd) &&
    (props.start !== props.defaultStart || props.end !== props.defaultEnd),
)

const showClearInPanel = computed(
  () => props.clearable && Boolean(props.defaultStart && props.defaultEnd),
)

function syncDraft() {
  draftStart.value = props.start
  draftEnd.value = props.end
  rangeError.value = ''
}

function validateRange(): boolean {
  if (!draftStart.value || !draftEnd.value) {
    rangeError.value = 'Select both start and end dates.'
    return false
  }
  if (draftStart.value > draftEnd.value) {
    rangeError.value = 'Start date must be before end date.'
    return false
  }
  rangeError.value = ''
  return true
}

function apply(close: () => void) {
  if (!validateRange()) return

  emit('update:start', draftStart.value)
  emit('update:end', draftEnd.value)
  emit('apply')
  close()
}

function cancel(close: () => void) {
  syncDraft()
  close()
}

function resetToDefault(close?: () => void) {
  if (!props.defaultStart || !props.defaultEnd) return

  draftStart.value = props.defaultStart
  draftEnd.value = props.defaultEnd
  rangeError.value = ''
  emit('update:start', props.defaultStart)
  emit('update:end', props.defaultEnd)
  emit('apply')
  close?.()
}
</script>

<template>
  <Popover v-slot="{ open }" class="relative">
    <div class="inline-flex items-center gap-1">
      <PopoverButton
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 transition-colors hover:border-brand-200 hover:bg-mint focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        @click="syncDraft"
      >
        <CalendarDaysIcon class="h-4 w-4 shrink-0 text-slate-400" />
        <span>{{ displayLabel }}</span>
        <ChevronDownIcon
          class="h-4 w-4 shrink-0 text-slate-400 transition-transform"
          :class="open ? 'rotate-180' : ''"
        />
      </PopoverButton>
      <button
        v-if="canReset"
        type="button"
        class="rounded-lg px-2 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        :title="`Reset to ${clearLabel.toLowerCase()}`"
        @click="resetToDefault()"
      >
        Clear
      </button>
    </div>

    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <PopoverPanel
        v-slot="{ close }"
        class="absolute left-0 z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
      >
        <p class="mb-3 text-sm font-medium text-slate-900">Select date range</p>

        <div class="space-y-3">
          <BaseInput
            v-model="draftStart"
            label="Start date"
            type="date"
            variant="filled"
            @update:model-value="rangeError = ''"
          />
          <BaseInput
            v-model="draftEnd"
            label="End date"
            type="date"
            variant="filled"
            @update:model-value="rangeError = ''"
          />
        </div>

        <p v-if="rangeError" class="mt-2 text-sm text-red-600">{{ rangeError }}</p>

        <div class="mt-4 flex items-center justify-between gap-2">
          <BaseButton
            v-if="showClearInPanel"
            type="button"
            variant="ghost"
            size="sm"
            class="!px-2"
            @click="resetToDefault(close)"
          >
            {{ clearLabel }}
          </BaseButton>
          <div v-else />
          <div class="flex gap-2">
            <BaseButton type="button" variant="ghost" size="sm" @click="cancel(close)">
              Cancel
            </BaseButton>
            <BaseButton type="button" size="sm" @click="apply(close)">
              Apply
            </BaseButton>
          </div>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>
