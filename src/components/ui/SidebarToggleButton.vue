<script setup lang="ts">
import SidebarToggleIcon from "./SidebarToggleIcon.vue";

defineProps<{
    collapsed?: boolean;
    title?: string;
}>();

defineEmits<{
    click: [];
}>();
</script>

<template>
    <button
        type="button"
        :title="title ?? (collapsed ? 'Expand sidebar' : 'Collapse sidebar')"
        class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-none bg-white text-slate-500 transition-colors hover:text-slate-700"
        @click="$emit('click')"
    >
        <SidebarToggleIcon :collapsed="collapsed" />
    </button>
</template>
