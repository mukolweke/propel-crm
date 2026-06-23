export type UserRole = 'super_admin' | 'user'

export type ContactStatus =
  | 'new'
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

export type FollowUpStatus = 'pending' | 'completed' | 'overdue'

export type SharePermission = 'view' | 'report' | 'edit'

export type AuditAction =
  | 'CONTACT_CREATED'
  | 'CONTACT_UPDATED'
  | 'CONTACT_DELETED'
  | 'CONTACT_SHARED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'FAILED_LOGIN'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET'
  | 'FOLLOWUP_CREATED'
  | 'FOLLOWUP_COMPLETED'
  | 'INTERACTION_CREATED'
  | 'EXPORT_GENERATED'
  | 'USER_CREATED'
  | 'USER_DEACTIVATED'
  | 'USER_ACTIVATED'
  | 'PROFILE_UPDATED'
  | 'CONTACT_DUPLICATE_ATTEMPT'

export type AuditEntityType = 'USER' | 'CONTACT' | 'FOLLOWUP' | 'INTERACTION' | 'AUTH' | 'REPORT'

export interface NotificationSettings {
  emailAlerts: boolean
  followUpReminders: boolean
  weeklyDigest: boolean
  sharedListUpdates: boolean
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  mustChangePassword: boolean
}

export interface GraphQLContext {
  user: AuthUser | null
  ip?: string
  userAgent?: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface DailyReport {
  contactsAdded: number
  interactionsCompleted: number
  convertedClients: number
  followUpsCompleted: number
  date: string
}

export interface MonthlyReport {
  totalContacts: number
  totalInteractions: number
  conversionPercentage: number
  activeFollowUps: number
  month: string
  year: number
}

export interface ConversionRateReport {
  rate: number
  converted: number
  total: number
  periodStart: string
  periodEnd: string
}

export interface PaginationInput {
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
