export type ContactStatus =
  | 'new_lead'
  | 'contacted'
  | 'interested'
  | 'follow_up'
  | 'converted'
  | 'lost'

export type InteractionType =
  | 'call'
  | 'whatsapp'
  | 'sms'
  | 'meeting'
  | 'property_viewing'
  | 'physical_visit'

export type SharePermission = 'view_only' | 'view_report' | 'edit'

export interface PropertyType {
  id: string
  name: string
  description: string
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface PropertyTypeFormData {
  name: string
  description: string
  active: boolean
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'agent' | 'admin'
}

export interface Contact {
  id: string
  fullName: string
  phone: string
  email: string
  propertyType: string
  budgetRange: string
  locationPreference: string
  leadSource: string
  notes: string
  status: ContactStatus
  lastInteraction: string | null
  followUpDate: string | null
  converted: boolean
  createdAt: string
  updatedAt: string
  ownerId: string
}

export interface Interaction {
  id: string
  contactId: string
  contactName: string
  type: InteractionType
  notes: string
  outcome: string
  nextFollowUpDate: string | null
  createdAt: string
  ownerId: string
}

export interface FollowUp {
  id: string
  contactId: string
  contactName: string
  dueDate: string
  notes: string
  completed: boolean
  completedAt: string | null
  ownerId: string
}

export interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
  type: 'info' | 'success' | 'warning'
}

export interface SharedList {
  id: string
  name: string
  contactIds: string[]
  sharedWith: SharedUser[]
  ownerId: string
  createdAt: string
}

export interface SharedUser {
  userId: string
  name: string
  email: string
  permission: SharePermission
}

export interface DashboardKpis {
  contactsToday: number
  interactionsToday: number
  pendingFollowUps: number
  convertedClients: number
}

export interface ActivityItem {
  id: string
  type: 'contact' | 'interaction' | 'follow_up' | 'conversion'
  title: string
  description: string
  timestamp: string
  tag?: string
  tagClass?: string
}

export interface ReportMetrics {
  leadsCreated: number
  interactions: number
  conversionRate: number
  followUpCompletion: number
}

export interface ChartDataPoint {
  label: string
  value: number
}

export interface UserSettings {
  profile: {
    name: string
    email: string
    phone: string
    agency: string
  }
  notifications: {
    emailAlerts: boolean
    followUpReminders: boolean
    weeklyDigest: boolean
    sharedListUpdates: boolean
  }
  preferences: {
    defaultView: 'table' | 'grid'
    timezone: string
    dateFormat: string
    accentColor: 'blue' | 'emerald'
  }
  exportSettings: {
    defaultFormat: 'csv' | 'excel' | 'pdf'
    includeNotes: boolean
    includeInteractions: boolean
  }
}

export interface ContactFormData {
  fullName: string
  phone: string
  email: string
  propertyType: string
  budgetRange: string
  locationPreference: string
  leadSource: string
  notes: string
  status: ContactStatus
}

export interface InteractionFormData {
  contactId: string
  type: InteractionType
  notes: string
  outcome: string
  nextFollowUpDate: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ContactFilters {
  search: string
  status: ContactStatus | 'all'
  period: 'all' | 'today' | 'week' | 'converted' | 'pending_follow_up' | 'new_leads'
  sortBy: keyof Contact
  sortOrder: 'asc' | 'desc'
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
}
