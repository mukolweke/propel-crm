import type { AuthUser, UserRole } from '../types/index.js'
import { AppError } from '../utils/errors.js'

export function isSuperAdmin(user: AuthUser): boolean {
  return user.role === 'super_admin'
}

export function assertSuperAdmin(user: AuthUser): void {
  if (!isSuperAdmin(user)) {
    throw new AppError('Super admin access required', 'FORBIDDEN', 403)
  }
}

export function assertNotMustChangePassword(user: AuthUser): void {
  if (user.mustChangePassword) {
    throw new AppError('Password change required before accessing this resource', 'PASSWORD_CHANGE_REQUIRED', 403)
  }
}

export function assertActiveUserRole(role: UserRole): void {
  if (role !== 'super_admin' && role !== 'user') {
    throw new AppError('Invalid role', 'FORBIDDEN', 403)
  }
}

export function ownerScopeFilter(user: AuthUser): Record<string, unknown> {
  if (isSuperAdmin(user)) return {}
  return { ownerId: user.id }
}
