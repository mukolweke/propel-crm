import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveDuplicateConflict } from './contact-duplicate.service.js'
import type { AuthUser } from '../../types/index.js'

const agent: AuthUser = {
  id: 'agent-a-id',
  email: 'agent@example.com',
  role: 'user',
  mustChangePassword: false,
}

const superAdmin: AuthUser = {
  id: 'admin-id',
  email: 'admin@example.com',
  role: 'super_admin',
  mustChangePassword: false,
}

const ownerInfo = {
  duplicateOwnerId: 'owner-b-id',
  duplicateOwnerEmail: 'michael@example.com',
  duplicateOwnerName: 'Michael O.',
}

describe('resolveDuplicateConflict', () => {
  it('returns CONTACT_ALREADY_EXISTS for same-user phone duplicate', () => {
    const result = resolveDuplicateConflict(agent, 'phone', true)
    assert.equal(result.code, 'CONTACT_ALREADY_EXISTS')
    assert.equal(result.field, 'phone')
    assert.equal(result.message, 'Contact already exists in your account.')
    assert.equal(result.extra, undefined)
  })

  it('returns CONTACT_ALREADY_EXISTS for same-user email duplicate', () => {
    const result = resolveDuplicateConflict(agent, 'email', true)
    assert.equal(result.code, 'CONTACT_ALREADY_EXISTS')
    assert.equal(result.field, 'email')
  })

  it('returns PHONE_ALREADY_EXISTS without owner info for agents', () => {
    const result = resolveDuplicateConflict(agent, 'phone', false, ownerInfo)
    assert.equal(result.code, 'PHONE_ALREADY_EXISTS')
    assert.equal(result.field, 'phone')
    assert.equal(result.message, 'Phone number already exists under another account.')
    assert.equal(result.extra, undefined)
  })

  it('returns EMAIL_ALREADY_EXISTS without owner info for agents', () => {
    const result = resolveDuplicateConflict(agent, 'email', false, ownerInfo)
    assert.equal(result.code, 'EMAIL_ALREADY_EXISTS')
    assert.equal(result.field, 'email')
    assert.equal(result.extra, undefined)
  })

  it('includes owner details for super admin phone duplicate', () => {
    const result = resolveDuplicateConflict(superAdmin, 'phone', false, ownerInfo)
    assert.equal(result.code, 'PHONE_ALREADY_EXISTS')
    assert.deepEqual(result.extra, ownerInfo)
  })

  it('includes owner details for super admin email duplicate', () => {
    const result = resolveDuplicateConflict(superAdmin, 'email', false, ownerInfo)
    assert.equal(result.code, 'EMAIL_ALREADY_EXISTS')
    assert.deepEqual(result.extra, ownerInfo)
  })
})

describe('buildDuplicateQuery', () => {
  it('ignores soft-deleted contacts via notDeletedFilter', async () => {
    const { buildDuplicateQuery } = await import('./contact-duplicate.service.js')
    const filter = buildDuplicateQuery('0712345678', 'john@email.com')
    assert.ok(filter)
    assert.deepEqual(filter!.deletedAt, { $exists: false })
  })

  it('excludes current contact id on update', async () => {
    const { buildDuplicateQuery } = await import('./contact-duplicate.service.js')
    const filter = buildDuplicateQuery('0712345678', '', '507f1f77bcf86cd799439099')
    assert.ok(filter?._id)
  })

  it('returns null when phone and email are empty', async () => {
    const { buildDuplicateQuery } = await import('./contact-duplicate.service.js')
    assert.equal(buildDuplicateQuery('', ''), null)
  })
})
