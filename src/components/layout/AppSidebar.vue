<script setup lang="ts">
import { computed } from "vue";
import { useRoute, RouterLink } from "vue-router";
import AppLogo from "@/components/shared/AppLogo.vue";
import { useSidebar } from "@/composables/useSidebar";
import { NAV_ITEMS } from "@/utils/constants";
import {
    HomeIcon,
    UsersIcon,
    PencilSquareIcon,
    ChartBarIcon,
    ShareIcon,
    Cog6ToothIcon,
    UserCircleIcon,
    XMarkIcon,
} from "@heroicons/vue/24/outline";
import { classNames } from "@/utils/helpers";
import SidebarToggleButton from "@/components/ui/SidebarToggleButton.vue";

const props = defineProps<{ open: boolean }>();
defineEmits<{ close: [] }>();

const route = useRoute();
const { collapsed, toggleCollapsed } = useSidebar();

const isCollapsed = computed(() => collapsed.value && !props.open);

const iconMap = {
    HomeIcon,
    UsersIcon,
    PencilSquareIcon,
    ChartBarIcon,
    ShareIcon,
    Cog6ToothIcon,
};

const navItems = computed(() =>
    NAV_ITEMS.map((item) => ({
        ...item,
        icon: iconMap[item.icon as keyof typeof iconMap],
        active: route.path === item.to || route.path.startsWith(item.to + "/"),
    }))
);

const profileActive = computed(() => route.path === "/settings");
</script>

<template>
    <div>
        <div
            v-if="open"
            class="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            @click="$emit('close')"
        />

        <aside
            :class="
                classNames(
                    'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-brand-100 bg-mint-sidebar transition-all duration-300 ease-in-out lg:translate-x-0',
                    collapsed ? 'w-70 lg:w-20' : 'w-70',
                    open ? 'translate-x-0' : '-translate-x-full'
                )
            "
        >
            <div
                :class="
                    classNames(
                        'border-b border-brand-100 transition-all duration-300',
                        isCollapsed ? 'px-3 py-5' : 'px-6 py-6'
                    )
                "
            >
                <div class="flex items-center justify-between gap-2">
                    <AppLogo
                        variant="compact"
                        :icon-only="isCollapsed"
                        :show-tagline="!isCollapsed"
                    />
                    <button
                        class="rounded-lg p-2 text-slate-500 hover:bg-white/60 lg:hidden"
                        @click="$emit('close')"
                    >
                        <XMarkIcon class="h-5 w-5" />
                    </button>
                </div>
            </div>

            <nav
                :class="
                    classNames(
                        'flex-1 space-y-1 overflow-y-auto overflow-x-hidden py-5 scrollbar-thin',
                        isCollapsed ? 'px-2' : 'px-4'
                    )
                "
            >
                <RouterLink
                    v-for="item in navItems"
                    :key="item.to"
                    :to="item.to"
                    :title="isCollapsed ? item.name : undefined"
                    :class="
                        classNames(
                            'relative flex items-center rounded-xl text-sm font-medium transition-colors',
                            isCollapsed
                                ? 'justify-center px-0 py-4'
                                : 'gap-3 px-4 py-4',
                            item.active
                                ? 'bg-white text-forest shadow-sm font-bold'
                                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                        )
                    "
                    @click="$emit('close')"
                >
                    <span
                        v-if="item.active"
                        :class="
                            classNames(
                                'absolute top-1/2 -translate-y-1/2 rounded-full bg-forest',
                                isCollapsed
                                    ? 'left-0 h-8 w-1 rounded-r-full'
                                    : 'right-0 h-8 w-1 rounded-l-full'
                            )
                        "
                    />
                    <component :is="item.icon" class="h-5 w-5 shrink-0" />
                    <span
                        :class="
                            classNames(
                                'truncate whitespace-nowrap transition-all duration-300',
                                isCollapsed
                                    ? 'w-0 opacity-0'
                                    : 'w-auto opacity-100'
                            )
                        "
                    >
                        {{ item.name }}
                    </span>
                </RouterLink>
            </nav>

            <div
                :class="[
                    'border-t border-brand-100',
                    isCollapsed ? 'p-2' : 'p-4',
                ]"
            >
                <div class="mb-2 hidden justify-center lg:flex">
                    <SidebarToggleButton
                        :collapsed="collapsed"
                        @click="toggleCollapsed"
                    />
                </div>

                <RouterLink
                    to="/settings"
                    :title="isCollapsed ? 'Profile' : undefined"
                    :class="
                        classNames(
                            'relative flex items-center rounded-xl text-sm font-medium transition-colors',
                            isCollapsed
                                ? 'justify-center py-3'
                                : 'gap-3 px-4 py-3',
                            profileActive
                                ? 'bg-white text-forest shadow-sm'
                                : 'text-slate-600 hover:bg-white/60'
                        )
                    "
                    @click="$emit('close')"
                >
                    <UserCircleIcon class="h-5 w-5 shrink-0" />
                    <span
                        :class="
                            classNames(
                                'truncate whitespace-nowrap transition-all duration-300',
                                isCollapsed
                                    ? 'w-0 opacity-0'
                                    : 'w-auto opacity-100'
                            )
                        "
                    >
                        Profile
                    </span>
                </RouterLink>
            </div>
        </aside>
    </div>
</template>
