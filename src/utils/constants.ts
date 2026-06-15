import type { ContactStatus, InteractionType } from '@/types'

export const CONTACT_STATUSES: { value: ContactStatus; label: string; color: string }[] = [
  { value: 'new_lead', label: 'New', color: 'bg-slate-100 text-slate-600' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-50 text-blue-700' },
  { value: 'interested', label: 'Interested', color: 'bg-emerald-50 text-emerald-700' },
  { value: 'follow_up', label: 'Follow Up', color: 'bg-red-50 text-red-600' },
  { value: 'converted', label: 'Converted', color: 'bg-purple-50 text-purple-700' },
  { value: 'lost', label: 'Lost', color: 'bg-slate-100 text-slate-500' },
]

export const INTERACTION_TYPES: { value: InteractionType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'property_viewing', label: 'Viewing' },
  { value: 'physical_visit', label: 'Visit' },
]

export const BUDGET_RANGES = [
  'Under $500k',
  '$500k - $750k',
  '$750k - $1M',
  '$1M - $2M',
  'Over $2M',
]

export const LEAD_SOURCES = [
  'Zillow',
  'Referral',
  'Open House',
  'Web Form',
  'Social Media',
  'Cold Call',
  'Walk-in',
]

export const NAV_ITEMS = [
  { name: 'Dashboard', to: '/dashboard', icon: 'HomeIcon' },
  { name: 'Contacts', to: '/contacts', icon: 'UsersIcon' },
  { name: 'Log Activity', to: '/interactions', icon: 'PencilSquareIcon' },
  { name: 'Reports', to: '/reports', icon: 'ChartBarIcon' },
  { name: 'Sharing', to: '/shared-lists', icon: 'ShareIcon' },
  { name: 'Settings', to: '/settings', icon: 'Cog6ToothIcon' },
] as const

export const MOBILE_NAV_ITEMS = [
  { name: 'Home', to: '/dashboard', icon: 'HomeIcon' },
  { name: 'Contacts', to: '/contacts', icon: 'UsersIcon' },
  { name: 'Log', to: '/interactions', icon: 'PlusCircleIcon' },
  { name: 'Reports', to: '/reports', icon: 'ChartBarIcon' },
  { name: 'More', to: '/settings', icon: 'EllipsisHorizontalIcon' },
] as const

export function getStatusLabel(status: ContactStatus): string {
  return CONTACT_STATUSES.find((s) => s.value === status)?.label ?? status
}

export function getStatusColor(status: ContactStatus): string {
  return CONTACT_STATUSES.find((s) => s.value === status)?.color ?? 'bg-slate-100 text-slate-600'
}

export function getInteractionLabel(type: InteractionType): string {
  return INTERACTION_TYPES.find((t) => t.value === type)?.label ?? type
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-pink-100 text-pink-700',
  'bg-emerald-100 text-emerald-700',
  'bg-slate-200 text-slate-600',
  'bg-amber-100 text-amber-700',
  'bg-indigo-100 text-indigo-700',
]

export function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}
