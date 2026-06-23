import type { User, UserRole } from '@/types'
import { graphqlRequest, graphqlRequestRaw } from './graphql'

const AUTH_TOKEN_KEY = 'propel_auth_token'
const AUTH_REFRESH_KEY = 'propel_auth_refresh'
const AUTH_USER_KEY = 'propel_auth_user'
const REMEMBER_KEY = 'propel_remember_me'

export interface LoginCredentials {
  email: string
  password: string
  remember: boolean
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken: string
  mustChangePassword: boolean
}

interface LoginResult {
  login: {
    user: {
      id: string
      fullName: string
      email: string
      role: UserRole
      mustChangePassword: boolean
      isActive: boolean
      mfaEnabled: boolean
    }
    accessToken: string
    refreshToken: string
    mustChangePassword: boolean
  }
}

function mapApiUser(u: LoginResult['login']['user']): User {
  return {
    id: u.id,
    name: u.fullName,
    email: u.email,
    role: u.role,
    mustChangePassword: u.mustChangePassword,
    isActive: u.isActive,
    mfaEnabled: u.mfaEnabled,
  }
}

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      mustChangePassword
      user { id fullName email role mustChangePassword isActive mfaEnabled }
    }
  }
`

const CHANGE_PASSWORD_MUTATION = `
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input) {
      accessToken
      refreshToken
      mustChangePassword
      user { id fullName email role mustChangePassword isActive mfaEnabled }
    }
  }
`

const LOGOUT_MUTATION = `
  mutation Logout($refreshToken: String) {
    logout(refreshToken: $refreshToken)
  }
`

const REFRESH_MUTATION = `
  mutation Refresh($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`

const REQUEST_PASSWORD_RESET_MUTATION = `
  mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
    requestPasswordReset(input: $input) {
      success
      message
    }
  }
`

const RESET_PASSWORD_MUTATION = `
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) {
      success
      message
    }
  }
`

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const data = await graphqlRequestRaw<LoginResult>(LOGIN_MUTATION, {
      input: { email: credentials.email, password: credentials.password },
    })

    return {
      user: mapApiUser(data.login.user),
      token: data.login.accessToken,
      refreshToken: data.login.refreshToken,
      mustChangePassword: data.login.mustChangePassword,
    }
  },

  async changePassword(currentPassword: string, newPassword: string, token: string): Promise<AuthResponse> {
    const data = await graphqlRequest<{ changePassword: LoginResult['login'] }>(
      CHANGE_PASSWORD_MUTATION,
      { input: { currentPassword, newPassword } },
      token,
    )

    return {
      user: mapApiUser(data.changePassword.user),
      token: data.changePassword.accessToken,
      refreshToken: data.changePassword.refreshToken,
      mustChangePassword: data.changePassword.mustChangePassword,
    }
  },

  async logout(token: string | null, refreshToken: string | null): Promise<void> {
    if (!token) return
    try {
      await graphqlRequest(LOGOUT_MUTATION, { refreshToken }, token)
    } catch {
      // Always clear local session even if API fails
    }
  },

  async refreshAccessToken(): Promise<{ token: string; refreshToken: string } | null> {
    const refreshToken = this.getStoredRefreshToken()
    if (!refreshToken) return null

    try {
      const data = await graphqlRequestRaw<{
        refreshToken: { accessToken: string; refreshToken: string }
      }>(REFRESH_MUTATION, { refreshToken })

      return {
        token: data.refreshToken.accessToken,
        refreshToken: data.refreshToken.refreshToken,
      }
    } catch {
      return null
    }
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const data = await graphqlRequestRaw<{
      requestPasswordReset: { success: boolean; message: string }
    }>(REQUEST_PASSWORD_RESET_MUTATION, {
      input: { email: email.trim().toLowerCase() },
    })

    return data.requestPasswordReset
  },

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const data = await graphqlRequestRaw<{
      resetPassword: { success: boolean; message: string }
    }>(RESET_PASSWORD_MUTATION, {
      input: {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      },
    })

    return data.resetPassword
  },

  persistSession(response: AuthResponse, remember: boolean): void {
    const storage = remember ? localStorage : sessionStorage
    storage.setItem(AUTH_TOKEN_KEY, response.token)
    storage.setItem(AUTH_REFRESH_KEY, response.refreshToken)
    storage.setItem(AUTH_USER_KEY, JSON.stringify(response.user))
    localStorage.setItem(REMEMBER_KEY, String(remember))

    if (!remember) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_REFRESH_KEY)
      localStorage.removeItem(AUTH_USER_KEY)
    } else {
      sessionStorage.removeItem(AUTH_TOKEN_KEY)
      sessionStorage.removeItem(AUTH_REFRESH_KEY)
      sessionStorage.removeItem(AUTH_USER_KEY)
    }
  },

  clearSession(): void {
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(AUTH_TOKEN_KEY)
      storage.removeItem(AUTH_REFRESH_KEY)
      storage.removeItem(AUTH_USER_KEY)
    }
    localStorage.removeItem(REMEMBER_KEY)
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem(AUTH_USER_KEY) ?? sessionStorage.getItem(AUTH_USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  },

  getStoredToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY)
  },

  getStoredRefreshToken(): string | null {
    return localStorage.getItem(AUTH_REFRESH_KEY) ?? sessionStorage.getItem(AUTH_REFRESH_KEY)
  },

  isAuthenticated(): boolean {
    return Boolean(this.getStoredToken() && this.getStoredUser())
  },
}
