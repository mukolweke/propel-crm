<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { MOBILE_NAV_ITEMS } from '@/utils/constants'
import {
  HomeIcon,
  UsersIcon,
  PlusCircleIcon,
  ChartBarIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/vue/24/outline'
import { classNames } from '@/utils/helpers'

const route = useRoute()

const iconMap = {
  HomeIcon,
  UsersIcon,
  PlusCircleIcon,
  ChartBarIcon,
  EllipsisHorizontalIcon,
}

const items = computed(() =>
  MOBILE_NAV_ITEMS.map((item) => ({
    ...item,
    icon: iconMap[item.icon as keyof typeof iconMap],
    active: route.path === item.to || route.path.startsWith(item.to + '/'),
  })),
)
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-100 bg-white lg:hidden">
    <div class="flex items-center justify-around px-2 py-2">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        :class="classNames(
          'flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium',
          item.active ? 'text-forest' : 'text-slate-500',
        )"
      >
        <component :is="item.icon" class="h-6 w-6" />
        {{ item.name }}
      </RouterLink>
    </div>
  </nav>
</template>
