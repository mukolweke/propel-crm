<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import AppLogo from '@/components/shared/AppLogo.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

const router = useRouter()
const authStore = useAuthStore()
const email = ref('')
const error = ref('')
const sent = ref(false)

async function handleSubmit() {
  error.value = ''
  if (!email.value) {
    error.value = 'Email is required'
    return
  }
  const success = await authStore.forgotPassword(email.value)
  if (success) sent.value = true
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <div class="mb-8 flex justify-center">
      <AppLogo />
    </div>

    <div v-if="!sent" class="space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-slate-900">Reset password</h1>
        <p class="mt-2 text-sm text-slate-500">Enter your email and we'll send reset instructions</p>
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
          Send reset link
        </BaseButton>
      </form>

      <p class="text-center text-sm">
        <router-link to="/login" class="font-medium text-brand-600 hover:text-brand-700">
          Back to sign in
        </router-link>
      </p>
    </div>

    <div v-else class="space-y-6 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h2 class="text-xl font-semibold text-slate-900">Check your email</h2>
        <p class="mt-2 text-sm text-slate-500">We've sent password reset instructions to {{ email }}</p>
      </div>
      <BaseButton variant="secondary" block @click="router.push('/login')">
        Return to sign in
      </BaseButton>
    </div>
  </div>
</template>
