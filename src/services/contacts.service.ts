import type { Contact, ContactFormData, ContactStatus } from '@/types'
import { graphqlRequest } from './graphql'

interface ApiContact {
  id: string
  ownerId: string
  fullName: string
  phone: string
  email: string
  propertyInterest: string
  budgetRange: string
  preferredLocation: string
  leadSource: string
  notes: string
  status: string
  lastInteractionDate: string | null
  nextFollowUpDate: string | null
  isConverted: boolean
  createdAt: string
  updatedAt: string
}

const CONTACT_FIELDS = `
  id
  ownerId
  fullName
  phone
  email
  propertyInterest
  budgetRange
  preferredLocation
  leadSource
  notes
  status
  lastInteractionDate
  nextFollowUpDate
  isConverted
  createdAt
  updatedAt
`

const MY_CONTACTS_QUERY = `
  query MyContacts($search: String) {
    myContacts(search: $search) {
      ${CONTACT_FIELDS}
    }
  }
`

const CREATE_CONTACT_MUTATION = `
  mutation CreateContact($input: ContactInput!) {
    createContact(input: $input) {
      ${CONTACT_FIELDS}
    }
  }
`

const UPDATE_CONTACT_MUTATION = `
  mutation UpdateContact($id: ID!, $input: ContactUpdateInput!) {
    updateContact(id: $id, input: $input) {
      ${CONTACT_FIELDS}
    }
  }
`

const DELETE_CONTACT_MUTATION = `
  mutation DeleteContact($id: ID!) {
    deleteContact(id: $id)
  }
`

const STATUS_TO_API: Record<ContactStatus, string> = {
  new_lead: 'new',
  contacted: 'contacted',
  interested: 'interested',
  follow_up: 'follow_up',
  converted: 'converted',
  lost: 'lost',
}

const STATUS_FROM_API: Record<string, ContactStatus> = {
  new: 'new_lead',
  contacted: 'contacted',
  interested: 'interested',
  follow_up: 'follow_up',
  converted: 'converted',
  lost: 'lost',
}

function mapApiContact(c: ApiContact): Contact {
  return {
    id: c.id,
    ownerId: c.ownerId,
    fullName: c.fullName,
    phone: c.phone,
    email: c.email,
    propertyType: c.propertyInterest,
    budgetRange: c.budgetRange,
    locationPreference: c.preferredLocation,
    leadSource: c.leadSource,
    notes: c.notes,
    status: STATUS_FROM_API[c.status] ?? 'new_lead',
    lastInteraction: c.lastInteractionDate,
    followUpDate: c.nextFollowUpDate,
    converted: c.isConverted,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

function toApiInput(data: ContactFormData) {
  return {
    fullName: data.fullName,
    phone: data.phone,
    email: data.email,
    propertyInterest: data.propertyType,
    budgetRange: data.budgetRange,
    preferredLocation: data.locationPreference,
    leadSource: data.leadSource,
    notes: data.notes,
    status: STATUS_TO_API[data.status],
  }
}

export const contactsService = {
  async fetchContacts(search?: string): Promise<Contact[]> {
    const data = await graphqlRequest<{ myContacts: ApiContact[] }>(
      MY_CONTACTS_QUERY,
      { search: search?.trim() || undefined },
    )
    return data.myContacts.map(mapApiContact)
  },

  async createContact(form: ContactFormData): Promise<Contact> {
    const data = await graphqlRequest<{ createContact: ApiContact }>(
      CREATE_CONTACT_MUTATION,
      { input: toApiInput(form) },
    )
    return mapApiContact(data.createContact)
  },

  async updateContact(id: string, form: ContactFormData): Promise<Contact> {
    const data = await graphqlRequest<{ updateContact: ApiContact }>(
      UPDATE_CONTACT_MUTATION,
      { id, input: toApiInput(form) },
    )
    return mapApiContact(data.updateContact)
  },

  async deleteContact(id: string): Promise<void> {
    await graphqlRequest<{ deleteContact: boolean }>(DELETE_CONTACT_MUTATION, { id })
  },
}
