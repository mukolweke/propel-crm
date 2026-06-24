<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { graphqlRequest, getErrorMessage } from '@/services/graphql'
import { useToast } from '@/composables/useToast'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const toast = useToast()
const loading = ref(true)
const logs = ref<Array<Record<string, unknown>>>([])
const total = ref(0)

const filters = reactive({
  search: '',
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
      auditLogs: { items: Array<Record<string, unknown>>; total: number }
    }>(
      QUERY,
      {
        filter: {
          search: filters.search.trim() || undefined,
          action: filters.action.trim() || undefined,
          entityType: filters.entityType.trim() || undefined,
          page: 1,
          pageSize: 50,
        },
      },
    )
    logs.value = data.auditLogs.items
    total.value = data.auditLogs.total
  } catch (err) {
    toast.error('Audit log search failed', getErrorMessage(err))
    logs.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filters.search = ''
  filters.action = ''
  filters.entityType = ''
  void fetchLogs()
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
      <form class="mb-6 flex flex-wrap gap-3" @submit.prevent="fetchLogs">
        <BaseInput
          v-model="filters.search"
          placeholder="Search action, entity, or IP..."
          class="max-w-sm"
          maxlength="200"
        />
        <BaseInput
          v-model="filters.action"
          placeholder="Filter by action (e.g. LOGIN)"
          class="max-w-xs"
          maxlength="200"
        />
        <BaseInput
          v-model="filters.entityType"
          placeholder="Filter by entity (e.g. CONTACT)"
          class="max-w-xs"
          maxlength="200"
        />
        <BaseButton type="submit" variant="outline">Search</BaseButton>
        <BaseButton type="button" variant="ghost" @click="clearFilters">Clear</BaseButton>
      </form>

      <p v-if="!loading && total" class="mb-4 text-sm text-slate-500">
        {{ total }} log{{ total === 1 ? '' : 's' }} found
      </p>

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
