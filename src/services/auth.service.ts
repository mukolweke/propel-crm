import type { User, UserRole } from '@/types'
import { graphqlRequest, graphqlRequestRaw } from './graphql'

export interface LoginCredentials {
  email: string
  password: string
  remember: boolean
}

export interface AuthSession {
  user: User
  mustChangePassword: boolean
}

interface ApiUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  mustChangePassword: boolean
  isActive: boolean
  mfaEnabled: boolean
}

function mapApiUser(u: ApiUser): User {
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

const USER_FIELDS = `
  id
  fullName
  email
  role
  mustChangePassword
  isActive
  mfaEnabled
`

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      mustChangePassword
      user { ${USER_FIELDS} }
    }
  }
`

const ME_QUERY = `
  query Me {
    me { ${USER_FIELDS} }
  }
`

const CHANGE_PASSWORD_MUTATION = `
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input) {
      mustChangePassword
      user { ${USER_FIELDS} }
    }
  }
`

const LOGOUT_MUTATION = `
  mutation Logout {
    logout
  }
`

const REFRESH_MUTATION = `
  mutation RefreshSession {
    refreshSession {
      success
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
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const data = await graphqlRequestRaw<{
      login: { user: ApiUser; mustChangePassword: boolean }
    }>(LOGIN_MUTATION, {
      input: {
        email: credentials.email,
        password: credentials.password,
        remember: credentials.remember,
      },
    })

    return {
      user: mapApiUser(data.login.user),
      mustChangePassword: data.login.mustChangePassword,
    }
  },

  async fetchCurrentUser(): Promise<User | null> {
    const data = await graphqlRequestRaw<{ me: ApiUser | null }>(ME_QUERY)
    return data.me ? mapApiUser(data.me) : null
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<AuthSession> {
    const data = await graphqlRequest<{ changePassword: { user: ApiUser; mustChangePassword: boolean } }>(
      CHANGE_PASSWORD_MUTATION,
      { input: { currentPassword, newPassword } },
    )

    return {
      user: mapApiUser(data.changePassword.user),
      mustChangePassword: data.changePassword.mustChangePassword,
    }
  },

  async logout(): Promise<void> {
    try {
      await graphqlRequest(LOGOUT_MUTATION)
    } catch {
      // Session cookies may already be cleared
    }
  },

  async refreshSession(): Promise<boolean> {
    try {
      const data = await graphqlRequestRaw<{ refreshSession: { success: boolean } }>(REFRESH_MUTATION)
      return data.refreshSession.success
    } catch {
      return false
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
}
