<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import AppLogo from '@/components/shared/AppLogo.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import PasswordRequirements from '@/components/ui/PasswordRequirements.vue'
import { isPasswordValid } from '@/utils/password'
import { LockClosedIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const errors = ref<Record<string, string>>({})

function validate() {
  errors.value = {}
  if (!form.currentPassword) errors.value.currentPassword = 'Current password is required'
  if (!form.newPassword) errors.value.newPassword = 'New password is required'
  else if (!isPasswordValid(form.newPassword)) {
    errors.value.newPassword = 'Password does not meet all requirements'
  }
  if (form.newPassword !== form.confirmPassword) {
    errors.value.confirmPassword = 'Passwords do not match'
  }
  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  const ok = await authStore.changePassword(form.currentPassword, form.newPassword)
  if (ok) {
    router.push(authStore.isSuperAdmin ? '/admin/dashboard' : '/dashboard')
  }
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-8">
    <div class="flex justify-center">
      <AppLogo variant="auth" />
    </div>

    <div class="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
      <h1 class="font-display text-2xl text-slate-900">Change your password</h1>
      <p class="mt-2 text-sm text-slate-500">
        For security, you must set a new password before continuing.
      </p>

      <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
        <BaseInput
          v-model="form.currentPassword"
          label="Current password"
          type="password"
          :error="errors.currentPassword"
          variant="filled"
          required
        />
        <div class="space-y-3">
          <BaseInput
            v-model="form.newPassword"
            label="New password"
            type="password"
            :error="errors.newPassword"
            variant="filled"
            required
          />
          <PasswordRequirements :password="form.newPassword" />
        </div>
        <BaseInput
          v-model="form.confirmPassword"
          label="Confirm new password"
          type="password"
          :error="errors.confirmPassword"
          variant="filled"
          required
        >
          <template #icon>
            <LockClosedIcon class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </template>
        </BaseInput>

        <BaseButton type="submit" block size="lg" :loading="authStore.loading">
          Update password
        </BaseButton>
      </form>
    </div>
  </div>
</template>
