import { AuditLog } from '../../models/index.js'
import { assertSuperAdmin } from '../../middleware/rbac.js'
import { parseInput, auditLogFilterSchema } from '../../validators/index.js'
import { buildAuditLogQuery } from './audit-query.js'
import type { AuthUser, PaginatedResult } from '../../types/index.js'

export const auditAdminService = {
  async listLogs(user: AuthUser, filters: unknown): Promise<PaginatedResult<Record<string, unknown>>> {
    assertSuperAdmin(user)
    const data = parseInput(auditLogFilterSchema, filters)
    const query = buildAuditLogQuery(data)

    const page = data.page ?? 1
    const pageSize = data.pageSize ?? 20
    const skip = (page - 1) * pageSize
    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      AuditLog.countDocuments(query),
    ])

    const items = logs.map((log) => ({
      id: log._id.toString(),
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId?.toString() ?? null,
      performedBy: log.performedBy?.toString() ?? null,
      performedByRole: log.performedByRole ?? null,
      ownerId: log.ownerId?.toString() ?? null,
      ipAddress: log.ipAddress ?? null,
      userAgent: log.userAgent ?? null,
      metadata: log.metadata ?? null,
      timestamp: log.createdAt,
    }))

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    }
  },
}
