<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ShieldExclamationIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
</script>

<template>
  <div class="mx-auto max-w-lg py-16 text-center">
    <ShieldExclamationIcon class="mx-auto h-14 w-14 text-amber-500" />
    <h1 class="mt-6 font-display text-3xl text-slate-900">Access denied</h1>
    <p class="mt-3 text-slate-500">You don't have permission to view this page.</p>
    <BaseButton class="mt-8" @click="router.push('/')">Go home</BaseButton>
  </div>
</template>
