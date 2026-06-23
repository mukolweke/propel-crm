import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { GraphQLContext } from '../../types/index.js'
import { assertAuthenticated, toGraphQLError } from '../../utils/errors.js'
import { assertNotMustChangePassword } from '../../middleware/rbac.js'
import { authService } from '../../modules/auth/auth.service.js'
import { contactService } from '../../modules/contacts/contact.service.js'
import { interactionService } from '../../modules/interactions/interaction.service.js'
import { followUpService } from '../../modules/followups/followup.service.js'
import { reportService } from '../../modules/reports/report.service.js'
import { sharingService } from '../../modules/sharing/sharing.service.js'
import { userService } from '../../modules/users/user.service.js'
import { auditAdminService } from '../../modules/audit/audit.admin.service.js'
import { User } from '../../models/index.js'
import { dateTimeScalar, jsonScalar } from '../types/scalars.js'
import {
  mapUser,
  mapContact,
  mapInteraction,
  mapFollowUp,
  mapSharedAccess,
} from '../types/mappers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const typeDefs = readFileSync(join(__dirname, '../schema/index.graphql'), 'utf-8')

function meta(ctx: GraphQLContext) {
  return { ip: ctx.ip, userAgent: ctx.userAgent }
}

function requireUser(ctx: GraphQLContext) {
  return assertAuthenticated(ctx.user)
}

function requireAppAccess(ctx: GraphQLContext) {
  const user = requireUser(ctx)
  assertNotMustChangePassword(user)
  return user
}

export const resolvers = {
  DateTime: dateTimeScalar,
  JSON: jsonScalar,

  SharedAccess: {
    sharedUser: async (parent: { sharedUserId: string }, _: unknown, ctx: GraphQLContext) => {
      requireAppAccess(ctx)
      const user = await User.findById(parent.sharedUserId)
      return user ? mapUser(user) : null
    },
    contact: async (parent: { contactId: string }, _: unknown, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const contact = await contactService.getContact(user, parent.contactId)
      return mapContact(contact)
    },
  },

  Query: {
    me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) return null
      const user = await authService.getMe(ctx.user.id)
      return mapUser(user)
    },

    myContacts: async (_: unknown, { search }: { search?: string }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const contacts = await contactService.myContacts(user, search)
      return contacts.map(mapContact)
    },

    checkContactDuplicate: async (
      _: unknown,
      {
        phone,
        email,
        excludeContactId,
      }: { phone?: string; email?: string; excludeContactId?: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAppAccess(ctx)
      return contactService.checkDuplicate(user, phone ?? '', email ?? '', excludeContactId)
    },

    contact: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const contact = await contactService.getContact(user, id)
      return mapContact(contact)
    },

    sharedContacts: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const contacts = await sharingService.sharedContactsForUser(user.id)
      return contacts.map(mapContact)
    },

    interactions: async (_: unknown, { contactId }: { contactId?: string }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const items = await interactionService.listInteractions(user, contactId)
      return items.map(mapInteraction)
    },

    interactionHistory: async (_: unknown, { contactId }: { contactId: string }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const items = await interactionService.interactionHistory(user, contactId)
      return items.map(mapInteraction)
    },

    todayFollowUps: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      return (await followUpService.todayFollowUps(user)).map(mapFollowUp)
    },

    overdueFollowUps: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      return (await followUpService.overdueFollowUps(user)).map(mapFollowUp)
    },

    upcomingFollowUps: async (_: unknown, { days }: { days?: number }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      return (await followUpService.upcomingFollowUps(user, days ?? 7)).map(mapFollowUp)
    },

    dailyReport: async (_: unknown, { date }: { date?: string }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      return reportService.dailyReport(user, date, meta(ctx))
    },

    monthlyReport: async (_: unknown, { year, month }: { year?: number; month?: number }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      return reportService.monthlyReport(user, year, month, meta(ctx))
    },

    conversionRate: async (_: unknown, { from, to }: { from?: string; to?: string }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      return reportService.conversionRate(user, from, to)
    },

    sharedUsers: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const shares = await sharingService.sharedUsers(user.id)
      return shares.map(mapSharedAccess)
    },

    adminUsers: async (_: unknown, { page, pageSize }: { page?: number; pageSize?: number }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      return userService.listUsers(user, page ?? 1, pageSize ?? 20)
    },

    adminContacts: async (_: unknown, { page, pageSize }: { page?: number; pageSize?: number }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      return contactService.adminListContacts(user, page ?? 1, pageSize ?? 20)
    },

    auditLogs: async (_: unknown, { filter }: { filter?: unknown }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      return auditAdminService.listLogs(user, filter ?? {})
    },
  },

  Mutation: {
    login: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const result = await authService.login(input, meta(ctx))
      const user = await authService.getMe(result.user.id)
      return {
        user: mapUser(user),
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        mustChangePassword: result.mustChangePassword,
      }
    },

    logout: async (_: unknown, { refreshToken }: { refreshToken?: string }, ctx: GraphQLContext) => {
      const user = requireUser(ctx)
      return authService.logout(user, refreshToken, meta(ctx))
    },

    refreshToken: async (_: unknown, { refreshToken }: { refreshToken: string }) => {
      return authService.refreshToken(refreshToken)
    },

    changePassword: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireUser(ctx)
      const result = await authService.changePassword(user, input, meta(ctx))
      const dbUser = await authService.getMe(result.user.id)
      return {
        user: mapUser(dbUser),
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        mustChangePassword: false,
      }
    },

    requestPasswordReset: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      try {
        return await authService.requestPasswordReset(input, meta(ctx))
      } catch (error) {
        throw toGraphQLError(error)
      }
    },

    resetPassword: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      try {
        return await authService.resetPassword(input, meta(ctx))
      } catch (error) {
        throw toGraphQLError(error)
      }
    },

    updateProfile: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireUser(ctx)
      const updated = await userService.updateProfile(user, input, meta(ctx))
      return mapUser(updated)
    },

    createUser: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const created = await authService.createUser(user, input, meta(ctx))
      return mapUser(created)
    },

    setUserActive: async (
      _: unknown,
      { userId, isActive }: { userId: string; isActive: boolean },
      ctx: GraphQLContext,
    ) => {
      const user = requireAppAccess(ctx)
      const updated = await userService.setUserActive(user, userId, isActive, meta(ctx))
      return mapUser(updated)
    },

    createContact: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const contact = await contactService.createContact(user, input, meta(ctx))
      return mapContact(contact)
    },

    updateContact: async (_: unknown, { id, input }: { id: string; input: unknown }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const contact = await contactService.updateContact(user, id, input, meta(ctx))
      return mapContact(contact)
    },

    deleteContact: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      return contactService.deleteContact(user, id, meta(ctx))
    },

    shareContact: async (
      _: unknown,
      { contactId, sharedUserId, permission }: { contactId: string; sharedUserId: string; permission: 'view' | 'report' | 'edit' },
      ctx: GraphQLContext,
    ) => {
      const user = requireAppAccess(ctx)
      const share = await contactService.shareContact(user, contactId, sharedUserId, permission, meta(ctx))
      return mapSharedAccess(share)
    },

    logInteraction: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const interaction = await interactionService.logInteraction(user, input, meta(ctx))
      return mapInteraction(interaction)
    },

    updateInteraction: async (_: unknown, { id, input }: { id: string; input: unknown }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const interaction = await interactionService.updateInteraction(user, id, input)
      return mapInteraction(interaction)
    },

    createFollowUp: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const followUp = await followUpService.createFollowUp(user, input, meta(ctx))
      return mapFollowUp(followUp)
    },

    completeFollowUp: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const followUp = await followUpService.completeFollowUp(user, id, meta(ctx))
      return mapFollowUp(followUp)
    },

    rescheduleFollowUp: async (_: unknown, { id, scheduledDate }: { id: string; scheduledDate: string }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const followUp = await followUpService.rescheduleFollowUp(user, id, scheduledDate)
      return mapFollowUp(followUp)
    },

    grantAccess: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      const share = await sharingService.grantAccess(user, input, meta(ctx))
      return mapSharedAccess(share)
    },

    revokeAccess: async (_: unknown, { contactId, sharedUserId }: { contactId: string; sharedUserId: string }, ctx: GraphQLContext) => {
      const user = requireAppAccess(ctx)
      return sharingService.revokeAccess(user, contactId, sharedUserId)
    },
  },
}

export function formatError(error: unknown) {
  return toGraphQLError(error)
}

export { typeDefs }
