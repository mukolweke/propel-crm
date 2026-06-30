import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { env } from '../../config/env.js'
import { connectDatabase, disconnectDatabase } from '../../config/database.js'
import { Contact, Interaction, User } from '../../models/index.js'
import { contactService } from '../contacts/contact.service.js'
import { interactionService } from './interaction.service.js'
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

describe('interactions — deleted contact cleanup', { skip: !env.MONGODB_URI }, () => {
  let ownerId: string
  let contactId: string
  const ownerEmail = `interaction-delete-${RUN_ID}@example.com`

  before(async () => {
    await connectDatabase()
    const password = await bcrypt.hash('TestPass!123', BCRYPT_ROUNDS)

    const owner = await User.create({
      fullName: 'Owner',
      email: ownerEmail,
      password,
      role: 'user',
      mustChangePassword: false,
      isActive: true,
    })
    ownerId = owner._id.toString()

    const contact = await Contact.create({
      fullName: 'Delete Me',
      phone: `+2547${RUN_ID.toString().slice(-8)}`,
      email: `delete-${RUN_ID}@example.com`,
      status: 'new',
      ownerId: owner._id,
    })
    contactId = contact._id.toString()

    await interactionService.logInteraction(
      authUser(ownerId, ownerEmail),
      { contactId, interactionType: 'call', notes: 'Test call' },
      {},
    )
  })

  after(async () => {
    await Interaction.deleteMany({ contactId })
    await Contact.deleteMany({ email: { $regex: `delete-${RUN_ID}` } })
    await User.deleteMany({ email: ownerEmail })
    await disconnectDatabase()
  })

  it('removes interactions when the contact is deleted', async () => {
    const user = authUser(ownerId, ownerEmail)
    const before = await interactionService.listInteractions(user)
    assert.equal(before.length, 1)

    await contactService.deleteContact(user, contactId, {})

    const after = await interactionService.listInteractions(user)
    assert.equal(after.length, 0)
  })
})
