import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildContactSearchFilter } from './contact-search.js'
import type { AuthUser } from '../../types/index.js'

const agent: AuthUser = {
  id: '507f1f77bcf86cd799439011',
  email: 'agent@example.com',
  role: 'user',
  mustChangePassword: false,
}

describe('buildContactSearchFilter', () => {
  it('scopes search to owner for regular users', () => {
    const filter = buildContactSearchFilter(agent)
    assert.equal(filter.ownerId, agent.id)
    assert.deepEqual(filter.deletedAt, { $exists: false })
    assert.equal(filter.$or, undefined)
  })

  it('adds normalized phone to search conditions', () => {
    const filter = buildContactSearchFilter(agent, '0712345678')
    assert.ok(Array.isArray(filter.$or))
    const phoneMatch = (filter.$or as Record<string, unknown>[]).find(
      (c) => c.phoneNormalized === '+254712345678',
    )
    assert.ok(phoneMatch)
  })

  it('adds normalized email to search conditions', () => {
    const filter = buildContactSearchFilter(agent, 'John@Email.COM')
    assert.ok(Array.isArray(filter.$or))
    const emailMatch = (filter.$or as Record<string, unknown>[]).find(
      (c) => c.emailNormalized === 'john@email.com',
    )
    assert.ok(emailMatch)
  })

  it('does not scope by owner for super admin', () => {
    const admin: AuthUser = { ...agent, role: 'super_admin' }
    const filter = buildContactSearchFilter(admin, 'test')
    assert.equal(filter.ownerId, undefined)
    assert.ok(filter.$or)
  })
})
