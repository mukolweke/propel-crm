<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { useAuthStore } from '@/stores/authStore'
import { graphqlRequest } from '@/services/graphql'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import PasswordRequirements from '@/components/ui/PasswordRequirements.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { isPasswordValid } from '@/utils/password'
import { PlusIcon, UsersIcon } from '@heroicons/vue/24/outline'

interface AdminUser {
  id: string
  fullName: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

const authStore = useAuthStore()
const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const modalOpen = ref(false)
const users = ref<AdminUser[]>([])
const total = ref(0)

const form = reactive({
  fullName: '',
  email: '',
  password: '',
})

const errors = reactive<Record<string, string>>({})

const USERS_QUERY = `
  query AdminUsers($page: Int, $pageSize: Int) {
    adminUsers(page: $page, pageSize: $pageSize) {
      items { id fullName email role isActive createdAt lastLoginAt }
      total
    }
  }
`

const CREATE_USER_MUTATION = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id fullName email role isActive createdAt
    }
  }
`

const SET_USER_ACTIVE_MUTATION = `
  mutation SetUserActive($userId: ID!, $isActive: Boolean!) {
    setUserActive(userId: $userId, isActive: $isActive) {
      id isActive
    }
  }
`

async function fetchUsers() {
  loading.value = true
  try {
    const data = await graphqlRequest<{
      adminUsers: { items: AdminUser[]; total: number }
    }>(USERS_QUERY, { page: 1, pageSize: 100 }, authStore.token)
    users.value = data.adminUsers.items
    total.value = data.adminUsers.total
  } finally {
    loading.value = false
  }
}

onMounted(fetchUsers)

function resetForm() {
  form.fullName = ''
  form.email = ''
  form.password = ''
  Object.keys(errors).forEach((k) => delete errors[k])
}

function openCreate() {
  resetForm()
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  resetForm()
}

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.fullName.trim()) errors.fullName = 'Name is required'
  if (!form.email.trim()) errors.email = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Enter a valid email'
  if (!form.password) errors.password = 'Temporary password is required'
  else if (!isPasswordValid(form.password)) errors.password = 'Password does not meet all requirements'
  return Object.keys(errors).length === 0
}

async function handleCreate() {
  if (!validate()) return
  saving.value = true
  try {
    await graphqlRequest(
      CREATE_USER_MUTATION,
      {
        input: {
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: 'user',
        },
      },
      authStore.token,
    )
    toast.success('User created', `${form.fullName} can sign in and must change their password on first login.`)
    closeModal()
    await fetchUsers()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create user'
    toast.error('Create failed', message)
  } finally {
    saving.value = false
  }
}

async function toggleActive(user: AdminUser) {
  if (user.id === authStore.user?.id) {
    toast.warning('Not allowed', 'You cannot deactivate your own account.')
    return
  }
  try {
    await graphqlRequest(
      SET_USER_ACTIVE_MUTATION,
      { userId: user.id, isActive: !user.isActive },
      authStore.token,
    )
    toast.success(user.isActive ? 'User deactivated' : 'User activated')
    await fetchUsers()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    toast.error('Update failed', message)
  }
}

function roleLabel(role: string) {
  return role === 'super_admin' ? 'Super admin' : 'Agent'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="font-display text-3xl text-slate-900">Users</h1>
        <p class="mt-2 max-w-2xl text-sm text-slate-500">
          Add agents who log in and manage their own contacts, interactions, and reports.
          New users must change their password on first sign-in.
        </p>
      </div>
      <BaseButton size="lg" @click="openCreate">
        <PlusIcon class="h-4 w-4" />
        Add user
      </BaseButton>
    </div>

    <BaseCard>
      <SkeletonLoader v-if="loading" />
      <EmptyState
        v-else-if="users.length === 0"
        title="No agents yet"
        description="Create the first user account so they can sign in and use the CRM."
      >
        <template #icon><UsersIcon class="h-7 w-7" /></template>
        <BaseButton class="mt-4" @click="openCreate">
          <PlusIcon class="h-4 w-4" />
          Add user
        </BaseButton>
      </EmptyState>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th class="px-4 py-3">Name</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3">Role</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Last login</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="u in users" :key="u.id">
              <td class="px-4 py-3 font-medium text-slate-900">{{ u.fullName }}</td>
              <td class="px-4 py-3 text-slate-600">{{ u.email }}</td>
              <td class="px-4 py-3">{{ roleLabel(u.role) }}</td>
              <td class="px-4 py-3">
                <BaseBadge :class="u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'">
                  {{ u.isActive ? 'Active' : 'Inactive' }}
                </BaseBadge>
              </td>
              <td class="px-4 py-3 text-slate-500">
                {{ u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never' }}
              </td>
              <td class="px-4 py-3 text-right">
                <BaseButton
                  v-if="u.role !== 'super_admin'"
                  variant="ghost"
                  size="sm"
                  :disabled="u.id === authStore.user?.id"
                  @click="toggleActive(u)"
                >
                  {{ u.isActive ? 'Deactivate' : 'Activate' }}
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="mt-4 text-xs text-slate-500">{{ total }} user(s) total</p>
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
            <DialogPanel class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-7 shadow-xl">
              <DialogTitle class="font-display text-xl text-slate-900">Add user</DialogTitle>
              <p class="mt-1 text-sm text-slate-500">
                Create an agent account. Share the email and temporary password securely — they must change it on first login.
              </p>

              <form class="mt-6 space-y-5" @submit.prevent="handleCreate">
                <BaseInput
                  v-model="form.fullName"
                  label="Full name"
                  placeholder="e.g. Sarah Jenkins"
                  :error="errors.fullName"
                  variant="filled"
                  required
                />
                <BaseInput
                  v-model="form.email"
                  label="Email"
                  type="email"
                  placeholder="agent@youragency.com"
                  :error="errors.email"
                  variant="filled"
                  required
                />
                <div class="space-y-3">
                  <BaseInput
                    v-model="form.password"
                    label="Temporary password"
                    type="password"
                    :error="errors.password"
                    variant="filled"
                    required
                  />
                  <PasswordRequirements :password="form.password" />
                </div>

                <div class="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <BaseButton type="button" variant="secondary" @click="closeModal">
                    Cancel
                  </BaseButton>
                  <BaseButton type="submit" :loading="saving">
                    Create user
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
