import type { User } from '@/types'
import { mockUser } from '@/mock'
import { delay } from '@/utils/helpers'

const AUTH_TOKEN_KEY = 'propel_auth_token'
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
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await delay(800)

    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required')
    }

    if (credentials.password.length < 6) {
      throw new Error('Invalid email or password')
    }

    const user: User = {
      ...mockUser,
      email: credentials.email,
      name: credentials.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }

    const token = `mock-token-${Date.now()}`
    return { user, token }
  },

  async forgotPassword(email: string): Promise<void> {
    await delay(600)
    if (!email) throw new Error('Email is required')
  },

  persistSession(response: AuthResponse, remember: boolean): void {
    localStorage.setItem(AUTH_TOKEN_KEY, response.token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user))
    localStorage.setItem(REMEMBER_KEY, String(remember))
  },

  clearSession(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    localStorage.removeItem(REMEMBER_KEY)
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  },

  getStoredToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  },

  isAuthenticated(): boolean {
    return Boolean(this.getStoredToken() && this.getStoredUser())
  },
}
