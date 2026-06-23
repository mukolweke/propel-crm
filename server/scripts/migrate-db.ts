import mongoose from 'mongoose'
import { env } from '../src/config/env.js'
import { logger } from '../src/utils/logger.js'

const COLLECTIONS = [
  'users',
  'contacts',
  'interactions',
  'followups',
  'sharedaccesses',
  'reportsnapshots',
  'refreshtokens',
  'auditlogs',
  'passwordresetcodes',
] as const

function databaseNameFromUri(uri: string): string {
  const path = uri.split('?')[0]?.split('/').pop()
  return path && path.length > 0 ? path : 'test'
}

function uriWithDatabase(uri: string, database: string): string {
  const [base, query] = uri.split('?')
  const prefix = base?.replace(/\/[^/]*$/, '') ?? base
  return query ? `${prefix}/${database}?${query}` : `${prefix}/${database}`
}

async function main() {
  const sourceDb = process.argv[2] ?? 'test'
  const targetDb = process.argv[3] ?? databaseNameFromUri(env.MONGODB_URI)

  if (sourceDb === targetDb) {
    logger.error('Source and target database must differ')
    process.exit(1)
  }

  const sourceUri = uriWithDatabase(env.MONGODB_URI, sourceDb)
  const targetUri = uriWithDatabase(env.MONGODB_URI, targetDb)

  logger.info(`Migrating ${sourceDb} → ${targetDb}`)

  const sourceConn = await mongoose.createConnection(sourceUri).asPromise()
  const targetConn = await mongoose.createConnection(targetUri).asPromise()

  try {
    for (const collection of COLLECTIONS) {
      const source = sourceConn.db?.collection(collection)
      const target = targetConn.db?.collection(collection)
      if (!source || !target) continue

      const docs = await source.find({}).toArray()
      if (!docs.length) {
        logger.info(`${collection}: skipped (empty)`)
        continue
      }

      const existing = await target.countDocuments()
      if (existing > 0) {
        logger.warn(`${collection}: target not empty (${existing} docs) — skipping`)
        continue
      }

      await target.insertMany(docs)
      logger.info(`${collection}: copied ${docs.length} document(s)`)
    }

    logger.info('Migration complete')
  } finally {
    await sourceConn.close()
    await targetConn.close()
  }
}

main().catch((err) => {
  logger.error('Migration failed', err)
  process.exit(1)
})
