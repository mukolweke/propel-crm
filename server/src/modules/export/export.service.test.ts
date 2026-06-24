import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { env } from '../../config/env.js'
import { connectDatabase, disconnectDatabase } from '../../config/database.js'
import { AuditLog, Contact, User } from '../../models/index.js'
import { exportService } from './export.service.js'
import { BCRYPT_ROUNDS } from '../../utils/password.js'

const RUN_ID = Date.now()
const AGENT_EMAIL = `export-agent-${RUN_ID}@example.com`
const OTHER_EMAIL = `export-other-${RUN_ID}@example.com`

describe('exportService — contacts export audit', { skip: !env.MONGODB_URI }, () => {
  let agentId: string
  let otherId: string

  before(async () => {
    await connectDatabase()
    const password = await bcrypt.hash('TestPass!123', BCRYPT_ROUNDS)

    const [agent, other] = await User.create([
      {
        fullName: 'Export Agent',
        email: AGENT_EMAIL,
        password,
        role: 'user',
        mustChangePassword: false,
        isActive: true,
      },
      {
        fullName: 'Other Agent',
        email: OTHER_EMAIL,
        password,
        role: 'user',
        mustChangePassword: false,
        isActive: true,
      },
    ])

    agentId = agent._id.toString()
    otherId = other._id.toString()

    await Contact.create([
      {
        fullName: 'Export Contact A',
        phone: `+2547${RUN_ID.toString().slice(-8)}`,
        email: `export-a-${RUN_ID}@example.com`,
        status: 'new',
        ownerId: agent._id,
      },
      {
        fullName: 'Export Contact B',
        phone: `+2547${(RUN_ID + 1).toString().slice(-8)}`,
        email: `export-b-${RUN_ID}@example.com`,
        status: 'contacted',
        ownerId: agent._id,
      },
      {
        fullName: 'Other Agent Contact',
        phone: `+2547${(RUN_ID + 2).toString().slice(-8)}`,
        email: `export-c-${RUN_ID}@example.com`,
        status: 'new',
        ownerId: other._id,
      },
    ])
  })

  after(async () => {
    await Contact.deleteMany({ ownerId: { $in: [agentId, otherId] } })
    await User.deleteMany({ email: { $in: [AGENT_EMAIL, OTHER_EMAIL] } })
    await disconnectDatabase()
  })

  it('exports only authorized contacts and writes an audit log with record count', async () => {
    const user = {
      id: agentId,
      email: AGENT_EMAIL,
      role: 'user' as const,
      mustChangePassword: false,
    }

    const payload = await exportService.exportContacts(user, { exportPassword: 'TestPass!123' }, {})
    assert.equal(payload.recordCount, 2)
    assert.match(payload.content, /Export Contact A/)
    assert.match(payload.content, /Export Contact B/)
    assert.doesNotMatch(payload.content, /Other Agent Contact/)

    const audit = await AuditLog.findOne({
      performedBy: agentId,
      action: 'EXPORT_GENERATED',
      entityType: 'CONTACT',
    }).sort({ createdAt: -1 })

    assert.ok(audit)
    assert.equal(audit?.metadata?.recordCount, 2)
    const scope = audit?.metadata?.scope as { exportType?: string } | undefined
    assert.equal(scope?.exportType, 'contacts')
  })
})
