export type UserRole = 'agent' | 'manager'

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
}

export interface GraphQLContext {
  user: AuthUser | null
  ip?: string
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
