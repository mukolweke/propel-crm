<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()
</script>

<template>
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="h-4 w-4"
    aria-hidden="true"
  >
    <rect
      x="2.5"
      y="3.5"
      width="15"
      height="13"
      rx="2"
      stroke="currentColor"
      stroke-width="1.5"
    />
    <rect
      :x="collapsed ? 13 : 11.5"
      y="5.5"
      :width="collapsed ? 2 : 4.5"
      height="9"
      :rx="collapsed ? 0.5 : 0.75"
      fill="currentColor"
    />
  </svg>
</template>
