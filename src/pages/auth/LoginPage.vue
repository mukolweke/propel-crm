<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import AppLogo from '@/components/shared/AppLogo.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { EnvelopeIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const sessionExpired = ref(false)

const form = reactive({
  email: '',
  password: '',
  remember: false,
})

const errors = ref<Record<string, string>>({})

onMounted(() => {
  if (route.query.expired === '1') {
    sessionExpired.value = true
    toast.info('Session ended', 'Please sign in again to continue.')
  }
})

function validate() {
  errors.value = {}
  if (!form.email) errors.value.email = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(form.email)) errors.value.email = 'Enter a valid email'
  if (!form.password) errors.value.password = 'Password is required'
  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  const success = await authStore.login(form.email, form.password, form.remember)
  if (success) {
    if (authStore.mustChangePassword) {
      router.push('/change-password')
      return
    }
    const redirect = (route.query.redirect as string) || (authStore.isSuperAdmin ? '/admin/dashboard' : '/dashboard')
    router.push(redirect)
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex justify-center">
      <AppLogo variant="auth" />
    </div>

    <div class="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm sm:p-10">
      <div class="mb-8 text-center">
        <h1 class="font-display text-2xl text-slate-900">Welcome back, Agent</h1>
        <p class="mt-2 text-sm text-slate-500">Enter your credentials to access your properties.</p>
      </div>

      <div
        v-if="sessionExpired"
        class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        role="alert"
      >
        Your session has ended. Sign in again to continue.
      </div>

      <form class="space-y-6" @submit.prevent="handleSubmit">
        <BaseInput
          v-model="form.email"
          label="Email Address"
          type="email"
          placeholder="you@company.com"
          :error="errors.email"
          uppercase-label
          variant="filled"
          required
        >
          <template #icon>
            <EnvelopeIcon class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </template>
        </BaseInput>

        <BaseInput
          v-model="form.password"
          label="Password"
          type="password"
          placeholder="••••••••"
          :error="errors.password"
          uppercase-label
          variant="filled"
          required
        >
          <template #label-action>
            <router-link to="/forgot-password" class="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Forgot password?
            </router-link>
          </template>
          <template #icon>
            <LockClosedIcon class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </template>
        </BaseInput>

        <label class="flex items-center gap-2.5 text-sm text-slate-600">
          <input
            v-model="form.remember"
            type="checkbox"
            class="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Remember me for 30 days
        </label>

        <BaseButton type="submit" block size="lg" :loading="authStore.loading">
          Login
          <ArrowRightIcon class="h-4 w-4" />
        </BaseButton>
      </form>
    </div>
  </div>
</template>
