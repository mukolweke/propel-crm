import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Types } from 'mongoose'
import {
  canReportContact,
  canViewContact,
} from './authorization.js'

const ownerId = new Types.ObjectId().toString()
const viewerId = new Types.ObjectId().toString()

function contact() {
  return { ownerId: new Types.ObjectId(ownerId) }
}

describe('canReportContact', () => {
  it('allows owners', () => {
    assert.equal(canReportContact(ownerId, contact()), true)
  })

  it('denies view-only shared access', () => {
    const shares = [{ sharedUserId: new Types.ObjectId(viewerId), permission: 'view' as const }]
    assert.equal(canViewContact(viewerId, contact(), shares), true)
    assert.equal(canReportContact(viewerId, contact(), shares), false)
  })

  it('allows report shared access', () => {
    const shares = [{ sharedUserId: new Types.ObjectId(viewerId), permission: 'report' as const }]
    assert.equal(canReportContact(viewerId, contact(), shares), true)
  })

  it('allows edit shared access', () => {
    const shares = [{ sharedUserId: new Types.ObjectId(viewerId), permission: 'edit' as const }]
    assert.equal(canReportContact(viewerId, contact(), shares), true)
  })
})
