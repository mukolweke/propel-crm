import type { Interaction, InteractionFormData } from '@/types'
import { graphqlRequest } from './graphql'

interface ApiInteraction {
  id: string
  contactId: string
  ownerId: string
  interactionType: string
  notes: string
  outcome: string
  nextFollowUpDate: string | null
  createdAt: string
}

const INTERACTION_FIELDS = `
  id
  contactId
  ownerId
  interactionType
  notes
  outcome
  nextFollowUpDate
  createdAt
`

const INTERACTIONS_QUERY = `
  query Interactions {
    interactions {
      ${INTERACTION_FIELDS}
    }
  }
`

const LOG_INTERACTION_MUTATION = `
  mutation LogInteraction($input: InteractionInput!) {
    logInteraction(input: $input) {
      ${INTERACTION_FIELDS}
    }
  }
`

export function mapApiInteraction(api: ApiInteraction, contactName: string): Interaction {
  return {
    id: api.id,
    contactId: api.contactId,
    contactName,
    type: api.interactionType as Interaction['type'],
    notes: api.notes,
    outcome: api.outcome,
    nextFollowUpDate: api.nextFollowUpDate,
    createdAt: api.createdAt,
    ownerId: api.ownerId,
  }
}

function toApiInput(data: InteractionFormData) {
  const input: Record<string, unknown> = {
    contactId: data.contactId,
    interactionType: data.type,
    notes: data.notes ?? '',
    outcome: data.outcome ?? '',
  }

  const followUp = data.nextFollowUpDate?.trim()
  if (followUp) {
    input.nextFollowUpDate = followUp
  }

  return input
}

export const interactionsService = {
  async fetchInteractions(): Promise<ApiInteraction[]> {
    const data = await graphqlRequest<{ interactions: ApiInteraction[] }>(INTERACTIONS_QUERY)
    return data.interactions
  },

  async logInteraction(form: InteractionFormData): Promise<ApiInteraction> {
    const data = await graphqlRequest<{ logInteraction: ApiInteraction }>(
      LOG_INTERACTION_MUTATION,
      { input: toApiInput(form) },
    )
    return data.logInteraction
  },
}
