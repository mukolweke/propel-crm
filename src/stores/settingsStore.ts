import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserSettings } from '@/types'
import { defaultSettings, mockNotifications } from '@/mock'
import type { Notification } from '@/types'
import { delay } from '@/utils/helpers'
import { useToast } from '@/composables/useToast'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>(structuredClone(defaultSettings))
  const notifications = ref<Notification[]>([])
  const loading = ref(false)
  const saving = ref(false)

  async function fetchSettings() {
    loading.value = true
    await delay(400)
    notifications.value = [...mockNotifications]
    loading.value = false
  }

  async function saveProfile(profile: UserSettings['profile']) {
    saving.value = true
    await delay(500)
    settings.value.profile = { ...profile }
    saving.value = false
    useToast().success('Profile updated')
  }

  async function saveNotifications(notifs: UserSettings['notifications']) {
    saving.value = true
    await delay(400)
    settings.value.notifications = { ...notifs }
    saving.value = false
    useToast().success('Notification preferences saved')
  }

  async function savePreferences(prefs: UserSettings['preferences']) {
    saving.value = true
    await delay(400)
    settings.value.preferences = { ...prefs }
    saving.value = false
    useToast().success('Preferences saved')
  }

  async function saveExportSettings(exportSettings: UserSettings['exportSettings']) {
    saving.value = true
    await delay(400)
    settings.value.exportSettings = { ...exportSettings }
    saving.value = false
    useToast().success('Export settings saved')
  }

  async function changePassword(_current: string, _newPassword: string) {
    saving.value = true
    await delay(600)
    saving.value = false
    useToast().success('Password changed successfully')
  }

  function markNotificationRead(id: string) {
    const notif = notifications.value.find((n) => n.id === id)
    if (notif) notif.read = true
  }

  function markAllNotificationsRead() {
    notifications.value.forEach((n) => {
      n.read = true
    })
  }

  return {
    settings,
    notifications,
    loading,
    saving,
    fetchSettings,
    saveProfile,
    saveNotifications,
    savePreferences,
    saveExportSettings,
    changePassword,
    markNotificationRead,
    markAllNotificationsRead,
  }
})
