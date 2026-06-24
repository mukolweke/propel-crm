import mongoose from 'mongoose'
import { env } from '../src/config/env.js'
import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import { User } from '../src/models/index.js'

async function checkDatabase(uri: string, label: string, email: string) {
  await mongoose.disconnect().catch(() => undefined)
  await mongoose.connect(uri)
  const dbName = mongoose.connection.db?.databaseName ?? label
  const count = await mongoose.connection.db?.collection('users').countDocuments() ?? 0
  const doc = await mongoose.connection.db
    ?.collection('users')
    .findOne({ email: email.toLowerCase().trim() }, { projection: { email: 1, isActive: 1, deletedAt: 1 } })

  console.log(`[${dbName}] users: ${count}, match: ${doc ? 'yes' : 'no'}`)
  if (doc) {
    console.log(`  isActive: ${doc.isActive}, deletedAt: ${doc.deletedAt ?? '(not set)'}`)
  }
}

async function main() {
  const email = process.argv[2] ?? process.env.SEED_ADMIN_EMAIL?.trim()
  if (!email) {
    console.error('Usage: npm run db:check-user -- <email>')
    console.error('Or set SEED_ADMIN_EMAIL in the environment.')
    process.exit(1)
  }
  const uri = env.MONGODB_URI

  console.log('configured uri db:', uri.split('/').pop()?.split('?')[0])
  await checkDatabase(uri, 'configured', email)

  const altUri = uri.replace(/\/[^/?]+(\?|$)/, '/test$1')
  if (altUri !== uri) {
    await checkDatabase(altUri, 'test', email)
  }

  await mongoose.disconnect().catch(() => undefined)

  await connectDatabase()
  const byResetFilters = await User.findOne({
    email: email.toLowerCase().trim(),
    isActive: true,
    deletedAt: { $exists: false },
  })
  console.log('app User model reset lookup:', Boolean(byResetFilters))
  await disconnectDatabase()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
