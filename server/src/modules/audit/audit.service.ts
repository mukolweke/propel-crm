import { AuditLog } from '../../models/index.js'
import type { AuditAction, AuditEntityType, AuthUser } from '../../types/index.js'
import { sanitizeMetadata } from '../../utils/sanitize.js'

interface AuditInput {
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string
  performedBy?: AuthUser
  ownerId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

export const auditService = {
  async log(input: AuditInput) {
    const doc = await AuditLog.create({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      performedBy: input.performedBy?.id,
      performedByRole: input.performedBy?.role,
      ownerId: input.ownerId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: input.metadata ? sanitizeMetadata(input.metadata) : undefined,
    })
    return doc
  },
}
