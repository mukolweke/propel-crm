<script setup lang="ts">
import { reactive, watch, computed, onMounted } from 'vue'
import type { ContactFormData } from '@/types'
import { usePropertyTypesStore } from '@/stores/propertyTypesStore'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import {
  BUDGET_RANGES,
  CONTACT_STATUSES,
} from '@/utils/constants'
import { PhoneIcon, EnvelopeIcon, MapPinIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  initial?: Partial<ContactFormData>
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: ContactFormData]
  cancel: []
}>()

const propertyTypesStore = usePropertyTypesStore()

const form = reactive<ContactFormData>({
  fullName: '',
  phone: '',
  email: '',
  propertyType: '',
  budgetRange: BUDGET_RANGES[1],
  locationPreference: '',
  leadSource: 'Referral',
  notes: '',
  status: 'new_lead',
})

const errors = reactive<Partial<Record<keyof ContactFormData, string>>>({})

onMounted(async () => {
  await propertyTypesStore.fetchPropertyTypes()
  if (!form.propertyType && propertyTypesStore.selectOptions.length > 0) {
    form.propertyType = propertyTypesStore.selectOptions[0].value
  }
})

watch(
  () => props.initial,
  (value) => {
    if (value) Object.assign(form, value)
  },
  { immediate: true },
)

watch(
  () => propertyTypesStore.selectOptions,
  (options) => {
    if (!form.propertyType && options.length > 0) {
      form.propertyType = options[0].value
    }
  },
  { immediate: true },
)

const statusOptions = computed(() =>
  CONTACT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
)

const propertyTypeOptions = computed(() => propertyTypesStore.selectOptions)

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k as keyof ContactFormData])
  if (!form.fullName.trim()) errors.fullName = 'Name is required'
  if (!form.phone.trim()) errors.phone = 'Phone is required'
  if (!form.email.trim()) errors.email = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Invalid email'
  if (!form.propertyType) errors.propertyType = 'Property type is required'
  return Object.keys(errors).length === 0
}

function handleSubmit() {
  if (!validate()) return
  emit('submit', { ...form })
}
</script>

<template>
  <form class="space-y-10" @submit.prevent="handleSubmit">
    <section>
      <h2 class="font-display border-b border-slate-200 pb-3 text-lg text-forest">Basic Information</h2>
      <div class="mt-6 grid gap-5 sm:grid-cols-2">
        <BaseInput v-model="form.fullName" label="Full Name" placeholder="John Doe" :error="errors.fullName" variant="filled" required />
        <BaseInput v-model="form.phone" label="Phone Number" type="tel" placeholder="+1 (555) 000-0000" :error="errors.phone" variant="filled" required>
          <template #icon>
            <PhoneIcon class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </template>
        </BaseInput>
        <BaseInput v-model="form.email" label="Email Address" type="email" placeholder="john.doe@example.com" :error="errors.email" variant="filled" required>
          <template #icon>
            <EnvelopeIcon class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </template>
        </BaseInput>
        <BaseSelect v-model="form.status" label="Contact Status" :options="statusOptions" variant="filled" />
      </div>
    </section>

    <section>
      <h2 class="font-display border-b border-slate-200 pb-3 text-lg text-forest">Property Preferences</h2>
      <div class="mt-6 grid gap-5 sm:grid-cols-2">
        <BaseSelect
          v-model="form.propertyType"
          label="Property Type Interest"
          placeholder="Select property type"
          :options="propertyTypeOptions"
          :error="errors.propertyType"
          variant="filled"
          required
        />
        <BaseInput v-model="form.budgetRange" label="Budget Range" placeholder="$ e.g. 500k - 750k" variant="filled" />
        <BaseInput v-model="form.locationPreference" label="Location Preference" placeholder="Neighborhood or Zip" variant="filled">
          <template #icon>
            <MapPinIcon class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </template>
        </BaseInput>
        <BaseInput v-model="form.leadSource" label="Lead Source" placeholder="Referral, Zillow, Web Form..." variant="filled" />
      </div>
    </section>

    <section>
      <h2 class="font-display border-b border-slate-200 pb-3 text-lg text-forest">Internal Notes</h2>
      <div class="mt-6">
        <BaseTextarea
          v-model="form.notes"
          label="General Notes & Observations"
          :rows="5"
          placeholder="Add details about client preferences, family size, timeline to move..."
          variant="filled"
        />
      </div>
    </section>

    <div class="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
      <slot name="actions" :loading="loading" :submit="handleSubmit" />
    </div>
  </form>
</template>
