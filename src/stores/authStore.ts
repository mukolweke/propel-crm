import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { authService } from '@/services/auth.service'
import { getErrorMessage, ApiError } from '@/services/graphql'
import { useToast } from '@/composables/useToast'
import { clearLegacyAuthStorage } from '@/utils/csrf'

let expiringSession = false

clearLegacyAuthStorage()

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const sessionActive = ref(false)
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => sessionActive.value && Boolean(user.value))
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
  const mustChangePassword = computed(() => Boolean(user.value?.mustChangePassword))

  function setUser(next: User | null) {
    user.value = next
    sessionActive.value = Boolean(next)
  }

  async function bootstrapSession(): Promise<boolean> {
    loading.value = true
    try {
      let current = await authService.fetchCurrentUser()
      if (!current) {
        const refreshed = await authService.refreshSession()
        if (refreshed) {
          current = await authService.fetchCurrentUser()
        }
      }

      if (!current) {
        setUser(null)
        return false
      }

      setUser(current)
      return true
    } catch {
      setUser(null)
      return false
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  async function login(email: string, password: string, remember = false) {
    const toast = useToast()
    resetSessionExpiryGuard()
    loading.value = true
    try {
      const response = await authService.login({ email, password, remember })
      setUser(response.user)
      if (response.mustChangePassword) {
        toast.info('Password change required', 'Please set a new password to continue.')
      } else {
        toast.success('Welcome back!', 'You have been signed in successfully.')
      }
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      toast.error('Login failed', message)
      return false
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const toast = useToast()
    if (!isAuthenticated.value) throw new Error('Not authenticated')
    loading.value = true
    try {
      const response = await authService.changePassword(currentPassword, newPassword)
      setUser(response.user)
      toast.success('Password updated', 'Your password has been changed successfully.')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password change failed'
      toast.error('Update failed', message)
      return false
    } finally {
      loading.value = false
    }
  }

  async function refreshSession() {
    const refreshed = await authService.refreshSession()
    if (!refreshed) return false
    const current = await authService.fetchCurrentUser()
    if (!current) return false
    setUser(current)
    return true
  }

  async function expireSession(options: { notify?: boolean } = {}) {
    if (expiringSession) return
    expiringSession = true

    try {
      await authService.logout()
    } catch {
      // Clear client state even if API logout fails
    }

    setUser(null)

    if (options.notify !== false) {
      useToast().info('Session ended', 'Please sign in again.')
    }
  }

  function resetSessionExpiryGuard() {
    expiringSession = false
  }

  async function logout() {
    await expireSession({ notify: false })
  }

  function syncUser(updates: Partial<User>) {
    if (!user.value) return
    user.value = { ...user.value, ...updates }
  }

  async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    loading.value = true
    try {
      const result = await authService.requestPasswordReset(email)
      return { success: true, message: result.message }
    } catch (err) {
      return { success: false, message: getErrorMessage(err) }
    } finally {
      loading.value = false
    }
  }

  async function resetPassword(
    email: string,
    resetCode: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string; field?: 'email' | 'code' | 'password' }> {
    loading.value = true
    try {
      const result = await authService.resetPassword(email, resetCode, newPassword)
      return { success: true, message: result.message }
    } catch (err) {
      const message = getErrorMessage(err)
      const errorCode = err instanceof ApiError ? err.code : undefined
      let field: 'email' | 'code' | 'password' | undefined
      if (errorCode === 'EMAIL_NOT_FOUND') field = 'email'
      else if (
        errorCode === 'INVALID_RESET_CODE' ||
        errorCode === 'RESET_CODE_EXPIRED' ||
        errorCode === 'RESET_CODE_LOCKED'
      ) {
        field = 'code'
      } else if (errorCode === 'WEAK_PASSWORD' || errorCode === 'VALIDATION_ERROR') {
        field = 'password'
      }
      return { success: false, message, field }
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    sessionActive,
    loading,
    initialized,
    isAuthenticated,
    isSuperAdmin,
    mustChangePassword,
    bootstrapSession,
    expireSession,
    resetSessionExpiryGuard,
    login,
    changePassword,
    refreshSession,
    forgotPassword,
    resetPassword,
    logout,
    syncUser,
  }
})
