import { computed } from 'vue'
import type { UserRole } from '@/types'

export interface NavItem {
  name: string
  to: string
  icon: string
  roles?: UserRole[]
}

export const USER_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', to: '/dashboard', icon: 'HomeIcon', roles: ['user'] },
  { name: 'Contacts', to: '/contacts', icon: 'UsersIcon', roles: ['user'] },
  { name: 'Log Activity', to: '/interactions', icon: 'PencilSquareIcon', roles: ['user'] },
  { name: 'Follow Ups', to: '/follow-ups', icon: 'CalendarDaysIcon', roles: ['user'] },
  { name: 'Reports', to: '/reports', icon: 'ChartBarIcon', roles: ['user'] },
  { name: 'Settings', to: '/settings', icon: 'Cog6ToothIcon', roles: ['user', 'super_admin'] },
]

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', to: '/admin/dashboard', icon: 'HomeIcon', roles: ['super_admin'] },
  { name: 'Users', to: '/admin/users', icon: 'UsersIcon', roles: ['super_admin'] },
  { name: 'Contacts', to: '/admin/contacts', icon: 'UserGroupIcon', roles: ['super_admin'] },
  { name: 'Audit Logs', to: '/admin/audit-logs', icon: 'ShieldCheckIcon', roles: ['super_admin'] },
  { name: 'Settings', to: '/settings', icon: 'Cog6ToothIcon', roles: ['super_admin'] },
]

export function getNavItemsForRole(role: UserRole | undefined): NavItem[] {
  if (role === 'super_admin') return ADMIN_NAV_ITEMS
  return USER_NAV_ITEMS
}

export function canAccessRoute(role: UserRole | undefined, allowedRoles?: UserRole[]): boolean {
  if (!allowedRoles?.length) return true
  if (!role) return false
  return allowedRoles.includes(role)
}

export function useRoleNav(role: () => UserRole | undefined) {
  return computed(() => getNavItemsForRole(role()))
}
