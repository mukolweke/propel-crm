<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { useConfirm } from '@/composables/useConfirm'
import BaseButton from './BaseButton.vue'

const { isOpen, options, handleConfirm, handleCancel } = useConfirm()
</script>

<template>
  <TransitionRoot :show="isOpen" as="template">
    <Dialog class="relative z-50" @close="handleCancel">
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
            <DialogTitle class="text-lg font-semibold text-slate-900">
              {{ options.title }}
            </DialogTitle>
            <p class="mt-2 text-sm text-slate-600">{{ options.message }}</p>
            <div class="mt-6 flex justify-end gap-3">
              <BaseButton variant="secondary" @click="handleCancel">
                {{ options.cancelLabel ?? 'Cancel' }}
              </BaseButton>
              <BaseButton
                :variant="options.variant === 'danger' ? 'danger' : 'primary'"
                @click="handleConfirm"
              >
                {{ options.confirmLabel ?? 'Confirm' }}
              </BaseButton>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
