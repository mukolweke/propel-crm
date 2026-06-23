<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import AppLogo from '@/components/shared/AppLogo.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import PasswordRequirements from '@/components/ui/PasswordRequirements.vue'
import { isPasswordValid } from '@/utils/password'
import { LockClosedIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const form = reactive({
  code: '',
  newPassword: '',
  confirmPassword: '',
})
const errors = ref<Record<string, string>>({})
const formError = ref('')

function validate() {
  errors.value = {}
  formError.value = ''
  if (!email.value.trim()) errors.value.email = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(email.value)) errors.value.email = 'Enter a valid email address'
  if (!/^\d{6}$/.test(form.code)) errors.value.code = 'Enter the 6-digit code from your email'
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
  const result = await authStore.resetPassword(email.value, form.code, form.newPassword)
  if (result.success) {
    toast.success('Password reset', result.message)
    router.push('/login')
    return
  }
  if (result.field === 'email') errors.value.email = result.message
  else if (result.field === 'code') errors.value.code = result.message
  else if (result.field === 'password') errors.value.newPassword = result.message
  else formError.value = result.message
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <div class="mb-8 flex justify-center">
      <AppLogo />
    </div>

    <div class="space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-slate-900">Enter reset code</h1>
        <p class="mt-2 text-sm text-slate-500">
          We sent a 6-digit code to your email. Enter it below with your new password.
        </p>
      </div>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <BaseInput
          v-model="email"
          label="Email"
          type="email"
          placeholder="you@agency.com"
          :error="errors.email"
          required
        />
        <BaseInput
          v-model="form.code"
          label="Reset code"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="123456"
          :error="errors.code"
          required
        />
        <div class="space-y-3">
          <BaseInput
            v-model="form.newPassword"
            label="New password"
            type="password"
            :error="errors.newPassword"
            required
          />
          <PasswordRequirements :password="form.newPassword" />
        </div>
        <BaseInput
          v-model="form.confirmPassword"
          label="Confirm new password"
          type="password"
          :error="errors.confirmPassword"
          required
        >
          <template #icon>
            <LockClosedIcon class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </template>
        </BaseInput>

        <BaseButton type="submit" block :loading="authStore.loading">
          Reset password
        </BaseButton>
        <p v-if="formError" class="text-center text-sm text-red-600">{{ formError }}</p>
      </form>

      <p class="text-center text-sm">
        <router-link to="/forgot-password" class="font-medium text-brand-600 hover:text-brand-700">
          Resend code
        </router-link>
        <span class="mx-2 text-slate-300">·</span>
        <router-link to="/login" class="font-medium text-brand-600 hover:text-brand-700">
          Back to sign in
        </router-link>
      </p>
    </div>
  </div>
</template>
