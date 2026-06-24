<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import LegalLayout from '@/layouts/LegalLayout.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'

const route = useRoute()
const layout = computed(() => {
  if (route.meta.layout === 'dashboard') return DashboardLayout
  if (route.meta.layout === 'legal') return LegalLayout
  return AuthLayout
})
</script>

<template>
  <component :is="layout">
    <RouterView />
  </component>
  <ToastContainer />
</template>
