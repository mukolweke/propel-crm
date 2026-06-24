import { User } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'
import { assertSuperAdmin, isSuperAdmin } from '../../middleware/rbac.js'
import { auditService } from '../audit/audit.service.js'
import { parseInput, updateProfileSchema } from '../../validators/index.js'
import type { AuthUser, PaginatedResult } from '../../types/index.js'

export const userService = {
  async findById(id: string) {
    const user = await User.findOne({ _id: id, deletedAt: { $exists: false } })
    if (!user) throw new AppError('User not found', 'NOT_FOUND', 404)
    return user
  },

  async listUsers(user: AuthUser, page = 1, pageSize = 20): Promise<PaginatedResult<Record<string, unknown>>> {
    assertSuperAdmin(user)
    const skip = (page - 1) * pageSize
    const filter = { deletedAt: { $exists: false } }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      User.countDocuments(filter),
    ])

    const items = users.map((u) => ({
      id: u._id.toString(),
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt ?? null,
    }))

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 }
  },

  async setUserActive(
    admin: AuthUser,
    userId: string,
    isActive: boolean,
    meta: { ip?: string; userAgent?: string },
  ) {
    assertSuperAdmin(admin)
    if (admin.id === userId && !isActive) {
      throw new AppError('Cannot deactivate yourself', 'BAD_REQUEST', 400)
    }

    const user = await User.findById(userId)
    if (!user || user.deletedAt) throw new AppError('User not found', 'NOT_FOUND', 404)

    if (!isActive && user.role === 'super_admin') {
      throw new AppError('Cannot deactivate a super admin account', 'BAD_REQUEST', 400)
    }

    user.isActive = isActive
    await user.save()

    await auditService.log({
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: userId,
      performedBy: admin,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    })

    return user
  },

  async updateProfile(
    user: AuthUser,
    input: unknown,
    meta: { ip?: string; userAgent?: string },
  ) {
    const data = parseInput(updateProfileSchema, input)
    const dbUser = await User.findById(user.id)
    if (!dbUser || dbUser.deletedAt) throw new AppError('User not found', 'NOT_FOUND', 404)

    if (data.fullName !== undefined) dbUser.fullName = data.fullName
    if (data.phone !== undefined) dbUser.phone = data.phone
    if (data.agency !== undefined) dbUser.agency = data.agency
    if (data.notificationSettings) {
      dbUser.notificationSettings = {
        ...dbUser.notificationSettings,
        ...data.notificationSettings,
      }
    }

    await dbUser.save()

    await auditService.log({
      action: 'PROFILE_UPDATED',
      entityType: 'USER',
      entityId: user.id,
      performedBy: user,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    })

    return dbUser
  },

  isSuperAdmin,
}
