import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { env } from '../../config/env.js'
import { connectDatabase, disconnectDatabase } from '../../config/database.js'
import { Contact, User } from '../../models/index.js'
import { checkContactDuplicate } from './contact-duplicate.service.js'
import { BCRYPT_ROUNDS } from '../../utils/password.js'
import type { AuthUser } from '../../types/index.js'

const RUN_ID = Date.now()

function authUser(id: string, email: string): AuthUser {
  return {
    id,
    email,
    role: 'user',
    mustChangePassword: false,
  }
}

describe('checkContactDuplicate — excludeContactId scoping', { skip: !env.MONGODB_URI }, () => {
  let agentAId: string
  let agentBId: string
  let agentAContactId: string
  let agentBContactId: string

  const agentAEmail = `dup-agent-a-${RUN_ID}@example.com`
  const agentBEmail = `dup-agent-b-${RUN_ID}@example.com`
  const agentBPhone = `+2547${(RUN_ID + 1).toString().slice(-8)}`
  const agentAPhone = `+2547${RUN_ID.toString().slice(-8)}`

  before(async () => {
    await connectDatabase()
    const password = await bcrypt.hash('TestPass!123', BCRYPT_ROUNDS)

    const [agentA, agentB] = await User.create([
      {
        fullName: 'Agent A',
        email: agentAEmail,
        password,
        role: 'user',
        mustChangePassword: false,
        isActive: true,
      },
      {
        fullName: 'Agent B',
        email: agentBEmail,
        password,
        role: 'user',
        mustChangePassword: false,
        isActive: true,
      },
    ])

    agentAId = agentA._id.toString()
    agentBId = agentB._id.toString()

    const [contactA, contactB] = await Contact.create([
      {
        fullName: 'Agent A Contact',
        phone: agentAPhone,
        email: `contact-a-${RUN_ID}@example.com`,
        status: 'new',
        ownerId: agentA._id,
      },
      {
        fullName: 'Agent B Contact',
        phone: agentBPhone,
        email: `contact-b-${RUN_ID}@example.com`,
        status: 'new',
        ownerId: agentB._id,
      },
    ])

    agentAContactId = contactA._id.toString()
    agentBContactId = contactB._id.toString()
  })

  after(async () => {
    await Contact.deleteMany({ ownerId: { $in: [agentAId, agentBId] } })
    await User.deleteMany({ email: { $in: [agentAEmail, agentBEmail] } })
    await disconnectDatabase()
  })

  it('ignores another agent contact ID as excludeContactId', async () => {
    const withoutExclude = await checkContactDuplicate(
      authUser(agentAId, agentAEmail),
      agentBPhone,
      '',
    )
    const withForeignExclude = await checkContactDuplicate(
      authUser(agentAId, agentAEmail),
      agentBPhone,
      '',
      agentBContactId,
    )

    assert.equal(withoutExclude.isDuplicate, true)
    assert.equal(withForeignExclude.isDuplicate, true)
    assert.equal(withForeignExclude.code, withoutExclude.code)
    assert.equal(withForeignExclude.matchedField, withoutExclude.matchedField)
    assert.equal(withForeignExclude.duplicateOwnerId, undefined)
  })

  it('allows excludeContactId for the caller own contact on update', async () => {
    const result = await checkContactDuplicate(
      authUser(agentAId, agentAEmail),
      agentAPhone,
      '',
      agentAContactId,
    )

    assert.equal(result.isDuplicate, false)
  })

  it('ignores invalid excludeContactId without error', async () => {
    const withoutExclude = await checkContactDuplicate(
      authUser(agentAId, agentAEmail),
      agentBPhone,
      '',
    )
    const withInvalidExclude = await checkContactDuplicate(
      authUser(agentAId, agentAEmail),
      agentBPhone,
      '',
      'not-a-valid-id',
    )

    assert.deepEqual(withInvalidExclude, withoutExclude)
  })
})
