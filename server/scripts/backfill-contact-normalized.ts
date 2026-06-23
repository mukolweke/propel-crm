import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import { Contact } from '../src/models/index.js'
import { normalizeEmail, normalizePhone } from '../src/utils/normalize.js'
import { logger } from '../src/utils/logger.js'

async function main() {
  await connectDatabase()

  const contacts = await Contact.find({
    $or: [
      { phoneNormalized: { $exists: false } },
      { phoneNormalized: '' },
      { emailNormalized: { $exists: false } },
      { emailNormalized: '' },
    ],
  })

  let updated = 0
  for (const contact of contacts) {
    contact.phoneNormalized = normalizePhone(contact.phone)
    contact.emailNormalized = normalizeEmail(contact.email)
    await contact.save({ validateBeforeSave: false })
    updated += 1
  }

  logger.info(`Backfilled normalized fields on ${updated} contact(s)`)
  await disconnectDatabase()
}

main().catch((err) => {
  logger.error('Backfill failed', err)
  process.exit(1)
})
