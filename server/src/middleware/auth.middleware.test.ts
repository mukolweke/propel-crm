import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import type { Request } from 'express'
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { User } from '../models/index.js'
import { buildContext, loadAuthUserFromId } from './auth.js'
import { signAccessToken } from '../utils/jwt.js'
import { assertAuthenticated } from '../utils/errors.js'
import { BCRYPT_ROUNDS } from '../utils/password.js'

const TEST_EMAIL = `auth-middleware-test-${Date.now()}@example.com`

function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    cookies: {},
    ip: '127.0.0.1',
    ...overrides,
  } as Request
}

describe('auth middleware — live DB revalidation', { skip: !env.MONGODB_URI }, () => {
  let userId: string

  before(async () => {
    await connectDatabase()
    const password = await bcrypt.hash('TestPass!123', BCRYPT_ROUNDS)
    const user = await User.create({
      fullName: 'Auth Middleware Test User',
      email: TEST_EMAIL,
      password,
      role: 'user',
      mustChangePassword: false,
      isActive: true,
    })
    userId = user._id.toString()
  })

  after(async () => {
    await User.deleteOne({ email: TEST_EMAIL })
    await disconnectDatabase()
  })

  it('uses role from DB when JWT payload differs', async () => {
    const token = signAccessToken({
      id: userId,
      email: TEST_EMAIL,
      role: 'super_admin',
      mustChangePassword: false,
    })

    const ctx = await buildContext(
      mockRequest({ headers: { authorization: `Bearer ${token}` } }),
    )
    assert.ok(ctx.user)
    assert.equal(ctx.user.role, 'user')
  })

  it('rejects a still-valid access token immediately after deactivation', async () => {
    const token = signAccessToken({
      id: userId,
      email: TEST_EMAIL,
      role: 'user',
      mustChangePassword: false,
    })

    const activeCtx = await buildContext(
      mockRequest({ headers: { authorization: `Bearer ${token}` } }),
    )
    assert.ok(activeCtx.user)

    await User.findByIdAndUpdate(userId, { isActive: false })

    const deactivatedCtx = await buildContext(
      mockRequest({ headers: { authorization: `Bearer ${token}` } }),
    )
    assert.equal(deactivatedCtx.user, null)

    assert.throws(
      () => assertAuthenticated(deactivatedCtx.user),
      (err: unknown) => {
        assert.ok(err && typeof err === 'object' && 'extensions' in err)
        const extensions = (err as { extensions?: { code?: string } }).extensions
        assert.equal(extensions?.code, 'UNAUTHENTICATED')
        return true
      },
    )

    await User.findByIdAndUpdate(userId, { isActive: true })
    const reactivated = await loadAuthUserFromId(userId)
    assert.ok(reactivated)
  })

  it('rejects soft-deleted users even with a valid token', async () => {
    const token = signAccessToken({
      id: userId,
      email: TEST_EMAIL,
      role: 'user',
      mustChangePassword: false,
    })

    await User.findByIdAndUpdate(userId, { deletedAt: new Date() })

    const ctx = await buildContext(
      mockRequest({ headers: { authorization: `Bearer ${token}` } }),
    )
    assert.equal(ctx.user, null)

    await User.findByIdAndUpdate(userId, { $unset: { deletedAt: 1 } })
  })
})
