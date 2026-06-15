import { z } from 'zod'

export const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum(['agent', 'manager']).optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const contactInputSchema = z.object({
  fullName: z.string().min(1).max(150),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  propertyInterest: z.string().max(100).optional(),
  budgetRange: z.string().max(50).optional(),
  preferredLocation: z.string().max(150).optional(),
  leadSource: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  status: z
    .enum(['new', 'contacted', 'interested', 'follow_up', 'converted', 'lost'])
    .optional(),
  nextFollowUpDate: z.string().optional().nullable(),
})

export const contactUpdateSchema = contactInputSchema.partial()

export const interactionInputSchema = z.object({
  contactId: z.string().min(1),
  interactionType: z.enum([
    'call',
    'whatsapp',
    'sms',
    'meeting',
    'property_viewing',
    'physical_visit',
  ]),
  notes: z.string().max(5000).optional(),
  outcome: z.string().max(500).optional(),
  nextFollowUpDate: z.string().optional().nullable(),
})

export const interactionUpdateSchema = interactionInputSchema.omit({ contactId: true }).partial()

export const followUpInputSchema = z.object({
  contactId: z.string().min(1),
  scheduledDate: z.string().min(1),
  notes: z.string().max(2000).optional(),
})

export const shareInputSchema = z.object({
  contactId: z.string().min(1),
  sharedUserId: z.string().min(1),
  permission: z.enum(['view', 'report', 'edit']),
})

export function parseInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}
