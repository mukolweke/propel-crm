import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PropertyType, PropertyTypeFormData } from '@/types'
import { DEFAULT_PROPERTY_TYPES } from '@/mock/propertyTypes'
import { useContactsStore } from './contactsStore'
import { delay, generateId } from '@/utils/helpers'
import { useToast } from '@/composables/useToast'

const STORAGE_KEY = 'propel_property_types'

function seedPropertyTypes(): PropertyType[] {
  const now = new Date().toISOString()
  return DEFAULT_PROPERTY_TYPES.map((item) => ({
    ...item,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  }))
}

function loadFromStorage(): PropertyType[] | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PropertyType[]
  } catch {
    return null
  }
}

function saveToStorage(items: PropertyType[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const usePropertyTypesStore = defineStore('propertyTypes', () => {
  const items = ref<PropertyType[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const initialized = ref(false)

  const activeItems = computed(() =>
    [...items.value]
      .filter((item) => item.active)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  )

  const selectOptions = computed(() =>
    activeItems.value.map((item) => ({ value: item.name, label: item.name })),
  )

  const sortedItems = computed(() =>
    [...items.value].sort((a, b) => a.sortOrder - b.sortOrder),
  )

  async function fetchPropertyTypes() {
    if (initialized.value && items.value.length > 0) return
    loading.value = true
    await delay(300)

    const stored = loadFromStorage()
    items.value = stored ?? seedPropertyTypes()
    if (!stored) saveToStorage(items.value)

    initialized.value = true
    loading.value = false
  }

  function getById(id: string) {
    return items.value.find((item) => item.id === id)
  }

  function getUsageCount(name: string) {
    const contactsStore = useContactsStore()
    return contactsStore.contacts.filter((c) => c.propertyType === name).length
  }

  async function addPropertyType(data: PropertyTypeFormData) {
    saving.value = true
    await delay(400)

    const name = data.name.trim()
    if (!name) throw new Error('Name is required')
    if (items.value.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('A property type with this name already exists')
    }

    const now = new Date().toISOString()
    const maxOrder = items.value.reduce((max, item) => Math.max(max, item.sortOrder), 0)
    const propertyType: PropertyType = {
      id: generateId(),
      name,
      description: data.description.trim(),
      active: data.active,
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    }

    items.value.push(propertyType)
    saveToStorage(items.value)
    saving.value = false
    useToast().success('Property type added')
    return propertyType
  }

  async function updatePropertyType(id: string, data: PropertyTypeFormData) {
    saving.value = true
    await delay(400)

    const index = items.value.findIndex((item) => item.id === id)
    if (index === -1) throw new Error('Property type not found')

    const name = data.name.trim()
    if (!name) throw new Error('Name is required')
    if (
      items.value.some(
        (item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new Error('A property type with this name already exists')
    }

    const previousName = items.value[index].name
    items.value[index] = {
      ...items.value[index],
      name,
      description: data.description.trim(),
      active: data.active,
      updatedAt: new Date().toISOString(),
    }

    if (previousName !== name) {
      const contactsStore = useContactsStore()
      contactsStore.contacts.forEach((contact) => {
        if (contact.propertyType === previousName) {
          contact.propertyType = name
        }
      })
    }

    saveToStorage(items.value)
    saving.value = false
    useToast().success('Property type updated')
    return items.value[index]
  }

  async function deletePropertyType(id: string) {
    saving.value = true
    await delay(300)

    const item = items.value.find((entry) => entry.id === id)
    if (!item) throw new Error('Property type not found')

    const usage = getUsageCount(item.name)
    if (usage > 0) {
      saving.value = false
      throw new Error(`Cannot delete: ${usage} contact(s) use this property type`)
    }

    items.value = items.value.filter((entry) => entry.id !== id)
    saveToStorage(items.value)
    saving.value = false
    useToast().success('Property type deleted')
  }

  async function toggleActive(id: string) {
    const item = items.value.find((entry) => entry.id === id)
    if (!item) return
    await updatePropertyType(id, {
      name: item.name,
      description: item.description,
      active: !item.active,
    })
  }

  return {
    items,
    loading,
    saving,
    initialized,
    activeItems,
    selectOptions,
    sortedItems,
    fetchPropertyTypes,
    getById,
    getUsageCount,
    addPropertyType,
    updatePropertyType,
    deletePropertyType,
    toggleActive,
  }
})
