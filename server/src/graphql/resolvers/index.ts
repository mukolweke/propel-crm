import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { GraphQLContext } from '../../types/index.js'
import { assertAuthenticated } from '../../utils/errors.js'
import { toGraphQLError } from '../../utils/errors.js'
import { authService } from '../../modules/auth/auth.service.js'
import { contactService } from '../../modules/contacts/contact.service.js'
import { interactionService } from '../../modules/interactions/interaction.service.js'
import { followUpService } from '../../modules/followups/followup.service.js'
import { reportService } from '../../modules/reports/report.service.js'
import { sharingService } from '../../modules/sharing/sharing.service.js'
import { User, Contact } from '../../models/index.js'
import { dateTimeScalar } from '../types/scalars.js'
import {
  mapUser,
  mapContact,
  mapInteraction,
  mapFollowUp,
  mapSharedAccess,
} from '../types/mappers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const typeDefs = readFileSync(join(__dirname, '../schema/index.graphql'), 'utf-8')

function authUser(context: GraphQLContext) {
  return assertAuthenticated(context.user)
}

async function resolveUser(id: string) {
  const user = await User.findById(id)
  return user ? mapUser(user) : null
}

export const resolvers = {
  DateTime: dateTimeScalar,

  User: {
    id: (parent: { id?: string; _id?: { toString(): string } }) =>
      parent.id ?? parent._id?.toString(),
  },

  Contact: {
    id: (parent: { id?: string; _id?: { toString(): string } }) =>
      parent.id ?? parent._id?.toString(),
  },

  SharedAccess: {
    sharedUser: async (parent: { sharedUserId: string }) => resolveUser(parent.sharedUserId),
    contact: async (parent: { contactId: string }) => {
      const contact = await Contact.findById(parent.contactId)
      return contact ? mapContact(contact) : null
    },
  },

  Query: {
    me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) return null
      const user = await authService.getMe(ctx.user.id)
      return mapUser(user)
    },

    myContacts: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const contacts = await contactService.myContacts(user.id)
      return contacts.map(mapContact)
    },

    contact: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const contact = await contactService.getContact(user.id, id)
      return mapContact(contact)
    },

    sharedContacts: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const contacts = await sharingService.sharedContactsForUser(user.id)
      return contacts.map(mapContact)
    },

    interactions: async (
      _: unknown,
      { contactId }: { contactId?: string },
      ctx: GraphQLContext,
    ) => {
      const user = authUser(ctx)
      const items = await interactionService.listInteractions(user.id, contactId)
      return items.map(mapInteraction)
    },

    interactionHistory: async (_: unknown, { contactId }: { contactId: string }, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const items = await interactionService.interactionHistory(user.id, contactId)
      return items.map(mapInteraction)
    },

    todayFollowUps: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const items = await followUpService.todayFollowUps(user.id)
      return items.map(mapFollowUp)
    },

    overdueFollowUps: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const items = await followUpService.overdueFollowUps(user.id)
      return items.map(mapFollowUp)
    },

    upcomingFollowUps: async (_: unknown, { days }: { days?: number }, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const items = await followUpService.upcomingFollowUps(user.id, days ?? 7)
      return items.map(mapFollowUp)
    },

    dailyReport: async (_: unknown, { date }: { date?: string }, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      return reportService.dailyReport(user.id, date)
    },

    monthlyReport: async (
      _: unknown,
      { year, month }: { year?: number; month?: number },
      ctx: GraphQLContext,
    ) => {
      const user = authUser(ctx)
      return reportService.monthlyReport(user.id, year, month)
    },

    conversionRate: async (
      _: unknown,
      { from, to }: { from?: string; to?: string },
      ctx: GraphQLContext,
    ) => {
      const user = authUser(ctx)
      return reportService.conversionRate(user.id, from, to)
    },

    sharedUsers: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const shares = await sharingService.sharedUsers(user.id)
      return shares.map(mapSharedAccess)
    },
  },

  Mutation: {
    register: async (_: unknown, { input }: { input: unknown }) => {
      const result = await authService.register(input)
      const user = await authService.getMe(result.user.id)
      return {
        user: mapUser(user),
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      }
    },

    login: async (_: unknown, { input }: { input: unknown }) => {
      const result = await authService.login(input)
      const user = await authService.getMe(result.user.id)
      return {
        user: mapUser(user),
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      }
    },

    refreshToken: async (_: unknown, { refreshToken }: { refreshToken: string }) => {
      const tokens = await authService.refreshToken(refreshToken)
      return tokens
    },

    createContact: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const contact = await contactService.createContact(user.id, input)
      return mapContact(contact)
    },

    updateContact: async (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      ctx: GraphQLContext,
    ) => {
      const user = authUser(ctx)
      const contact = await contactService.updateContact(user.id, id, input)
      return mapContact(contact)
    },

    deleteContact: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      return contactService.deleteContact(user.id, id)
    },

    shareContact: async (
      _: unknown,
      {
        contactId,
        sharedUserId,
        permission,
      }: { contactId: string; sharedUserId: string; permission: 'view' | 'report' | 'edit' },
      ctx: GraphQLContext,
    ) => {
      const user = authUser(ctx)
      const share = await contactService.shareContact(user.id, contactId, sharedUserId, permission)
      return mapSharedAccess(share)
    },

    logInteraction: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const interaction = await interactionService.logInteraction(user.id, input)
      return mapInteraction(interaction)
    },

    updateInteraction: async (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      ctx: GraphQLContext,
    ) => {
      const user = authUser(ctx)
      const interaction = await interactionService.updateInteraction(user.id, id, input)
      return mapInteraction(interaction)
    },

    createFollowUp: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const followUp = await followUpService.createFollowUp(user.id, input)
      return mapFollowUp(followUp)
    },

    completeFollowUp: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const followUp = await followUpService.completeFollowUp(user.id, id)
      return mapFollowUp(followUp)
    },

    rescheduleFollowUp: async (
      _: unknown,
      { id, scheduledDate }: { id: string; scheduledDate: string },
      ctx: GraphQLContext,
    ) => {
      const user = authUser(ctx)
      const followUp = await followUpService.rescheduleFollowUp(user.id, id, scheduledDate)
      return mapFollowUp(followUp)
    },

    grantAccess: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = authUser(ctx)
      const share = await sharingService.grantAccess(user.id, input)
      return mapSharedAccess(share)
    },

    revokeAccess: async (
      _: unknown,
      { contactId, sharedUserId }: { contactId: string; sharedUserId: string },
      ctx: GraphQLContext,
    ) => {
      const user = authUser(ctx)
      return sharingService.revokeAccess(user.id, contactId, sharedUserId)
    },
  },
}

export function formatError(error: { message: string; extensions?: Record<string, unknown> }) {
  return toGraphQLError(error)
}

export { typeDefs }
