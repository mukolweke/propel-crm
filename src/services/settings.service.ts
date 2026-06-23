import type { UserSettings } from '@/types'
import { graphqlRequest } from './graphql'

interface MeUser {
  id: string
  fullName: string
  email: string
  phone: string
  agency: string
  notificationSettings: UserSettings['notifications']
}

interface MeResult {
  me: MeUser | null
}

interface UpdateProfileResult {
  updateProfile: MeUser
}

const ME_QUERY = `
  query Me {
    me {
      id
      fullName
      email
      phone
      agency
      notificationSettings {
        emailAlerts
        followUpReminders
        weeklyDigest
        sharedListUpdates
      }
    }
  }
`

const UPDATE_PROFILE_MUTATION = `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      fullName
      email
      phone
      agency
      notificationSettings {
        emailAlerts
        followUpReminders
        weeklyDigest
        sharedListUpdates
      }
    }
  }
`

function mapMeToSettings(user: MeUser): UserSettings {
  return {
    profile: {
      name: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
      agency: user.agency ?? '',
    },
    notifications: { ...user.notificationSettings },
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
}

export const settingsService = {
  async fetchMe(token: string): Promise<UserSettings> {
    const data = await graphqlRequest<MeResult>(ME_QUERY, undefined, token)
    if (!data.me) throw new Error('Not authenticated')
    return mapMeToSettings(data.me)
  },

  async updateProfile(
    token: string,
    input: {
      fullName?: string
      phone?: string
      agency?: string
      notificationSettings?: UserSettings['notifications']
    },
  ): Promise<UserSettings> {
    const data = await graphqlRequest<UpdateProfileResult>(
      UPDATE_PROFILE_MUTATION,
      { input },
      token,
    )
    return mapMeToSettings(data.updateProfile)
  },
}
