import { Types } from 'mongoose'
import { escapeRegex } from '../../utils/normalize.js'
import { auditLogFilterSchema } from '../../validators/index.js'
import type { z } from 'zod'

type AuditLogFilter = z.infer<typeof auditLogFilterSchema>

function partialRegex(value: string): RegExp {
  return new RegExp(escapeRegex(value), 'i')
}

export function buildAuditLogQuery(data: AuditLogFilter): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = []

  if (data.action) {
    conditions.push({ action: partialRegex(data.action) })
  }

  if (data.entityType) {
    conditions.push({ entityType: partialRegex(data.entityType) })
  }

  if (data.performedBy) {
    conditions.push({ performedBy: new Types.ObjectId(data.performedBy) })
  }

  if (data.from || data.to) {
    const createdAt: Record<string, Date> = {}
    if (data.from) createdAt.$gte = new Date(data.from)
    if (data.to) createdAt.$lte = new Date(data.to)
    conditions.push({ createdAt })
  }

  if (data.search) {
    const regex = partialRegex(data.search)
    const searchConditions: Record<string, unknown>[] = [
      { action: regex },
      { entityType: regex },
      { ipAddress: regex },
    ]

    if (Types.ObjectId.isValid(data.search)) {
      const objectId = new Types.ObjectId(data.search)
      searchConditions.push({ entityId: objectId }, { performedBy: objectId })
    }

    conditions.push({ $or: searchConditions })
  }

  if (!conditions.length) return {}
  if (conditions.length === 1) return conditions[0]!
  return { $and: conditions }
}
