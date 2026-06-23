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

const ADMIN_EMAIL = 'mukolwesofts@gmail.com'
const ADMIN_PASSWORD = 'ChangeMe@12345'

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

async function createSuperAdmin() {
  const password = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS)
  await User.create({
    fullName: 'System Administrator',
    email: ADMIN_EMAIL,
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
  logger.info('Super admin created: admin@system.local (change password on first login)')
}

async function seedAdminIfMissing() {
  const existing = await User.findOne({ email: ADMIN_EMAIL })
  if (existing) {
    logger.info('Super admin already exists — no changes made')
    return
  }
  logger.info('Creating super admin…')
  await createSuperAdmin()
}

async function main() {
  if (env.NODE_ENV === 'production' && process.env.SEED_CONFIRM !== 'yes') {
    logger.error('Refusing to seed in production without SEED_CONFIRM=yes')
    process.exit(1)
  }

  await connectDatabase()

  if (process.env.RESET_DB === 'yes') {
    await wipeAllAppData()
    await createSuperAdmin()
  } else if (process.env.CLEAR_DEMO === 'yes') {
    await Promise.all([
      Contact.deleteMany({}),
      Interaction.deleteMany({}),
      FollowUp.deleteMany({}),
      SharedAccess.deleteMany({}),
      ReportSnapshot.deleteMany({}),
      RefreshToken.deleteMany({}),
      AuditLog.deleteMany({}),
      User.deleteMany({ email: { $ne: ADMIN_EMAIL } }),
    ])
    logger.info('Demo data cleared (users except super admin)')
    await seedAdminIfMissing()
  } else {
    await seedAdminIfMissing()
  }

  await disconnectDatabase()
}

main().catch((err) => {
  logger.error('Seed failed', err)
  process.exit(1)
})
