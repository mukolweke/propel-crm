import bcrypt from 'bcryptjs'
import { User, RefreshToken, PasswordResetCode } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'
import { signAccessToken, signRefreshToken as signRefreshJwt } from '../../utils/jwt.js'
import { BCRYPT_ROUNDS, validatePassword } from '../../utils/password.js'
import { hashToken, generateRefreshToken, generateResetCode } from '../../utils/crypto.js'
import type { AuthUser, TokenPair } from '../../types/index.js'
import {
  parseInput,
  loginSchema,
  changePasswordSchema,
  createUserSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from '../../validators/index.js'
import { auditService } from '../audit/audit.service.js'
import { emailService } from '../email/email.service.js'
import { assertSuperAdmin } from '../../middleware/rbac.js'
import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'

const MAX_LOGIN_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000

export const PASSWORD_RESET_REQUEST_MESSAGE =
  'If an account exists for this email, a 6 digit reset code has been sent.'

function toAuthUser(user: {
  _id: { toString(): string }
  email: string
  role: AuthUser['role']
  mustChangePassword: boolean
}): AuthUser {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  }
}

async function issueTokenPair(user: AuthUser): Promise<TokenPair> {
  const accessToken = signAccessToken(user)
  const rawRefresh = generateRefreshToken()

  const stored = await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(rawRefresh),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  const refreshJwt = signRefreshJwt(user, rawRefresh, stored._id.toString())
  return { accessToken, refreshToken: refreshJwt }
}

async function revokeAllRefreshTokens(userId: string) {
  await RefreshToken.updateMany(
    { userId, revokedAt: { $exists: false } },
    { revokedAt: new Date() },
  )
}

export const authService = {
  async login(input: unknown, meta: { ip?: string; userAgent?: string }) {
    const data = parseInput(loginSchema, input)
    const user = await User.findOne({ email: data.email, deletedAt: { $exists: false } }).select(
      '+password',
    )

    if (!user || !user.isActive) {
      await auditService.log({
        action: 'FAILED_LOGIN',
        entityType: 'AUTH',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        metadata: { email: data.email, reason: 'invalid_or_inactive' },
      })
      throw new AppError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError('Account temporarily locked. Try again later.', 'ACCOUNT_LOCKED', 423)
    }

    const valid = await bcrypt.compare(data.password, user.password)
    if (!valid) {
      user.loginAttempts += 1
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS)
        user.loginAttempts = 0
      }
      await user.save()

      const authUser = toAuthUser(user)
      await auditService.log({
        action: 'FAILED_LOGIN',
        entityType: 'AUTH',
        performedBy: authUser,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        metadata: { attempts: user.loginAttempts },
      })
      throw new AppError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
    }

    user.loginAttempts = 0
    user.lockedUntil = undefined
    user.lastLoginAt = new Date()
    await user.save()

    const authUser = toAuthUser(user)
    const tokens = await issueTokenPair(authUser)

    await auditService.log({
      action: 'USER_LOGIN',
      entityType: 'AUTH',
      entityId: user._id.toString(),
      performedBy: authUser,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    })

    return { user: authUser, tokens, mustChangePassword: user.mustChangePassword }
  },

  /** Re-verify the user's account password (e.g. before sensitive exports). Does not affect login lockout counters. */
  async verifyPassword(userId: string, password: string): Promise<void> {
    const user = await User.findOne({ _id: userId, deletedAt: { $exists: false } }).select('+password')
    if (!user || !user.isActive) {
      throw new AppError('Incorrect account password', 'INVALID_CREDENTIALS', 401)
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      throw new AppError('Incorrect account password', 'INVALID_CREDENTIALS', 401)
    }
  },

  async logout(user: AuthUser, refreshToken: string | undefined, meta: { ip?: string; userAgent?: string }) {
    if (refreshToken) {
      const { verifyRefreshToken } = await import('../../utils/jwt.js')
      const payload = verifyRefreshToken(refreshToken)
      if (payload?.tokenId) {
        await RefreshToken.findByIdAndUpdate(payload.tokenId, { revokedAt: new Date() })
      }
    }

    await auditService.log({
      action: 'USER_LOGOUT',
      entityType: 'AUTH',
      entityId: user.id,
      performedBy: user,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    })

    return true
  },

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const { verifyRefreshToken } = await import('../../utils/jwt.js')
    const payload = verifyRefreshToken(refreshToken)
    if (!payload?.tokenId || !payload.rawToken) {
      throw new AppError('Invalid refresh token', 'INVALID_TOKEN', 401)
    }

    const stored = await RefreshToken.findById(payload.tokenId).select('+tokenHash')
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError('Invalid refresh token', 'INVALID_TOKEN', 401)
    }

    if (stored.tokenHash !== hashToken(payload.rawToken)) {
      await revokeAllRefreshTokens(stored.userId.toString())
      throw new AppError('Refresh token reuse detected', 'INVALID_TOKEN', 401)
    }

    const user = await User.findOne({
      _id: stored.userId,
      isActive: true,
      deletedAt: { $exists: false },
    })
    if (!user) throw new AppError('User not found', 'NOT_FOUND', 404)

    stored.revokedAt = new Date()
    await stored.save()

    const authUser = toAuthUser(user)
    const tokens = await issueTokenPair(authUser)
    return tokens
  },

  async changePassword(
    user: AuthUser,
    input: unknown,
    meta: { ip?: string; userAgent?: string },
  ) {
    const data = parseInput(changePasswordSchema, input)
    validatePassword(data.newPassword)

    const dbUser = await User.findById(user.id).select('+password')
    if (!dbUser) throw new AppError('User not found', 'NOT_FOUND', 404)

    const valid = await bcrypt.compare(data.currentPassword, dbUser.password)
    if (!valid) throw new AppError('Current password is incorrect', 'INVALID_CREDENTIALS', 401)

    dbUser.password = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS)
    dbUser.mustChangePassword = false
    await dbUser.save()
    await revokeAllRefreshTokens(user.id)

    await auditService.log({
      action: 'PASSWORD_CHANGED',
      entityType: 'AUTH',
      entityId: user.id,
      performedBy: user,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    })

    const authUser = toAuthUser(dbUser)
    const tokens = await issueTokenPair(authUser)
    return { user: authUser, tokens }
  },

  async createUser(admin: AuthUser, input: unknown, meta: { ip?: string; userAgent?: string }) {
    assertSuperAdmin(admin)
    const data = parseInput(createUserSchema, input)

    const existing = await User.findOne({ email: data.email })
    if (existing) throw new AppError('Email already registered', 'EMAIL_EXISTS', 409)

    const password = await bcrypt.hash(data.password, BCRYPT_ROUNDS)
    const user = await User.create({
      fullName: data.fullName,
      email: data.email,
      password,
      role: 'user',
      mustChangePassword: true,
      isActive: true,
    })

    await auditService.log({
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: user._id.toString(),
      performedBy: admin,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      metadata: { email: user.email, role: user.role },
    })

    return user
  },

  async getMe(userId: string) {
    const user = await User.findOne({ _id: userId, deletedAt: { $exists: false } })
    if (!user) throw new AppError('User not found', 'NOT_FOUND', 404)
    return user
  },

  async requestPasswordReset(input: unknown, meta: { ip?: string; userAgent?: string }) {
    const data = parseInput(requestPasswordResetSchema, input)
    const user = await User.findOne({
      email: data.email,
      isActive: true,
      deletedAt: { $exists: false },
    })

    if (user) {
      const code = generateResetCode()
      const expiresAt = new Date(
        Date.now() + env.PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000,
      )

      await PasswordResetCode.updateMany(
        { userId: user._id, usedAt: { $exists: false } },
        { usedAt: new Date() },
      )

      await PasswordResetCode.create({
        userId: user._id,
        codeHash: hashToken(code),
        expiresAt,
        attempts: 0,
      })

      try {
        await emailService.sendPasswordResetCode(user.email, user.fullName, code)
      } catch (err) {
        logger.error('Failed to send password reset email', err)
      }

      await auditService.log({
        action: 'PASSWORD_RESET',
        entityType: 'AUTH',
        entityId: user._id.toString(),
        performedBy: toAuthUser(user),
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        metadata: { stage: 'requested' },
      })
    } else {
      hashToken(generateResetCode())
    }

    return {
      success: true,
      message: PASSWORD_RESET_REQUEST_MESSAGE,
    }
  },

  async resetPassword(input: unknown, meta: { ip?: string; userAgent?: string }) {
    const data = parseInput(resetPasswordSchema, input)
    validatePassword(data.newPassword)

    const user = await User.findOne({
      email: data.email,
      isActive: true,
      deletedAt: { $exists: false },
    }).select('+password')

    if (!user) {
      throw new AppError('No account found with this email address', 'EMAIL_NOT_FOUND', 404)
    }

    const resetCode = await PasswordResetCode.findOne({
      userId: user._id,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select('+codeHash')

    if (!resetCode) {
      throw new AppError('Reset code has expired. Request a new one.', 'RESET_CODE_EXPIRED', 400)
    }

    if (resetCode.attempts >= env.PASSWORD_RESET_MAX_ATTEMPTS) {
      resetCode.usedAt = new Date()
      await resetCode.save()
      throw new AppError('Too many invalid attempts. Request a new code.', 'RESET_CODE_LOCKED', 400)
    }

    if (resetCode.codeHash !== hashToken(data.code)) {
      resetCode.attempts += 1
      await resetCode.save()
      throw new AppError('Invalid reset code', 'INVALID_RESET_CODE', 400)
    }

    user.password = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS)
    user.mustChangePassword = false
    user.loginAttempts = 0
    user.lockedUntil = undefined
    await user.save()

    resetCode.usedAt = new Date()
    await resetCode.save()
    await revokeAllRefreshTokens(user._id.toString())

    const authUser = toAuthUser(user)
    await auditService.log({
      action: 'PASSWORD_RESET',
      entityType: 'AUTH',
      entityId: user._id.toString(),
      performedBy: authUser,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      metadata: { stage: 'completed' },
    })

    return {
      success: true,
      message: 'Your password has been reset. You can sign in with your new password.',
    }
  },
}
