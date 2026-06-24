import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { env } from '../../config/env.js'
import { connectDatabase, disconnectDatabase } from '../../config/database.js'
import { Contact, User } from '../../models/index.js'
import { searchContactsPaginated } from './contact-search.js'
import { BCRYPT_ROUNDS } from '../../utils/password.js'
import type { AuthUser } from '../../types/index.js'

const RUN_ID = Date.now()
const ADMIN_EMAIL = `contacts-page-admin-${RUN_ID}@example.com`
const AGENT_EMAIL = `contacts-page-agent-${RUN_ID}@example.com`

describe('searchContactsPaginated', { skip: !env.MONGODB_URI }, () => {
  let adminId: string
  let agentId: string
  const adminUser = (): AuthUser => ({
    id: adminId,
    email: ADMIN_EMAIL,
    role: 'super_admin',
    mustChangePassword: false,
  })
  const agentUser = (): AuthUser => ({
    id: agentId,
    email: AGENT_EMAIL,
    role: 'user',
    mustChangePassword: false,
  })

  before(async () => {
    await connectDatabase()
    const password = await bcrypt.hash('TestPass!123', BCRYPT_ROUNDS)

    const [admin, agent] = await User.create([
      {
        fullName: 'Pagination Admin',
        email: ADMIN_EMAIL,
        password,
        role: 'super_admin',
        mustChangePassword: false,
        isActive: true,
      },
      {
        fullName: 'Pagination Agent',
        email: AGENT_EMAIL,
        password,
        role: 'user',
        mustChangePassword: false,
        isActive: true,
      },
    ])

    adminId = admin._id.toString()
    agentId = agent._id.toString()

    await Contact.insertMany(
      Array.from({ length: 25 }, (_, index) => ({
        ownerId: agent._id,
        fullName: `Global Contact ${index + 1}`,
        phone: `+254700000${String(index).padStart(3, '0')}`,
        email: `contact-${RUN_ID}-${index}@example.com`,
        propertyInterest: 'Apartment',
        budgetRange: '1M-2M',
        preferredLocation: 'Nairobi',
        leadSource: 'Web',
        notes: '',
        status: 'new',
      })),
    )
  })

  after(async () => {
    await Contact.deleteMany({ email: { $regex: `@example.com$` }, fullName: /^Global Contact / })
    await User.deleteMany({ email: { $in: [ADMIN_EMAIL, AGENT_EMAIL] } })
    await disconnectDatabase()
  })

  it('paginates global contacts for super_admin', async () => {
    const page1 = await searchContactsPaginated(adminUser(), { page: 1, pageSize: 20 })
    const page2 = await searchContactsPaginated(adminUser(), { page: 2, pageSize: 20 })

    assert.equal(page1.items.length, 20)
    assert.ok(page1.total >= 25)
    assert.equal(page1.page, 1)
    assert.equal(page1.pageSize, 20)
    assert.ok(page1.totalPages >= 2)

    assert.ok(page2.items.length >= 5)
    assert.equal(page2.page, 2)
  })

  it('returns all owned contacts in one page for regular users', async () => {
    const result = await searchContactsPaginated(agentUser(), { page: 1, pageSize: 20 })

    assert.equal(result.items.length, 25)
    assert.equal(result.total, 25)
    assert.equal(result.totalPages, 1)
    assert.equal(result.page, 1)
  })
})
