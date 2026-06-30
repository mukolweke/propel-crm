import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { requestIdMiddleware, resolveRequestId } from './request-id.js'

describe('resolveRequestId', () => {
  it('generates a UUID when header is missing', () => {
    const id = resolveRequestId(undefined)
    assert.match(id, /^[\da-f-]{36}$/i)
  })

  it('accepts a valid client-provided ID', () => {
    assert.equal(resolveRequestId('8d8d0e12-abcd-4ef0-9f12-abcdef123456'), '8d8d0e12-abcd-4ef0-9f12-abcdef123456')
  })

  it('rejects overly long or unsafe IDs', () => {
    const generated = resolveRequestId('a'.repeat(100))
    assert.match(generated, /^[\da-f-]{36}$/i)

    const unsafe = resolveRequestId('id with spaces')
    assert.match(unsafe, /^[\da-f-]{36}$/i)
  })
})

describe('requestIdMiddleware', () => {
  it('sets response header and attaches requestId to req', async () => {
    const app = express()
    app.use(requestIdMiddleware)
    app.get('/probe', (req, res) => {
      res.json({ requestId: req.requestId })
    })

    const res = await request(app).get('/probe').expect(200)
    assert.ok(res.headers['x-request-id'])
    assert.equal(res.body.requestId, res.headers['x-request-id'])
  })

  it('echoes a valid inbound x-request-id', async () => {
    const app = express()
    app.use(requestIdMiddleware)
    app.get('/probe', (req, res) => {
      res.json({ requestId: req.requestId })
    })

    const inbound = '8d8d0e12-abcd-4ef0-9f12-abcdef123456'
    const res = await request(app).get('/probe').set('X-Request-Id', inbound).expect(200)
    assert.equal(res.headers['x-request-id'], inbound)
    assert.equal(res.body.requestId, inbound)
  })
})
