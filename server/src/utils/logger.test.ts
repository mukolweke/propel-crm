import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runWithRequestContext } from './request-context.js'
import { logger } from './logger.js'

describe('logger request correlation', () => {
  it('includes requestId at the root of log entries when context is set', () => {
    const lines: string[] = []
    const original = console.log
    console.log = (line?: unknown) => {
      lines.push(String(line))
    }

    try {
      runWithRequestContext({ requestId: '8d8d0e12-abcd-4ef0-9f12-abcdef123456' }, () => {
        logger.info('Request completed', undefined, { operation: 'login', status: 200 })
      })
    } finally {
      console.log = original
    }

    const entry = JSON.parse(lines[0]!) as Record<string, unknown>
    assert.equal(entry.requestId, '8d8d0e12-abcd-4ef0-9f12-abcdef123456')
    assert.equal(entry.operation, 'login')
    assert.equal(entry.status, 200)
  })
})
