import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { authService } from '@/services/auth.service'
import { useToast } from '@/composables/useToast'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(authService.getStoredUser())
  const token = ref<string | null>(authService.getStoredToken())
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value && user.value))

  function initialize() {
    user.value = authService.getStoredUser()
    token.value = authService.getStoredToken()
    initialized.value = true
  }

  async function login(email: string, password: string, remember = false) {
    const toast = useToast()
    loading.value = true
    try {
      const response = await authService.login({ email, password, remember })
      authService.persistSession(response, remember)
      user.value = response.user
      token.value = response.token
      toast.success('Welcome back!', 'You have been signed in successfully.')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      toast.error('Login failed', message)
      return false
    } finally {
      loading.value = false
    }
  }

  async function forgotPassword(email: string) {
    const toast = useToast()
    loading.value = true
    try {
      await authService.forgotPassword(email)
      toast.success('Reset link sent', 'Check your email for password reset instructions.')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      toast.error('Request failed', message)
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    authService.clearSession()
    user.value = null
    token.value = null
  }

  return {
    user,
    token,
    loading,
    initialized,
    isAuthenticated,
    initialize,
    login,
    forgotPassword,
    logout,
  }
})
