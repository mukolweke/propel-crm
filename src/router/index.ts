import { createRouter, createWebHistory } from 'vue-router'
import type { UserRole } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { canAccessRoute } from '@/utils/nav'

declare module 'vue-router' {
  interface RouteMeta {
    guest?: boolean
    requiresAuth?: boolean
    layout?: 'auth' | 'dashboard' | 'legal'
    roles?: UserRole[]
    allowMustChangePassword?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/auth/LoginPage.vue'),
      meta: { guest: true, layout: 'auth' },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
      meta: { guest: true, layout: 'auth' },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/pages/auth/ResetPasswordPage.vue'),
      meta: { guest: true, layout: 'auth' },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: () => import('@/pages/auth/ChangePasswordPage.vue'),
      meta: { requiresAuth: true, layout: 'auth', allowMustChangePassword: true },
    },
    {
      path: '/unauthorized',
      name: 'unauthorized',
      component: () => import('@/pages/auth/UnauthorizedPage.vue'),
      meta: { layout: 'auth' },
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: () => import('@/pages/auth/ForbiddenPage.vue'),
      meta: { layout: 'auth' },
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/pages/legal/PrivacyPolicyPage.vue'),
      meta: { layout: 'legal' },
    },
    {
      path: '/terms',
      name: 'terms',
      component: () => import('@/pages/legal/TermsOfServicePage.vue'),
      meta: { layout: 'legal' },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/DashboardPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['user'] },
    },
    {
      path: '/contacts',
      name: 'contacts',
      component: () => import('@/pages/ContactsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['user'] },
    },
    {
      path: '/contacts/new',
      name: 'contacts-new',
      component: () => import('@/pages/ContactFormPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['user'] },
    },
    {
      path: '/contacts/:id/edit',
      name: 'contacts-edit',
      component: () => import('@/pages/ContactFormPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['user'] },
    },
    {
      path: '/interactions',
      name: 'interactions',
      component: () => import('@/pages/InteractionsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['user'] },
    },
    {
      path: '/follow-ups',
      name: 'follow-ups',
      component: () => import('@/pages/FollowUpsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['user'] },
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/pages/ReportsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['user'] },
    },
    {
      path: '/shared-lists',
      name: 'shared-lists',
      component: () => import('@/pages/SharedListsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['user'] },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/SettingsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['user', 'super_admin'] },
    },
    {
      path: '/settings/property-types',
      name: 'property-types',
      component: () => import('@/pages/PropertyTypesPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['user'] },
    },
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      component: () => import('@/pages/admin/AdminDashboardPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['super_admin'] },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/pages/admin/UsersPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['super_admin'] },
    },
    {
      path: '/admin/contacts',
      name: 'admin-contacts',
      component: () => import('@/pages/admin/AdminContactsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['super_admin'] },
    },
    {
      path: '/admin/audit-logs',
      name: 'admin-audit-logs',
      component: () => import('@/pages/admin/AuditLogsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard', roles: ['super_admin'] },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
      meta: { layout: 'auth' },
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    await authStore.bootstrapSession()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guest && authStore.isAuthenticated && !authStore.mustChangePassword) {
    return authStore.isSuperAdmin ? { name: 'admin-dashboard' } : { name: 'dashboard' }
  }

  if (authStore.isAuthenticated && authStore.mustChangePassword && !to.meta.allowMustChangePassword) {
    return { name: 'change-password' }
  }

  if (to.meta.roles && !canAccessRoute(authStore.user?.role, to.meta.roles)) {
    return { name: 'forbidden' }
  }

  if (to.name === 'dashboard' && authStore.isSuperAdmin) {
    return { name: 'admin-dashboard' }
  }

  return true
})

export default router
