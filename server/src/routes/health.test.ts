import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'
import request from 'supertest'
import mongoose from 'mongoose'
import { createApp } from '../server.js'
import { connectDatabase, disconnectDatabase } from '../config/database.js'

describe('health endpoints', () => {
  let app: Awaited<ReturnType<typeof createApp>>

  before(async () => {
    await connectDatabase()
    app = await createApp()
  })

  after(async () => {
    await disconnectDatabase()
  })

  it('GET /health/live returns liveness payload', async () => {
    const res = await request(app).get('/health/live').expect(200)
    assert.equal(res.body.status, 'ok')
    assert.equal(res.body.check, 'live')
    assert.ok(res.body.timestamp)
  })

  it('GET /health/ready reflects MongoDB connectivity and latency', async () => {
    const res = await request(app).get('/health/ready')
    const mongoConnected = mongoose.connection.readyState === mongoose.ConnectionStates.connected
    assert.equal(res.status, mongoConnected ? 200 : 503)
    assert.equal(res.body.check, 'ready')
    assert.equal(res.body.status, mongoConnected ? 'ready' : 'not_ready')
    assert.equal(typeof res.body.mongoLatency, 'number')
    assert.ok(res.body.mongoLatency >= 0)
    assert.equal(res.body.checks.mongodb.state, mongoConnected ? 'connected' : 'disconnected')
  })

  it('GET /health returns operational snapshot without secrets', async () => {
    const res = await request(app).get('/health')
    const mongoConnected = mongoose.connection.readyState === mongoose.ConnectionStates.connected
    assert.equal(res.status, mongoConnected ? 200 : 503)
    assert.equal(res.body.service, 'propel-crm-api')
    assert.ok(res.body.version)
    assert.ok(res.body.commit)
    assert.ok(res.body.buildDate)
    assert.ok(res.body.uptimeSeconds >= 0)
    assert.ok(res.body.memory.heapUsedMb >= 0)
    assert.ok(res.body.nodeVersion)
    assert.equal(res.body.environment, process.env.NODE_ENV ?? 'test')
    assert.equal(typeof res.body.checks.mongodb.latencyMs, 'number')
    assert.ok(!('MONGODB_URI' in res.body))
    assert.ok(!('JWT_ACCESS_SECRET' in res.body))
  })
})
