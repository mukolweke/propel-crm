import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { env } from '../../config/env.js'
import { connectDatabase, disconnectDatabase } from '../../config/database.js'
import { PasswordResetCode, User } from '../../models/index.js'
import {
  PASSWORD_RESET_REQUEST_MESSAGE,
  authService,
} from './auth.service.js'
import { emailService } from '../email/email.service.js'
import { BCRYPT_ROUNDS } from '../../utils/password.js'

const RUN_ID = Date.now()
const KNOWN_EMAIL = `reset-known-${RUN_ID}@example.com`
const UNKNOWN_EMAIL = `reset-unknown-${RUN_ID}@example.com`

describe('requestPasswordReset — anti-enumeration', { skip: !env.MONGODB_URI }, () => {
  let userId: string
  let sendMailMock: ReturnType<typeof mock.method>

  before(async () => {
    await connectDatabase()
    sendMailMock = mock.method(emailService, 'sendPasswordResetCode', async () => {})

    const password = await bcrypt.hash('TestPass!123', BCRYPT_ROUNDS)
    const user = await User.create({
      fullName: 'Reset Test User',
      email: KNOWN_EMAIL,
      password,
      role: 'user',
      mustChangePassword: false,
      isActive: true,
    })
    userId = user._id.toString()
  })

  after(async () => {
    sendMailMock.mock.restore()
    await PasswordResetCode.deleteMany({ userId })
    await User.deleteOne({ email: KNOWN_EMAIL })
    await disconnectDatabase()
  })

  it('returns the same message for registered and unregistered emails', async () => {
    const known = await authService.requestPasswordReset({ email: KNOWN_EMAIL }, {})
    const unknown = await authService.requestPasswordReset({ email: UNKNOWN_EMAIL }, {})

    assert.deepEqual(known, unknown)
    assert.equal(known.message, PASSWORD_RESET_REQUEST_MESSAGE)
    assert.equal(known.success, true)
  })

  it('creates a reset code only when the account exists', async () => {
    const before = await PasswordResetCode.countDocuments({ userId })
    const callsBefore = sendMailMock.mock.callCount()

    await authService.requestPasswordReset({ email: UNKNOWN_EMAIL }, {})
    assert.equal(await PasswordResetCode.countDocuments({ userId }), before)
    assert.equal(sendMailMock.mock.callCount(), callsBefore)

    await authService.requestPasswordReset({ email: KNOWN_EMAIL }, {})
    assert.equal(await PasswordResetCode.countDocuments({ userId }), before + 1)
    assert.equal(sendMailMock.mock.callCount(), callsBefore + 1)
  })

  it('returns the generic message when email delivery fails', async () => {
    const failingSend = mock.method(emailService, 'sendPasswordResetCode', async () => {
      throw new Error('SMTP unavailable')
    })

    try {
      const result = await authService.requestPasswordReset({ email: KNOWN_EMAIL }, {})
      assert.equal(result.message, PASSWORD_RESET_REQUEST_MESSAGE)
      assert.equal(result.success, true)
    } finally {
      failingSend.mock.restore()
    }
  })
})
