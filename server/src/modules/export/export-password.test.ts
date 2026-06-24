import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { env } from '../../config/env.js'
import { connectDatabase, disconnectDatabase } from '../../config/database.js'
import { User } from '../../models/index.js'
import { exportService } from './export.service.js'
import { BCRYPT_ROUNDS } from '../../utils/password.js'
import { AppError } from '../../utils/errors.js'

const RUN_ID = Date.now()
const EMAIL = `export-pw-${RUN_ID}@example.com`
const PASSWORD = 'TestPass!123'

describe('exportService — export password', { skip: !env.MONGODB_URI }, () => {
  let userId: string

  before(async () => {
    await connectDatabase()
    const password = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS)
    const user = await User.create({
      fullName: 'Export Password User',
      email: EMAIL,
      password,
      role: 'user',
      mustChangePassword: false,
      isActive: true,
    })
    userId = user._id.toString()
  })

  after(async () => {
    await User.deleteOne({ email: EMAIL })
    await disconnectDatabase()
  })

  it('rejects export when account password is wrong', async () => {
    const user = {
      id: userId,
      email: EMAIL,
      role: 'user' as const,
      mustChangePassword: false,
    }

    await assert.rejects(
      () =>
        exportService.exportReport(user, {
          format: 'csv',
          period: 'daily',
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
          exportPassword: 'WrongPass!123',
        }, {}),
      (err: unknown) => err instanceof AppError && err.code === 'INVALID_CREDENTIALS',
    )
  })
})
