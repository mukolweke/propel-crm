import type {
  ActivityItem,
  ChartDataPoint,
  Contact,
  FollowUp,
  Interaction,
  Notification,
  ReportMetrics,
  SharedList,
  User,
  UserSettings,
} from '@/types'
import generated from './generated-data.json'

export const mockUser: User = {
  id: 'user-001',
  name: 'Alexander Sterling',
  email: 'alex.sterling@propelcrm.com',
  role: 'user',
}

export const mockUsers: User[] = [
  mockUser,
  { id: 'user-002', name: 'Sarah Connor', email: 'sarah.connor@propelcrm.com', role: 'user' },
  { id: 'user-003', name: 'Marcus Wright', email: 'marcus.wright@propelcrm.com', role: 'user' },
  { id: 'user-004', name: 'Elena Gilbert', email: 'elena.gilbert@propelcrm.com', role: 'super_admin' },
]

export const mockContacts: Contact[] = generated.contacts as Contact[]
export const mockInteractions: Interaction[] = generated.interactions as Interaction[]
export const mockFollowUps: FollowUp[] = generated.followUps as FollowUp[]

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Follow-up due today',
    message: 'Sarah Johnson has a follow-up scheduled for today.',
    read: false,
    createdAt: new Date().toISOString(),
    type: 'warning',
  },
  {
    id: 'notif-2',
    title: 'New shared list',
    message: 'Jordan Lee shared "Q2 Hot Leads" with you.',
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    type: 'info',
  },
  {
    id: 'notif-3',
    title: 'Client converted',
    message: 'Michael Williams marked as converted.',
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    type: 'success',
  },
]

export const mockSharedLists: SharedList[] = [
  {
    id: 'shared-1',
    name: 'Premium Buyers',
    contactIds: ['contact-001', 'contact-006', 'contact-011'],
    sharedWith: [
      { userId: 'user-002', name: 'Sarah Connor', email: 'sarah.connor@propelcrm.com', permission: 'view_report' },
    ],
    ownerId: 'user-001',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'shared-2',
    name: 'Open House Leads',
    contactIds: ['contact-003', 'contact-008', 'contact-015', 'contact-020'],
    sharedWith: [
      { userId: 'user-003', name: 'Marcus Wright', email: 'marcus.wright@propelcrm.com', permission: 'view_only' },
      { userId: 'user-004', name: 'Elena Gilbert', email: 'elena.gilbert@propelcrm.com', permission: 'edit' },
    ],
    ownerId: 'user-001',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
]

export const mockActivity: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'contact',
    title: 'John Doe was contacted via phone',
    description: '2 hours ago • Call Logged',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    tag: 'COLD CALL',
    tagClass: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'act-2',
    type: 'follow_up',
    title: 'Mary Jane follow-up task completed',
    description: '4 hours ago • Task Management',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    tag: 'FOLLOW-UP',
    tagClass: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'act-3',
    type: 'interaction',
    title: 'Property viewing with Mr. Smith',
    description: 'Yesterday • 14:00 PM',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    tag: 'VIEWING',
    tagClass: 'bg-red-50 text-red-600',
  },
  {
    id: 'act-4',
    type: 'conversion',
    title: 'New email inquiry from Sarah Lee',
    description: 'Yesterday • 18:45 PM',
    timestamp: new Date(Date.now() - 90000000).toISOString(),
    tag: 'LEAD GEN',
    tagClass: 'bg-emerald-50 text-emerald-700',
  },
]

export const mockDailyChart: ChartDataPoint[] = [
  { label: 'Mon', value: 8 },
  { label: 'Tue', value: 12 },
  { label: 'Wed', value: 6 },
  { label: 'Thu', value: 15 },
  { label: 'Fri', value: 11 },
  { label: 'Sat', value: 4 },
  { label: 'Sun', value: 2 },
]

export const mockWeeklyConversions: ChartDataPoint[] = [
  { label: 'W1', value: 2 },
  { label: 'W2', value: 4 },
  { label: 'W3', value: 3 },
  { label: 'W4', value: 6 },
]

export const mockMonthlyPerformance: ChartDataPoint[] = [
  { label: 'Jan', value: 12 },
  { label: 'Feb', value: 18 },
  { label: 'Mar', value: 15 },
  { label: 'Apr', value: 22 },
  { label: 'May', value: 19 },
  { label: 'Jun', value: 25 },
]

export const mockDailyReport: ReportMetrics = {
  leadsCreated: 5,
  interactions: 18,
  conversionRate: 12.5,
  followUpCompletion: 78,
}

export const mockWeeklyReport: ReportMetrics = {
  leadsCreated: 28,
  interactions: 94,
  conversionRate: 14.2,
  followUpCompletion: 82,
}

export const mockMonthlyReport: ReportMetrics = {
  leadsCreated: 112,
  interactions: 387,
  conversionRate: 16.8,
  followUpCompletion: 85,
}

export const mockLeadsGrowth: ChartDataPoint[] = [
  { label: 'Week 1', value: 22 },
  { label: 'Week 2', value: 28 },
  { label: 'Week 3', value: 25 },
  { label: 'Week 4', value: 37 },
]

export const mockConversionTrend: ChartDataPoint[] = [
  { label: 'Week 1', value: 3 },
  { label: 'Week 2', value: 5 },
  { label: 'Week 3', value: 4 },
  { label: 'Week 4', value: 8 },
]

export const defaultSettings: UserSettings = {
  profile: {
    name: 'Alexander Sterling',
    email: 'alex.sterling@propelcrm.com',
    phone: '+1 (555) 123-4567',
    agency: 'Propel Realty Group',
  },
  notifications: {
    emailAlerts: true,
    followUpReminders: true,
    weeklyDigest: true,
    sharedListUpdates: false,
  },
  preferences: {
    defaultView: 'table',
    timezone: 'America/New_York',
    dateFormat: 'MMM D, YYYY',
    accentColor: 'blue',
  },
  exportSettings: {
    defaultFormat: 'csv',
    includeNotes: true,
    includeInteractions: false,
  },
}
