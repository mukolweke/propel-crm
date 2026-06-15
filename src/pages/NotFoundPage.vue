<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
</script>

<template>
  <div class="text-center">
    <p class="text-6xl font-bold text-brand-600">404</p>
    <h1 class="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
    <p class="mt-2 text-slate-500">The page you're looking for doesn't exist.</p>
    <BaseButton class="mt-6" @click="router.push('/dashboard')">Go to Dashboard</BaseButton>
  </div>
</template>
