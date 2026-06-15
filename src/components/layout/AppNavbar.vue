<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/vue/24/outline'
import { useSidebar } from '@/composables/useSidebar'
import SidebarToggleButton from '@/components/ui/SidebarToggleButton.vue'

defineEmits<{ 'toggle-sidebar': [] }>()

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const { collapsed, toggleCollapsed } = useSidebar()
const searchQuery = ref('')

const unreadCount = computed(
  () => settingsStore.notifications.filter((n) => !n.read).length,
)

function logout() {
  authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-brand-100 bg-white/90 backdrop-blur">
    <div class="flex h-16 items-center gap-4 px-6 lg:px-8">
      <button
        class="rounded-lg p-2 text-slate-500 hover:bg-mint lg:hidden"
        @click="$emit('toggle-sidebar')"
      >
        <Bars3Icon class="h-6 w-6" />
      </button>

      <SidebarToggleButton
        class="hidden lg:inline-flex"
        :collapsed="collapsed"
        @click="toggleCollapsed"
      />

      <div class="relative mx-auto hidden w-full max-w-xl flex-1 sm:block">
        <MagnifyingGlassIcon class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search leads or properties..."
          class="w-full rounded-full border border-slate-200 bg-mint py-2.5 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div class="ml-auto flex items-center gap-2">
        <button class="relative rounded-full p-2.5 text-slate-500 hover:bg-mint">
          <BellIcon class="h-5 w-5" />
          <span
            v-if="unreadCount > 0"
            class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"
          />
        </button>

        <Menu as="div" class="relative">
          <MenuButton class="flex items-center gap-2 rounded-full p-1 hover:bg-mint">
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
              {{ authStore.user?.name?.charAt(0) ?? 'A' }}
            </div>
          </MenuButton>

          <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="scale-95 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-95 opacity-0"
          >
            <MenuItems class="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-slate-200 bg-white py-1 shadow-lg focus:outline-none">
              <MenuItem v-slot="{ active }">
                <router-link
                  to="/settings"
                  :class="[active ? 'bg-mint' : '', 'flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700']"
                >
                  <UserCircleIcon class="h-4 w-4" />
                  Profile
                </router-link>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button
                  :class="[active ? 'bg-mint' : '', 'flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700']"
                  @click="logout"
                >
                  <ArrowRightOnRectangleIcon class="h-4 w-4" />
                  Sign out
                </button>
              </MenuItem>
            </MenuItems>
          </transition>
        </Menu>
      </div>
    </div>
  </header>
</template>
