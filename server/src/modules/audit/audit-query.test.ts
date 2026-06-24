import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildAuditLogQuery } from './audit-query.js'

describe('buildAuditLogQuery', () => {
  it('uses case-insensitive partial match for action', () => {
    const query = buildAuditLogQuery({ page: 1, pageSize: 20, action: 'login' })
    const action = (query as { action: RegExp }).action
    assert.ok(action instanceof RegExp)
    assert.match('USER_LOGIN', action)
  })

  it('uses case-insensitive partial match for entity type', () => {
    const query = buildAuditLogQuery({ page: 1, pageSize: 20, entityType: 'contact' })
    const entityType = (query as { entityType: RegExp }).entityType
    assert.ok(entityType instanceof RegExp)
    assert.match('CONTACT', entityType)
  })

  it('searches across action, entity type, and ip with search field', () => {
    const query = buildAuditLogQuery({ page: 1, pageSize: 20, search: 'export' })
    const or = (query as { $or: Array<Record<string, RegExp>> }).$or
    assert.equal(or.length, 3)
    assert.match('EXPORT_GENERATED', or[0]!.action)
  })

  it('combines field filters with search using $and', () => {
    const query = buildAuditLogQuery({
      page: 1,
      pageSize: 20,
      entityType: 'REPORT',
      search: '127.0.0.1',
    }) as { $and: Array<Record<string, unknown>> }

    assert.equal(query.$and.length, 2)
    assert.ok((query.$and[0]!.entityType as RegExp).test('REPORT'))
    assert.ok(Array.isArray(query.$and[1]!.$or))
  })
})
