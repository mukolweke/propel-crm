import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { Types } from 'mongoose'
import { env } from '../../config/env.js'
import { connectDatabase, disconnectDatabase } from '../../config/database.js'
import { Contact, SharedAccess, User } from '../../models/index.js'
import { contactService } from './contact.service.js'
import { interactionService } from '../interactions/interaction.service.js'
import { followUpService } from '../followups/followup.service.js'
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

function expectAppErrorCode(err: unknown, code: string): boolean {
  assert.ok(err && typeof err === 'object' && 'code' in err)
  assert.equal((err as { code?: string }).code, code)
  return true
}

describe('contact access — query-level scoping', { skip: !env.MONGODB_URI }, () => {
  let ownerId: string
  let viewerId: string
  let editorId: string
  let strangerId: string
  let contactId: string
  let editorInteractionId: string
  let editorFollowUpId: string

  const ownerEmail = `owner-scope-${RUN_ID}@example.com`
  const viewerEmail = `viewer-scope-${RUN_ID}@example.com`
  const editorEmail = `editor-scope-${RUN_ID}@example.com`
  const strangerEmail = `stranger-scope-${RUN_ID}@example.com`

  before(async () => {
    await connectDatabase()
    const password = await bcrypt.hash('TestPass!123', BCRYPT_ROUNDS)

    const [owner, viewer, editor, stranger] = await User.create([
      {
        fullName: 'Owner',
        email: ownerEmail,
        password,
        role: 'user',
        mustChangePassword: false,
        isActive: true,
      },
      {
        fullName: 'Viewer',
        email: viewerEmail,
        password,
        role: 'user',
        mustChangePassword: false,
        isActive: true,
      },
      {
        fullName: 'Editor',
        email: editorEmail,
        password,
        role: 'user',
        mustChangePassword: false,
        isActive: true,
      },
      {
        fullName: 'Stranger',
        email: strangerEmail,
        password,
        role: 'user',
        mustChangePassword: false,
        isActive: true,
      },
    ])

    ownerId = owner._id.toString()
    viewerId = viewer._id.toString()
    editorId = editor._id.toString()
    strangerId = stranger._id.toString()

    const contact = await Contact.create({
      fullName: 'Scoped Contact',
      phone: `+2547${RUN_ID.toString().slice(-8)}`,
      email: `scoped-${RUN_ID}@example.com`,
      status: 'new',
      ownerId: owner._id,
      sharedWith: [viewer._id, editor._id],
    })
    contactId = contact._id.toString()

    await SharedAccess.create([
      { contactId: contact._id, ownerId: owner._id, sharedUserId: viewer._id, permission: 'view' },
      { contactId: contact._id, ownerId: owner._id, sharedUserId: editor._id, permission: 'edit' },
    ])

    const editorInteraction = await interactionService.logInteraction(
      authUser(editorId, editorEmail),
      {
        contactId,
        interactionType: 'call',
        notes: 'Shared editor interaction',
      },
      {},
    )
    editorInteractionId = editorInteraction._id.toString()

    const editorFollowUp = await followUpService.createFollowUp(
      authUser(editorId, editorEmail),
      {
        contactId,
        scheduledDate: new Date(Date.now() + 86_400_000).toISOString(),
        notes: 'Shared editor follow-up',
      },
      {},
    )
    editorFollowUpId = editorFollowUp._id.toString()
  })

  after(async () => {
    await SharedAccess.deleteMany({ contactId })
    await Contact.deleteOne({ _id: contactId })
    await User.deleteMany({
      email: { $in: [ownerEmail, viewerEmail, editorEmail, strangerEmail] },
    })
    await disconnectDatabase()
  })

  it('allows shared view access via scoped contact query', async () => {
    const contact = await contactService.getContact(authUser(viewerId, viewerEmail), contactId)
    assert.equal(contact._id.toString(), contactId)
  })

  it('allows shared edit access via scoped contact query', async () => {
    const updated = await contactService.updateContact(
      authUser(editorId, editorEmail),
      contactId,
      { notes: 'Updated by editor' },
      {},
    )
    assert.equal(updated.notes, 'Updated by editor')
  })

  it('denies view-only shared user edit at query level', async () => {
    await assert.rejects(
      () =>
        contactService.updateContact(
          authUser(viewerId, viewerEmail),
          contactId,
          { notes: 'Should fail' },
          {},
        ),
      (err: unknown) => expectAppErrorCode(err, 'NOT_FOUND'),
    )
  })

  it('denies unrelated users at query level', async () => {
    await assert.rejects(
      () => contactService.getContact(authUser(strangerId, strangerEmail), contactId),
      (err: unknown) => expectAppErrorCode(err, 'NOT_FOUND'),
    )
  })

  it('scopes interaction lookup to the acting owner', async () => {
    const interaction = await interactionService.updateInteraction(
      authUser(editorId, editorEmail),
      editorInteractionId,
      { notes: 'Updated notes' },
    )
    assert.equal(interaction.notes, 'Updated notes')

    await assert.rejects(
      () =>
        interactionService.updateInteraction(
          authUser(strangerId, strangerEmail),
          editorInteractionId,
          { notes: 'Blocked' },
        ),
      (err: unknown) => expectAppErrorCode(err, 'NOT_FOUND'),
    )
  })

  it('scopes follow-up lookup to the acting owner', async () => {
    const rescheduled = await followUpService.rescheduleFollowUp(
      authUser(editorId, editorEmail),
      editorFollowUpId,
      new Date(Date.now() + 172_800_000).toISOString(),
    )
    assert.equal(rescheduled.status, 'pending')

    await assert.rejects(
      () =>
        followUpService.completeFollowUp(
          authUser(strangerId, strangerEmail),
          editorFollowUpId,
          {},
        ),
      (err: unknown) => expectAppErrorCode(err, 'NOT_FOUND'),
    )
  })

  it('keeps assertCanView as a second layer after scoped fetch', async () => {
    await SharedAccess.deleteOne({ contactId, sharedUserId: new Types.ObjectId(viewerId) })

    await assert.rejects(
      () => contactService.getContact(authUser(viewerId, viewerEmail), contactId),
      (err: unknown) => expectAppErrorCode(err, 'NOT_FOUND'),
    )

    await SharedAccess.create({
      contactId,
      ownerId: new Types.ObjectId(ownerId),
      sharedUserId: new Types.ObjectId(viewerId),
      permission: 'view',
    })
  })
})
