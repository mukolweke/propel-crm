<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { LockClosedIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
</script>

<template>
  <div class="mx-auto max-w-lg py-16 text-center">
    <LockClosedIcon class="mx-auto h-14 w-14 text-slate-400" />
    <h1 class="mt-6 font-display text-3xl text-slate-900">Sign in required</h1>
    <p class="mt-3 text-slate-500">Please sign in to access this page.</p>
    <BaseButton class="mt-8" @click="router.push('/login')">Sign in</BaseButton>
  </div>
</template>
