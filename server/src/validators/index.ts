import { z } from 'zod'
import { AppError } from '../utils/errors.js'
import { passwordSchema } from '../utils/password.js'
import { sanitizeString } from '../utils/sanitize.js'
import { normalizeEmail } from '../utils/normalize.js'
import { objectIdSchema } from '../utils/objectId.js'

const emailSchema = z
  .string({ required_error: 'Email is required' })
  .email('Enter a valid email address')
  .max(254)
  .transform((v) => v.toLowerCase().trim())
const phoneSchema = z.string().max(30).optional().transform((v) => (v ? sanitizeString(v, 30) : ''))

/** GraphQL DateTime scalars arrive as Date objects — normalize to ISO strings. */
function normalizeDateTimeInput(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(`${trimmed}T00:00:00.000Z`).toISOString()
    }
    return trimmed
  }
  return undefined
}

const optionalDateTimeInputSchema = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v): string | null | undefined => {
    if (v === undefined) return undefined
    return normalizeDateTimeInput(v) ?? null
  })

const requiredDateTimeInputSchema = z
  .union([z.string(), z.date()])
  .transform((v): string => {
    const normalized = normalizeDateTimeInput(v)
    if (!normalized) {
      throw new Error('Invalid date')
    }
    return normalized
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  remember: z.boolean().optional().default(false),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
})

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .regex(/^\d{6}$/, 'Reset code must be 6 digits'),
  newPassword: passwordSchema,
})

export const createUserSchema = z
  .object({
    fullName: z.string().min(2).max(100).transform((v) => sanitizeString(v, 100)),
    email: emailSchema,
    password: passwordSchema,
    role: z.string().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.role !== undefined && data.role !== 'user') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown role: ${data.role}`,
        path: ['role'],
      })
    }
  })
  .transform((data) => ({
    fullName: data.fullName,
    email: data.email,
    password: data.password,
    role: 'user' as const,
  }))

const notificationSettingsInputSchema = z.object({
  emailAlerts: z.boolean().optional(),
  followUpReminders: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  sharedListUpdates: z.boolean().optional(),
})

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).transform((v) => sanitizeString(v, 100)).optional(),
  phone: phoneSchema,
  agency: z.string().max(100).optional().transform((v) => sanitizeString(v ?? '', 100)),
  notificationSettings: notificationSettingsInputSchema.optional(),
})

export const contactInputSchema = z.object({
  fullName: z.string().min(1).max(150).transform((v) => sanitizeString(v, 150)),
  phone: phoneSchema,
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(''))
    .transform((v) => normalizeEmail(v || '')),
  propertyInterest: z.string().max(100).optional().transform((v) => sanitizeString(v ?? '', 100)),
  budgetRange: z.string().max(50).optional().transform((v) => sanitizeString(v ?? '', 50)),
  preferredLocation: z.string().max(150).optional().transform((v) => sanitizeString(v ?? '', 150)),
  leadSource: z.string().max(100).optional().transform((v) => sanitizeString(v ?? '', 100)),
  notes: z.string().max(5000).optional().transform((v) => sanitizeString(v ?? '', 5000)),
  status: z
    .enum(['new', 'contacted', 'interested', 'follow_up', 'converted', 'lost'])
    .optional(),
  nextFollowUpDate: optionalDateTimeInputSchema,
})

export const contactUpdateSchema = contactInputSchema.partial()

export const interactionInputSchema = z.object({
  contactId: objectIdSchema,
  interactionType: z.enum([
    'call', 'whatsapp', 'sms', 'meeting', 'property_viewing', 'physical_visit',
  ]),
  notes: z.string().max(5000).optional().transform((v) => sanitizeString(v ?? '', 5000)),
  outcome: z.string().max(500).optional().transform((v) => sanitizeString(v ?? '', 500)),
  nextFollowUpDate: optionalDateTimeInputSchema,
})

export const interactionUpdateSchema = interactionInputSchema.omit({ contactId: true }).partial()

export const followUpInputSchema = z.object({
  contactId: objectIdSchema,
  scheduledDate: requiredDateTimeInputSchema,
  notes: z.string().max(2000).optional().transform((v) => sanitizeString(v ?? '', 2000)),
})

export const shareInputSchema = z.object({
  contactId: objectIdSchema,
  sharedUserId: objectIdSchema,
  permission: z.enum(['view', 'report', 'edit']),
})

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .optional()

export const exportContactsSchema = z.object({
  search: z.string().max(200).optional().transform((v) => (v ? sanitizeString(v, 200) : undefined)),
  dateFrom: dateOnlySchema,
  dateTo: dateOnlySchema,
})

export const exportReportSchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf']),
  period: z.enum(['daily', 'monthly']),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateFrom must be YYYY-MM-DD'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateTo must be YYYY-MM-DD'),
})

export const auditLogFilterSchema = z.object({
  action: z.string().optional(),
  entityType: z.string().optional(),
  performedBy: objectIdSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
})

export function parseInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join('; ')
    throw new AppError(message, 'VALIDATION_ERROR', 400)
  }
  return result.data
}
