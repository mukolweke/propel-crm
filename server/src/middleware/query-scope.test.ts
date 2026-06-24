import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Types } from 'mongoose'
import {
  buildContactScopedFilter,
  buildOwnerEntityFilter,
} from './query-scope.js'

describe('buildContactScopedFilter', () => {
  const userId = new Types.ObjectId().toString()
  const contactId = new Types.ObjectId().toString()
  const sharedId = new Types.ObjectId()

  it('scopes owner-only lookups to ownerId', () => {
    const filter = buildContactScopedFilter(userId, contactId, [], 'owner')
    assert.equal(filter._id, contactId)
    assert.equal(filter.ownerId, userId)
    assert.equal(filter.$or, undefined)
  })

  it('uses $or for view access with owner and shared contact ids', () => {
    const filter = buildContactScopedFilter(userId, contactId, [sharedId], 'view')
    assert.equal(filter._id, contactId)
    assert.deepEqual(filter.$or, [{ ownerId: userId }, { _id: { $in: [sharedId] } }])
  })

  it('uses $or with owner only when no shares exist for view mode', () => {
    const filter = buildContactScopedFilter(userId, contactId, [], 'view')
    assert.deepEqual(filter.$or, [{ ownerId: userId }])
  })

  it('uses edit share permissions via edit mode filter shape', () => {
    const filter = buildContactScopedFilter(userId, contactId, [sharedId], 'edit')
    assert.deepEqual(filter.$or, [{ ownerId: userId }, { _id: { $in: [sharedId] } }])
  })
})

describe('buildOwnerEntityFilter', () => {
  const userId = new Types.ObjectId().toString()
  const entityId = new Types.ObjectId().toString()

  it('scopes non-admin lookups to ownerId', () => {
    const filter = buildOwnerEntityFilter(userId, entityId, false)
    assert.equal(filter._id, entityId)
    assert.equal(filter.ownerId, userId)
  })

  it('does not add ownerId for super admin', () => {
    const filter = buildOwnerEntityFilter(userId, entityId, true)
    assert.equal(filter._id, entityId)
    assert.equal(filter.ownerId, undefined)
  })
})
