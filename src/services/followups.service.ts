import type { FollowUp } from '@/types'
import { graphqlRequest } from './graphql'

interface ApiFollowUp {
  id: string
  ownerId: string
  contactId: string
  scheduledDate: string
  status: string
  notes: string
  completedAt: string | null
  createdAt: string
}

const FOLLOW_UP_FIELDS = `
  id
  ownerId
  contactId
  scheduledDate
  status
  notes
  completedAt
  createdAt
`

const FOLLOW_UPS_QUERY = `
  query FollowUps($days: Int) {
    overdueFollowUps {
      ${FOLLOW_UP_FIELDS}
    }
    todayFollowUps {
      ${FOLLOW_UP_FIELDS}
    }
    upcomingFollowUps(days: $days) {
      ${FOLLOW_UP_FIELDS}
    }
  }
`

const COMPLETE_FOLLOW_UP = `
  mutation CompleteFollowUp($id: ID!) {
    completeFollowUp(id: $id) {
      ${FOLLOW_UP_FIELDS}
    }
  }
`

const RESCHEDULE_FOLLOW_UP = `
  mutation RescheduleFollowUp($id: ID!, $scheduledDate: DateTime!) {
    rescheduleFollowUp(id: $id, scheduledDate: $scheduledDate) {
      ${FOLLOW_UP_FIELDS}
    }
  }
`

export function mapApiFollowUp(api: ApiFollowUp, contactName: string): FollowUp {
  return {
    id: api.id,
    contactId: api.contactId,
    contactName,
    dueDate: api.scheduledDate,
    notes: api.notes,
    completed: api.status === 'completed',
    completedAt: api.completedAt,
    ownerId: api.ownerId,
  }
}

function mergeFollowUps(...lists: ApiFollowUp[][]): ApiFollowUp[] {
  const map = new Map<string, ApiFollowUp>()
  for (const list of lists) {
    for (const item of list) {
      map.set(item.id, item)
    }
  }
  return [...map.values()]
}

export const followUpsService = {
  async fetchFollowUps(days = 30): Promise<ApiFollowUp[]> {
    const data = await graphqlRequest<{
      overdueFollowUps: ApiFollowUp[]
      todayFollowUps: ApiFollowUp[]
      upcomingFollowUps: ApiFollowUp[]
    }>(FOLLOW_UPS_QUERY, { days })

    return mergeFollowUps(
      data.overdueFollowUps,
      data.todayFollowUps,
      data.upcomingFollowUps,
    )
  },

  async completeFollowUp(id: string): Promise<ApiFollowUp> {
    const data = await graphqlRequest<{ completeFollowUp: ApiFollowUp }>(COMPLETE_FOLLOW_UP, { id })
    return data.completeFollowUp
  },

  async rescheduleFollowUp(id: string, scheduledDate: string): Promise<ApiFollowUp> {
    const data = await graphqlRequest<{ rescheduleFollowUp: ApiFollowUp }>(
      RESCHEDULE_FOLLOW_UP,
      { id, scheduledDate },
    )
    return data.rescheduleFollowUp
  },
}
