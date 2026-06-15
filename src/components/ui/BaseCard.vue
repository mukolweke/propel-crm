<script setup lang="ts">
defineProps<{
    class?: string;
}>();
</script>

<template>
    <div
        :class="[
            'rounded-2xl border border-slate-200/80 bg-white shadow-sm p-7 sm:p-8',
            $props.class,
        ]"
    >
        <slot />
    </div>
</template>
