<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import PasswordRequirements from '@/components/ui/PasswordRequirements.vue'
import { isPasswordValid } from '@/utils/password'
import { getInitials } from '@/utils/constants'
import {
  BellAlertIcon,
  ShieldCheckIcon,
  CircleStackIcon,
  BuildingOffice2Icon,
  ChevronRightIcon,
} from '@heroicons/vue/24/outline'

const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const toast = useToast()

const passwordForm = reactive({
  current: '',
  newPassword: '',
  confirm: '',
})

const profile = reactive({
  firstName: '',
  lastName: '',
  email: '',
})

const displayName = computed(
  () => `${profile.firstName} ${profile.lastName}`.trim() || authStore.user?.name || '',
)

const avatarInitials = computed(() => getInitials(displayName.value || 'User'))

function applyProfileFromStore() {
  const name = settingsStore.settings.profile.name || authStore.user?.name || ''
  const parts = name.trim().split(/\s+/)
  profile.firstName = parts[0] ?? ''
  profile.lastName = parts.slice(1).join(' ')
  profile.email = settingsStore.settings.profile.email || authStore.user?.email || ''
}

onMounted(async () => {
  await settingsStore.fetchSettings()
  applyProfileFromStore()
})

async function saveAll() {
  await settingsStore.saveProfile({
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    email: profile.email,
    phone: settingsStore.settings.profile.phone,
    agency: settingsStore.settings.profile.agency,
  })
  applyProfileFromStore()
}

async function changePassword() {
  if (!passwordForm.current) {
    toast.error('Required', 'Enter your current password')
    return
  }
  if (!isPasswordValid(passwordForm.newPassword)) {
    toast.error('Weak password', 'New password does not meet requirements')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirm) {
    toast.error('Mismatch', 'New password and confirmation do not match')
    return
  }
  const ok = await authStore.changePassword(passwordForm.current, passwordForm.newPassword)
  if (ok) {
    passwordForm.current = ''
    passwordForm.newPassword = ''
    passwordForm.confirm = ''
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="font-display text-3xl text-slate-900">Account Settings</h1>
        <p class="mt-2 text-sm text-slate-500">Manage your profile information and platform preferences.</p>
      </div>
      <BaseButton :loading="settingsStore.saving" @click="saveAll">Save Changes</BaseButton>
    </div>

    <SkeletonLoader v-if="settingsStore.loading" :rows="6" />

    <template v-else>
      <div class="grid gap-6 lg:grid-cols-2">
        <BaseCard>
          <h2 class="mb-5 font-display text-lg text-slate-900">Public Profile</h2>
          <div class="mb-6 flex items-center gap-4">
            <div class="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-100 text-xl font-semibold text-brand-800">
              {{ avatarInitials }}
            </div>
            <div>
              <p class="font-medium text-slate-900">{{ displayName || 'Your profile' }}</p>
              <p class="text-sm text-slate-500">Update your photo and personal details</p>
              <button class="mt-1 text-sm font-medium text-brand-600">Remove photo</button>
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <BaseInput v-model="profile.firstName" label="First Name" variant="filled" />
            <BaseInput v-model="profile.lastName" label="Last Name" variant="filled" />
            <BaseInput v-model="profile.email" label="Email Address" type="email" variant="filled" disabled />
            <BaseInput v-model="settingsStore.settings.profile.phone" label="Phone" variant="filled" />
            <BaseInput v-model="settingsStore.settings.profile.agency" label="Agency" variant="filled" />
          </div>
        </BaseCard>

        <BaseCard>
          <div class="mb-5 flex items-center gap-2">
            <BellAlertIcon class="h-5 w-5 text-brand-700" />
            <h2 class="font-display text-lg text-slate-900">Notifications</h2>
          </div>
          <div class="space-y-4">
            <label class="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-4">
              <div>
                <p class="text-sm font-medium text-slate-900">New Lead Alerts</p>
                <p class="text-xs text-slate-500">Immediate mobile push</p>
              </div>
              <input v-model="settingsStore.settings.notifications.emailAlerts" type="checkbox" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            </label>
            <label class="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-4">
              <div>
                <p class="text-sm font-medium text-slate-900">Daily Digest</p>
                <p class="text-xs text-slate-500">Morning email summary</p>
              </div>
              <input v-model="settingsStore.settings.notifications.weeklyDigest" type="checkbox" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            </label>
            <label class="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-4">
              <div>
                <p class="text-sm font-medium text-slate-900">Contract Signings</p>
                <p class="text-xs text-slate-500">SMS notifications</p>
              </div>
              <input v-model="settingsStore.settings.notifications.followUpReminders" type="checkbox" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            </label>
          </div>
        </BaseCard>

        <BaseCard>
          <div class="mb-5 flex items-center gap-2">
            <ShieldCheckIcon class="h-5 w-5 text-brand-700" />
            <h2 class="font-display text-lg text-slate-900">Security</h2>
          </div>
          <div class="grid gap-4">
            <BaseInput v-model="passwordForm.current" label="Current Password" type="password" variant="filled" autocomplete="current-password" />
            <BaseInput v-model="passwordForm.newPassword" label="New Password" type="password" variant="filled" autocomplete="new-password" />
            <PasswordRequirements :password="passwordForm.newPassword" />
            <BaseInput v-model="passwordForm.confirm" label="Confirm New" type="password" variant="filled" autocomplete="new-password" />
          </div>
          <BaseButton class="mt-4" variant="secondary" :loading="authStore.loading" @click="changePassword">
            Update Password
          </BaseButton>
        </BaseCard>

        <BaseCard>
          <div class="mb-5 flex items-center gap-2">
            <CircleStackIcon class="h-5 w-5 text-brand-700" />
            <h2 class="font-display text-lg text-slate-900">Export Preferences</h2>
          </div>
          <BaseSelect
            v-model="settingsStore.settings.exportSettings.defaultFormat"
            label="Default Export Format"
            :options="[
              { value: 'csv', label: 'CSV Spreadsheet (.csv)' },
              { value: 'excel', label: 'Excel Workbook (.xlsx)' },
              { value: 'pdf', label: 'PDF Document (.pdf)' },
            ]"
            variant="filled"
          />
          <div class="mt-5 rounded-xl border border-slate-200 bg-mint p-4">
            <p class="text-sm font-medium text-slate-900">Request Full Backup</p>
            <p class="mt-1 text-xs text-slate-500">Download all contact and deal history</p>
            <BaseButton class="mt-3" variant="outline" size="sm">Request</BaseButton>
          </div>
        </BaseCard>

        <BaseCard class="sm:col-span-2">
          <div class="mb-5 flex items-center gap-2">
            <BuildingOffice2Icon class="h-5 w-5 text-brand-700" />
            <h2 class="font-display text-lg text-slate-900">CRM Configuration</h2>
          </div>
          <router-link
            to="/settings/property-types"
            class="flex items-center justify-between rounded-xl border border-slate-200 bg-mint px-4 py-4 transition-colors hover:border-brand-200 hover:bg-white"
          >
            <div>
              <p class="font-medium text-slate-900">Property Types</p>
              <p class="mt-1 text-sm text-slate-500">Manage categories for Property Type Interest</p>
            </div>
            <ChevronRightIcon class="h-5 w-5 text-slate-400" />
          </router-link>
        </BaseCard>
      </div>
    </template>
  </div>
</template>
