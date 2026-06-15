<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'

const route = useRoute()
const layout = computed(() => (route.meta.layout === 'dashboard' ? DashboardLayout : AuthLayout))
</script>

<template>
  <component :is="layout">
    <RouterView />
  </component>
  <ToastContainer />
</template>
