import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { env } from '../../config/env.js'
import { connectDatabase, disconnectDatabase } from '../../config/database.js'
import { Contact, SharedAccess, User } from '../../models/index.js'
import { contactService } from '../contacts/contact.service.js'
import { exportService } from '../export/export.service.js'
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

describe('report access — shared contact permissions', { skip: !env.MONGODB_URI }, () => {
  let ownerId: string
  let viewerId: string
  let viewContactId: string
  let reportContactId: string
  let editContactId: string

  const ownerEmail = `report-owner-${RUN_ID}@example.com`
  const viewerEmail = `report-viewer-${RUN_ID}@example.com`

  before(async () => {
    await connectDatabase()
    const password = await bcrypt.hash('TestPass!123', BCRYPT_ROUNDS)

    const [owner, viewer] = await User.create([
      {
        fullName: 'Report Owner',
        email: ownerEmail,
        password,
        role: 'user',
        mustChangePassword: false,
        isActive: true,
      },
      {
        fullName: 'Report Viewer',
        email: viewerEmail,
        password,
        role: 'user',
        mustChangePassword: false,
        isActive: true,
      },
    ])

    ownerId = owner._id.toString()
    viewerId = viewer._id.toString()

    const [viewContact, reportContact, editContact] = await Contact.create([
      {
        fullName: 'View Only Shared',
        phone: `+2547${RUN_ID.toString().slice(-8)}`,
        email: `view-${RUN_ID}@example.com`,
        status: 'new',
        ownerId: owner._id,
      },
      {
        fullName: 'Report Shared',
        phone: `+2547${(RUN_ID + 1).toString().slice(-8)}`,
        email: `report-${RUN_ID}@example.com`,
        status: 'contacted',
        ownerId: owner._id,
      },
      {
        fullName: 'Edit Shared',
        phone: `+2547${(RUN_ID + 2).toString().slice(-8)}`,
        email: `edit-${RUN_ID}@example.com`,
        status: 'interested',
        ownerId: owner._id,
      },
    ])

    viewContactId = viewContact._id.toString()
    reportContactId = reportContact._id.toString()
    editContactId = editContact._id.toString()

    await SharedAccess.create([
      { contactId: viewContact._id, ownerId: owner._id, sharedUserId: viewer._id, permission: 'view' },
      { contactId: reportContact._id, ownerId: owner._id, sharedUserId: viewer._id, permission: 'report' },
      { contactId: editContact._id, ownerId: owner._id, sharedUserId: viewer._id, permission: 'edit' },
    ])
  })

  after(async () => {
    await SharedAccess.deleteMany({ sharedUserId: viewerId })
    await Contact.deleteMany({ ownerId })
    await User.deleteMany({ email: { $in: [ownerEmail, viewerEmail] } })
    await disconnectDatabase()
  })

  it('includes only report and edit shared contacts in reportableContacts', async () => {
    const viewer = authUser(viewerId, viewerEmail)
    const reportable = await contactService.reportableContacts(viewer)
    const ids = reportable.map((c) => c._id.toString())

    assert.equal(ids.includes(viewContactId), false)
    assert.equal(ids.includes(reportContactId), true)
    assert.equal(ids.includes(editContactId), true)
    assert.equal(ids.length, 2)
  })

  it('excludes view-only shared contacts from exported report conversion details', async () => {
    const viewer = authUser(viewerId, viewerEmail)
    const today = new Date()
    const dateFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const dateTo = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const payload = await exportService.exportReport(
      viewer,
      { format: 'excel', period: 'monthly', dateFrom, dateTo, exportPassword: 'TestPass!123' },
      {},
    )

    const reportData = payload.reportData as {
      conversionDetails: Array<{ clientName: string }>
    } | undefined

    const names = (reportData?.conversionDetails ?? []).map((row) => row.clientName)
    if (payload.content) {
      assert.doesNotMatch(payload.content, /View Only Shared/)
      assert.match(payload.content, /Report Shared/)
      assert.match(payload.content, /Edit Shared/)
    } else {
      assert.equal(names.includes('View Only Shared'), false)
      assert.equal(names.includes('Report Shared'), true)
      assert.equal(names.includes('Edit Shared'), true)
    }
  })
})
