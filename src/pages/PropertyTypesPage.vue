<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { usePropertyTypesStore } from '@/stores/propertyTypesStore'
import { useContactsStore } from '@/stores/contactsStore'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import type { PropertyType, PropertyTypeFormData } from '@/types'
import {
  BuildingOffice2Icon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'

const propertyTypesStore = usePropertyTypesStore()
const contactsStore = useContactsStore()
const { confirm } = useConfirm()
const toast = useToast()

const modalOpen = ref(false)
const editingId = ref<string | null>(null)

const form = reactive<PropertyTypeFormData>({
  name: '',
  description: '',
  active: true,
})

const errors = reactive<Partial<Record<keyof PropertyTypeFormData, string>>>({})

const isEditing = computed(() => Boolean(editingId.value))

onMounted(async () => {
  await Promise.all([
    propertyTypesStore.fetchPropertyTypes(),
    contactsStore.contacts.length === 0 ? contactsStore.fetchContacts() : Promise.resolve(),
  ])
})

function resetForm() {
  form.name = ''
  form.description = ''
  form.active = true
  Object.keys(errors).forEach((key) => delete errors[key as keyof PropertyTypeFormData])
}

function openCreate() {
  editingId.value = null
  resetForm()
  modalOpen.value = true
}

function openEdit(item: PropertyType) {
  editingId.value = item.id
  form.name = item.name
  form.description = item.description
  form.active = item.active
  Object.keys(errors).forEach((key) => delete errors[key as keyof PropertyTypeFormData])
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  editingId.value = null
  resetForm()
}

function validate() {
  Object.keys(errors).forEach((key) => delete errors[key as keyof PropertyTypeFormData])
  if (!form.name.trim()) errors.name = 'Name is required'
  return Object.keys(errors).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  try {
    if (isEditing.value && editingId.value) {
      await propertyTypesStore.updatePropertyType(editingId.value, { ...form })
    } else {
      await propertyTypesStore.addPropertyType({ ...form })
    }
    closeModal()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save property type'
    toast.error('Save failed', message)
  }
}

async function handleDelete(item: PropertyType) {
  const usage = propertyTypesStore.getUsageCount(item.name)
  if (usage > 0) {
    toast.warning('Cannot delete', `${usage} contact(s) use "${item.name}". Reassign them first.`)
    return
  }

  const ok = await confirm({
    title: 'Delete property type',
    message: `Delete "${item.name}"? This cannot be undone.`,
    confirmLabel: 'Delete',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await propertyTypesStore.deletePropertyType(item.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete'
    toast.error('Delete failed', message)
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-8">
    <nav class="flex items-center gap-2 text-sm text-slate-500">
      <router-link to="/settings" class="hover:text-forest">Settings</router-link>
      <span>/</span>
      <span class="text-slate-900">Property Types</span>
    </nav>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="font-display text-3xl text-slate-900">Property Types</h1>
        <p class="mt-2 text-sm text-slate-500">
          Manage property categories used in contact forms and lead tracking.
        </p>
      </div>
      <BaseButton @click="openCreate">
        <PlusIcon class="h-4 w-4" />
        Add Property Type
      </BaseButton>
    </div>

    <BaseCard>
      <SkeletonLoader v-if="propertyTypesStore.loading" :rows="6" />

      <EmptyState
        v-else-if="propertyTypesStore.sortedItems.length === 0"
        title="No property types"
        description="Add your first property type to populate the contact form dropdown."
      >
        <template #icon><BuildingOffice2Icon class="h-7 w-7" /></template>
        <template #action>
          <BaseButton @click="openCreate">Add Property Type</BaseButton>
        </template>
      </EmptyState>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th class="px-4 py-4">Name</th>
              <th class="hidden px-4 py-4 md:table-cell">Description</th>
              <th class="px-4 py-4">Status</th>
              <th class="px-4 py-4">Contacts</th>
              <th class="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="item in propertyTypesStore.sortedItems"
              :key="item.id"
              class="transition-colors hover:bg-mint/40"
            >
              <td class="px-4 py-4 font-medium text-slate-900">{{ item.name }}</td>
              <td class="hidden px-4 py-4 text-slate-500 md:table-cell">
                {{ item.description || '—' }}
              </td>
              <td class="px-4 py-4">
                <BaseBadge :class="item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                  {{ item.active ? 'Active' : 'Inactive' }}
                </BaseBadge>
              </td>
              <td class="px-4 py-4 text-slate-600">
                {{ propertyTypesStore.getUsageCount(item.name) }}
              </td>
              <td class="px-4 py-4">
                <div class="flex justify-end gap-1">
                  <button
                    class="rounded-lg p-2 text-slate-400 hover:bg-mint hover:text-slate-700"
                    title="Edit"
                    @click="openEdit(item)"
                  >
                    <PencilIcon class="h-4 w-4" />
                  </button>
                  <button
                    class="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                    @click="handleDelete(item)"
                  >
                    <TrashIcon class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <TransitionRoot :show="modalOpen" as="template">
      <Dialog class="relative z-50" @close="closeModal">
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
            <DialogPanel class="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl">
              <DialogTitle class="font-display text-xl text-slate-900">
                {{ isEditing ? 'Edit Property Type' : 'Add Property Type' }}
              </DialogTitle>
              <p class="mt-1 text-sm text-slate-500">
                {{ isEditing ? 'Update this property category.' : 'Create a new option for Property Type Interest.' }}
              </p>

              <form class="mt-6 space-y-5" @submit.prevent="handleSubmit">
                <BaseInput
                  v-model="form.name"
                  label="Name"
                  placeholder="e.g. Single Family Home"
                  :error="errors.name"
                  variant="filled"
                  required
                />
                <BaseTextarea
                  v-model="form.description"
                  label="Description"
                  placeholder="Brief description for agents..."
                  :rows="3"
                  variant="filled"
                />
                <label class="flex items-center gap-2.5 text-sm text-slate-700">
                  <input
                    v-model="form.active"
                    type="checkbox"
                    class="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Active (show in contact form dropdown)
                </label>

                <div class="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <BaseButton type="button" variant="secondary" @click="closeModal">
                    Cancel
                  </BaseButton>
                  <BaseButton type="submit" :loading="propertyTypesStore.saving">
                    {{ isEditing ? 'Save Changes' : 'Add Property Type' }}
                  </BaseButton>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>
