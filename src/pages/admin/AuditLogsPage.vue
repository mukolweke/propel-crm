<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { graphqlRequest } from '@/services/graphql'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const authStore = useAuthStore()
const loading = ref(true)
const logs = ref<Array<Record<string, unknown>>>([])

const filters = reactive({
  action: '',
  entityType: '',
})

const QUERY = `
  query AuditLogs($filter: AuditLogFilterInput) {
    auditLogs(filter: $filter) {
      items {
        id action entityType entityId performedBy performedByRole
        ipAddress timestamp metadata
      }
      total
    }
  }
`

async function fetchLogs() {
  loading.value = true
  try {
    const data = await graphqlRequest<{
      auditLogs: { items: Array<Record<string, unknown>> }
    }>(
      QUERY,
      {
        filter: {
          action: filters.action || undefined,
          entityType: filters.entityType || undefined,
          page: 1,
          pageSize: 50,
        },
      },
      authStore.token,
    )
    logs.value = data.auditLogs.items
  } finally {
    loading.value = false
  }
}

onMounted(fetchLogs)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="font-display text-3xl text-slate-900">Audit Logs</h1>
      <p class="mt-2 text-sm text-slate-500">Immutable record of system activity. Read-only.</p>
    </div>

    <BaseCard>
      <div class="mb-6 flex flex-wrap gap-3">
        <BaseInput v-model="filters.action" placeholder="Filter by action" class="max-w-xs" />
        <BaseInput v-model="filters.entityType" placeholder="Filter by entity type" class="max-w-xs" />
        <BaseButton variant="outline" @click="fetchLogs">Search</BaseButton>
      </div>

      <SkeletonLoader v-if="loading" />
      <div v-else class="space-y-3">
        <div
          v-for="log in logs"
          :key="String(log.id)"
          class="rounded-xl border border-slate-100 bg-mint/40 p-4 text-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="font-medium text-slate-900">{{ log.action }}</p>
              <p class="text-slate-500">{{ log.entityType }} · {{ log.entityId || '—' }}</p>
            </div>
            <span class="text-xs text-slate-400">
              {{ new Date(String(log.timestamp)).toLocaleString() }}
            </span>
          </div>
          <p v-if="log.ipAddress" class="mt-2 text-xs text-slate-500">IP: {{ log.ipAddress }}</p>
        </div>
        <p v-if="!logs.length" class="py-8 text-center text-slate-500">No audit logs found.</p>
      </div>
    </BaseCard>
  </div>
</template>
