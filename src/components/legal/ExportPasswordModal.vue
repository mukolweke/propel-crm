<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { LockClosedIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

const props = defineProps<{
  open: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [password: string]
}>()

const password = ref('')
const error = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      password.value = ''
      error.value = ''
    }
  },
)

function close() {
  emit('update:open', false)
}

function submit() {
  if (!password.value) {
    error.value = 'Enter your account password'
    return
  }
  error.value = ''
  emit('confirm', password.value)
}
</script>

<template>
  <TransitionRoot :show="open" as="template">
    <Dialog class="relative z-50" @close="close">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-slate-900/40" />
      </TransitionChild>

      <div class="fixed inset-0 flex items-center justify-center p-4">
        <TransitionChild
          as="template"
          enter="ease-out duration-200"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="ease-in duration-150"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <LockClosedIcon class="h-5 w-5" />
            </div>
            <DialogTitle class="text-lg font-semibold text-slate-900">
              Protect export with your password
            </DialogTitle>
            <p class="mt-2 text-sm text-slate-600">
              Re-enter your Propel CRM account password. The download will be a ZIP file encrypted
              with that password (AES). We never store or log this value for exports.
            </p>

            <form class="mt-5" @submit.prevent="submit">
              <BaseInput
                v-model="password"
                label="Account password"
                type="password"
                placeholder="Your login password"
                :error="error"
                autocomplete="current-password"
                variant="filled"
                required
              />
              <div class="mt-6 flex justify-end gap-3">
                <BaseButton type="button" variant="secondary" :disabled="loading" @click="close">
                  Cancel
                </BaseButton>
                <BaseButton type="submit" :loading="loading">
                  Download protected export
                </BaseButton>
              </div>
            </form>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
