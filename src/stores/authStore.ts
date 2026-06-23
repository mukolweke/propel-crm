import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { authService } from '@/services/auth.service'
import { getErrorMessage, ApiError } from '@/services/graphql'
import { useToast } from '@/composables/useToast'
import { isTokenExpired } from '@/utils/jwt'

let expiringSession = false

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(authService.getStoredUser())
  const token = ref<string | null>(authService.getStoredToken())
  const refreshToken = ref<string | null>(authService.getStoredRefreshToken())
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value && user.value))
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
  const mustChangePassword = computed(() => Boolean(user.value?.mustChangePassword))

  function initialize() {
    user.value = authService.getStoredUser()
    token.value = authService.getStoredToken()
    refreshToken.value = authService.getStoredRefreshToken()
    initialized.value = true
  }

  async function bootstrapSession(): Promise<boolean> {
    initialize()

    if (!token.value || !user.value) {
      if (token.value || user.value) {
        await expireSession({ notify: false })
      }
      return false
    }

    if (isTokenExpired(token.value)) {
      const refreshed = await refreshSession()
      if (!refreshed) {
        await expireSession()
        return false
      }
    }

    return true
  }

  function applyRefreshedTokens(accessToken: string, newRefreshToken: string) {
    token.value = accessToken
    refreshToken.value = newRefreshToken
    const remember = localStorage.getItem('propel_remember_me') === 'true'
    const storage = remember ? localStorage : sessionStorage
    storage.setItem('propel_auth_token', accessToken)
    storage.setItem('propel_auth_refresh', newRefreshToken)
  }

  function applySession(response: { user: User; token: string; refreshToken: string }, remember: boolean) {
    authService.persistSession(
      { ...response, mustChangePassword: response.user.mustChangePassword ?? false },
      remember,
    )
    user.value = response.user
    token.value = response.token
    refreshToken.value = response.refreshToken
  }

  async function login(email: string, password: string, remember = false) {
    const toast = useToast()
    resetSessionExpiryGuard()
    loading.value = true
    try {
      const response = await authService.login({ email, password, remember })
      applySession(response, remember)
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
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const toast = useToast()
    if (!token.value) throw new Error('Not authenticated')
    loading.value = true
    try {
      const response = await authService.changePassword(currentPassword, newPassword, token.value)
      const remember = localStorage.getItem('propel_remember_me') === 'true'
      applySession(response, remember)
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
    const refreshed = await authService.refreshAccessToken()
    if (!refreshed) return false
    applyRefreshedTokens(refreshed.token, refreshed.refreshToken)
    return true
  }

  async function expireSession(options: { notify?: boolean } = {}) {
    if (expiringSession) return
    expiringSession = true

    try {
      await authService.logout(token.value, refreshToken.value)
    } catch {
      // Clear local session even if API logout fails
    }

    authService.clearSession()
    user.value = null
    token.value = null
    refreshToken.value = null

    if (options.notify !== false) {
      useToast().info('Session ended', 'Please sign in again.')
    }
  }

  function resetSessionExpiryGuard() {
    expiringSession = false
  }

  async function logout() {
    await authService.logout(token.value, refreshToken.value)
    authService.clearSession()
    user.value = null
    token.value = null
    refreshToken.value = null
  }

  function syncUser(updates: Partial<User>) {
    if (!user.value) return
    user.value = { ...user.value, ...updates }
    const remember = localStorage.getItem('propel_remember_me') === 'true'
    const storage = remember ? localStorage : sessionStorage
    storage.setItem('propel_auth_user', JSON.stringify(user.value))
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
    token,
    refreshToken,
    loading,
    initialized,
    isAuthenticated,
    isSuperAdmin,
    mustChangePassword,
    initialize,
    bootstrapSession,
    applyRefreshedTokens,
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
