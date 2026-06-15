import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SharePermission, SharedList } from '@/types'
import { mockSharedLists, mockUsers } from '@/mock'
import { delay, generateId } from '@/utils/helpers'

export const useSharedListsStore = defineStore('sharedLists', () => {
  const lists = ref<SharedList[]>([])
  const loading = ref(false)
  const availableUsers = ref(mockUsers.filter((u) => u.id !== 'user-001'))

  const myLists = computed(() => lists.value.filter((l) => l.ownerId === 'user-001'))

  async function fetchSharedLists() {
    loading.value = true
    await delay(500)
    lists.value = [...mockSharedLists]
    loading.value = false
  }

  async function createSharedList(name: string, contactIds: string[]) {
    await delay(400)
    const list: SharedList = {
      id: generateId(),
      name,
      contactIds,
      sharedWith: [],
      ownerId: 'user-001',
      createdAt: new Date().toISOString(),
    }
    lists.value.unshift(list)
    return list
  }

  async function shareWithUser(
    listId: string,
    userId: string,
    permission: SharePermission,
  ) {
    await delay(300)
    const list = lists.value.find((l) => l.id === listId)
    const user = availableUsers.value.find((u) => u.id === userId)
    if (!list || !user) return

    const existing = list.sharedWith.find((s) => s.userId === userId)
    if (existing) {
      existing.permission = permission
    } else {
      list.sharedWith.push({
        userId: user.id,
        name: user.name,
        email: user.email,
        permission,
      })
    }
  }

  async function removeShare(listId: string, userId: string) {
    await delay(300)
    const list = lists.value.find((l) => l.id === listId)
    if (!list) return
    list.sharedWith = list.sharedWith.filter((s) => s.userId !== userId)
  }

  return {
    lists,
    loading,
    availableUsers,
    myLists,
    fetchSharedLists,
    createSharedList,
    shareWithUser,
    removeShare,
  }
})
