<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import AppLogo from '@/components/shared/AppLogo.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const email = ref('')
const error = ref('')

function validate() {
  error.value = ''
  if (!email.value.trim()) {
    error.value = 'Email is required'
    return false
  }
  if (!/\S+@\S+\.\S+/.test(email.value)) {
    error.value = 'Enter a valid email address'
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validate()) return
  const result = await authStore.forgotPassword(email.value)
  if (result.success) {
    toast.success('Check your email', result.message)
    router.push({ path: '/reset-password', query: { email: email.value.trim().toLowerCase() } })
    return
  }
  error.value = result.message
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <div class="mb-8 flex justify-center">
      <AppLogo />
    </div>

    <div class="space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-slate-900">Reset password</h1>
        <p class="mt-2 text-sm text-slate-500">
          Enter your email and we'll send a 6-digit verification code
        </p>
      </div>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <BaseInput
          v-model="email"
          label="Email"
          type="email"
          placeholder="you@agency.com"
          :error="error"
          required
        />
        <BaseButton type="submit" block :loading="authStore.loading">
          Send verification code
        </BaseButton>
      </form>

      <p class="text-center text-sm">
        <router-link to="/login" class="font-medium text-brand-600 hover:text-brand-700">
          Back to sign in
        </router-link>
      </p>
    </div>
  </div>
</template>
