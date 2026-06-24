<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { graphqlRequest } from '@/services/graphql'
import BaseCard from '@/components/ui/BaseCard.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const loading = ref(true)
const contacts = ref<Array<Record<string, unknown>>>([])

const QUERY = `
  query AdminContacts($page: Int, $pageSize: Int) {
    adminContacts(page: $page, pageSize: $pageSize) {
      items { id ownerName ownerEmail contactName phone status createdAt }
      total
    }
  }
`

onMounted(async () => {
  try {
    const data = await graphqlRequest<{
      adminContacts: { items: Array<Record<string, unknown>> }
    }>(QUERY, { page: 1, pageSize: 50 })
    contacts.value = data.adminContacts.items
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="font-display text-3xl text-slate-900">All Contacts</h1>
      <p class="mt-2 text-sm text-slate-500">View contacts across all users with ownership.</p>
    </div>

    <BaseCard>
      <SkeletonLoader v-if="loading" />
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th class="px-4 py-3">Contact</th>
              <th class="px-4 py-3">Owner</th>
              <th class="px-4 py-3">Phone</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="c in contacts" :key="String(c.id)">
              <td class="px-4 py-3 font-medium">{{ c.contactName }}</td>
              <td class="px-4 py-3">
                <p>{{ c.ownerName }}</p>
                <p class="text-xs text-slate-500">{{ c.ownerEmail }}</p>
              </td>
              <td class="px-4 py-3">{{ c.phone || '—' }}</td>
              <td class="px-4 py-3 capitalize">{{ c.status }}</td>
              <td class="px-4 py-3 text-slate-500">
                {{ new Date(String(c.createdAt)).toLocaleDateString() }}
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!contacts.length" class="py-8 text-center text-sm text-slate-500">No contacts yet.</p>
      </div>
    </BaseCard>
  </div>
</template>
