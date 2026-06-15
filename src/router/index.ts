import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
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
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/DashboardPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard' },
    },
    {
      path: '/contacts',
      name: 'contacts',
      component: () => import('@/pages/ContactsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard' },
    },
    {
      path: '/contacts/new',
      name: 'contacts-new',
      component: () => import('@/pages/ContactFormPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard' },
    },
    {
      path: '/contacts/:id/edit',
      name: 'contacts-edit',
      component: () => import('@/pages/ContactFormPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard' },
    },
    {
      path: '/interactions',
      name: 'interactions',
      component: () => import('@/pages/InteractionsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard' },
    },
    {
      path: '/follow-ups',
      name: 'follow-ups',
      component: () => import('@/pages/FollowUpsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard' },
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/pages/ReportsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard' },
    },
    {
      path: '/shared-lists',
      name: 'shared-lists',
      component: () => import('@/pages/SharedListsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/SettingsPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard' },
    },
    {
      path: '/settings/property-types',
      name: 'property-types',
      component: () => import('@/pages/PropertyTypesPage.vue'),
      meta: { requiresAuth: true, layout: 'dashboard' },
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

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    authStore.initialize()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guest && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
