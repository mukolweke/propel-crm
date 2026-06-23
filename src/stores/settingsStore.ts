import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserSettings, Notification } from '@/types'
import { settingsService } from '@/services/settings.service'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'

const EXPORT_SETTINGS_KEY = 'propel_export_settings'

const defaultSettings: UserSettings = {
  profile: { name: '', email: '', phone: '', agency: '' },
  notifications: {
    emailAlerts: true,
    followUpReminders: true,
    weeklyDigest: false,
    sharedListUpdates: true,
  },
  preferences: {
    defaultView: 'table',
    timezone: 'America/New_York',
    dateFormat: 'MMM D, YYYY',
    accentColor: 'emerald',
  },
  exportSettings: {
    defaultFormat: 'csv',
    includeNotes: true,
    includeInteractions: true,
  },
}

function loadExportSettings(): UserSettings['exportSettings'] {
  try {
    const raw = localStorage.getItem(EXPORT_SETTINGS_KEY)
    if (raw) return { ...defaultSettings.exportSettings, ...JSON.parse(raw) }
  } catch {
    // ignore
  }
  return { ...defaultSettings.exportSettings }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>(structuredClone(defaultSettings))
  const notifications = ref<Notification[]>([])
  const loading = ref(false)
  const saving = ref(false)

  async function fetchSettings() {
    const authStore = useAuthStore()
    if (!authStore.token) return

    loading.value = true
    try {
      const apiSettings = await settingsService.fetchMe(authStore.token)
      settings.value = {
        ...apiSettings,
        exportSettings: loadExportSettings(),
      }
      authStore.syncUser({
        name: apiSettings.profile.name,
        email: apiSettings.profile.email,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings'
      useToast().error('Load failed', message)
    } finally {
      loading.value = false
    }
  }

  async function saveProfile(profile: UserSettings['profile']) {
    const authStore = useAuthStore()
    if (!authStore.token) return

    saving.value = true
    try {
      const updated = await settingsService.updateProfile(authStore.token, {
        fullName: profile.name,
        phone: profile.phone,
        agency: profile.agency,
        notificationSettings: settings.value.notifications,
      })
      settings.value = {
        ...updated,
        exportSettings: settings.value.exportSettings,
      }
      authStore.syncUser({
        name: updated.profile.name,
        email: updated.profile.email,
      })
      useToast().success('Profile updated')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile'
      useToast().error('Save failed', message)
    } finally {
      saving.value = false
    }
  }

  async function saveNotifications(notifs: UserSettings['notifications']) {
    const authStore = useAuthStore()
    if (!authStore.token) return

    saving.value = true
    try {
      const updated = await settingsService.updateProfile(authStore.token, {
        notificationSettings: notifs,
      })
      settings.value.notifications = updated.notifications
      useToast().success('Notification preferences saved')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save notifications'
      useToast().error('Save failed', message)
    } finally {
      saving.value = false
    }
  }

  async function savePreferences(prefs: UserSettings['preferences']) {
    settings.value.preferences = { ...prefs }
    useToast().success('Preferences saved')
  }

  async function saveExportSettings(exportSettings: UserSettings['exportSettings']) {
    settings.value.exportSettings = { ...exportSettings }
    localStorage.setItem(EXPORT_SETTINGS_KEY, JSON.stringify(exportSettings))
    useToast().success('Export settings saved')
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
    markNotificationRead,
    markAllNotificationsRead,
  }
})
