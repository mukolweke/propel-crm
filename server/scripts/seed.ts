import bcrypt from 'bcryptjs'
import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import {
  User,
  Contact,
  Interaction,
  FollowUp,
  SharedAccess,
  ReportSnapshot,
  RefreshToken,
  AuditLog,
} from '../src/models/index.js'
import { logger } from '../src/utils/logger.js'
import { BCRYPT_ROUNDS } from '../src/utils/password.js'
import { env } from '../src/config/env.js'
import { resolveSeedAdminConfig, SeedConfigError } from './seed-config.js'

async function wipeAllAppData() {
  logger.warn('Wiping all application collections…')
  await Promise.all([
    Contact.deleteMany({}),
    Interaction.deleteMany({}),
    FollowUp.deleteMany({}),
    SharedAccess.deleteMany({}),
    ReportSnapshot.deleteMany({}),
    RefreshToken.deleteMany({}),
    AuditLog.deleteMany({}),
    User.deleteMany({}),
  ])
}

async function createSuperAdmin(email: string, plainPassword: string) {
  const password = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS)
  await User.create({
    fullName: 'System Administrator',
    email,
    password,
    role: 'super_admin',
    mustChangePassword: true,
    isActive: true,
    notificationSettings: {
      emailAlerts: true,
      followUpReminders: true,
      weeklyDigest: false,
      sharedListUpdates: false,
    },
  })
  logger.info('Super admin created (must change password on first login)', { email })
}

async function seedAdminIfMissing(email: string, plainPassword: string) {
  const existing = await User.findOne({ email })
  if (existing) {
    logger.info('Super admin already exists — no changes made', { email })
    return
  }
  logger.info('Creating super admin…', { email })
  await createSuperAdmin(email, plainPassword)
}

async function main() {
  let seedConfig: { email: string; password: string }
  try {
    seedConfig = resolveSeedAdminConfig()
  } catch (err) {
    if (err instanceof SeedConfigError) {
      logger.error(err.message)
      process.exit(1)
    }
    throw err
  }

  if (env.NODE_ENV === 'production' && process.env.SEED_CONFIRM !== 'yes') {
    logger.error('Refusing to seed in production without SEED_CONFIRM=yes')
    process.exit(1)
  }

  await connectDatabase()

  const { email, password } = seedConfig

  if (process.env.RESET_DB === 'yes') {
    await wipeAllAppData()
    await createSuperAdmin(email, password)
  } else if (process.env.CLEAR_DEMO === 'yes') {
    await Promise.all([
      Contact.deleteMany({}),
      Interaction.deleteMany({}),
      FollowUp.deleteMany({}),
      SharedAccess.deleteMany({}),
      ReportSnapshot.deleteMany({}),
      RefreshToken.deleteMany({}),
      AuditLog.deleteMany({}),
      User.deleteMany({ email: { $ne: email } }),
    ])
    logger.info('Demo data cleared (users except super admin)', { email })
    await seedAdminIfMissing(email, password)
  } else {
    await seedAdminIfMissing(email, password)
  }

  await disconnectDatabase()
}

main().catch((err) => {
  logger.error('Seed failed', err)
  process.exit(1)
})
