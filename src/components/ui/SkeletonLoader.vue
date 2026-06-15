<script setup lang="ts">
defineProps<{ rows?: number }>()
</script>

<template>
  <div class="animate-pulse space-y-3">
    <div
      v-for="i in rows ?? 5"
      :key="i"
      class="h-12 rounded-lg bg-slate-200"
    />
  </div>
</template>
