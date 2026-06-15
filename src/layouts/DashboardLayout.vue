<script setup lang="ts">
import { computed } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { useSidebar } from '@/composables/useSidebar'
import { classNames } from '@/utils/helpers'

const { collapsed, mobileOpen, closeMobile, toggleMobile } = useSidebar()

const mainOffset = computed(() => (collapsed.value ? 'lg:pl-20' : 'lg:pl-64'))
</script>

<template>
  <div class="min-h-screen bg-mint">
    <AppSidebar :open="mobileOpen" @close="closeMobile" />

    <div :class="classNames('transition-all duration-300 ease-in-out', mainOffset)">
      <AppNavbar @toggle-sidebar="toggleMobile" />

      <main class="px-5 pb-24 pt-8 sm:px-8 lg:px-10 lg:pb-10">
        <slot />
      </main>
    </div>

    <MobileBottomNav />
    <ConfirmModal />
  </div>
</template>
