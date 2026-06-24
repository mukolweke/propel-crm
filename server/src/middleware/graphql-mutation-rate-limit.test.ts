import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import { createGraphqlMutationRateLimitMiddleware } from './graphql-mutation-rate-limit.js'

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      user { email }
    }
  }
`

const RESET_MUTATION = `
  mutation RequestReset($input: RequestPasswordResetInput!) {
    requestPasswordReset(input: $input) {
      message
    }
  }
`

function createProbeApp(config?: Parameters<typeof createGraphqlMutationRateLimitMiddleware>[0]) {
  const app = express()
  app.set('trust proxy', 1)
  app.use(express.json())
  app.use(...createGraphqlMutationRateLimitMiddleware(config))
  app.post('/graphql', (_req, res) => {
    res.json({ data: { ok: true } })
  })
  return app
}

describe('graphql mutation rate limiters', () => {
  it('limits login attempts per IP and email', async () => {
    const app = createProbeApp({
      loginMax: 3,
      loginWindowMs: 60_000,
      passwordResetMax: 10,
      passwordResetWindowMs: 60_000,
    })

    const payload = {
      query: LOGIN_MUTATION,
      variables: { input: { email: 'locked@example.com', password: 'wrong' } },
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const res = await request(app).post('/graphql').send(payload).expect(200)
      assert.equal(res.body.data.ok, true)
    }

    const blocked = await request(app).post('/graphql').send(payload).expect(429)
    assert.equal(blocked.body.errors[0].extensions.code, 'RATE_LIMITED')
  })

  it('uses separate buckets per email for the same IP', async () => {
    const app = createProbeApp({
      loginMax: 2,
      loginWindowMs: 60_000,
      passwordResetMax: 10,
      passwordResetWindowMs: 60_000,
    })

    const firstEmail = {
      query: LOGIN_MUTATION,
      variables: { input: { email: 'first@example.com', password: 'wrong' } },
    }
    const secondEmail = {
      query: LOGIN_MUTATION,
      variables: { input: { email: 'second@example.com', password: 'wrong' } },
    }

    await request(app).post('/graphql').send(firstEmail).expect(200)
    await request(app).post('/graphql').send(firstEmail).expect(200)
    await request(app).post('/graphql').send(firstEmail).expect(429)

    await request(app).post('/graphql').send(secondEmail).expect(200)
  })

  it('does not throttle non-login GraphQL traffic', async () => {
    const app = createProbeApp({
      loginMax: 1,
      loginWindowMs: 60_000,
      passwordResetMax: 10,
      passwordResetWindowMs: 60_000,
    })

    await request(app)
      .post('/graphql')
      .send({
        query: LOGIN_MUTATION,
        variables: { input: { email: 'blocked@example.com', password: 'wrong' } },
      })
      .expect(200)

    await request(app)
      .post('/graphql')
      .send({
        query: LOGIN_MUTATION,
        variables: { input: { email: 'blocked@example.com', password: 'wrong' } },
      })
      .expect(429)

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post('/graphql')
        .send({ query: 'query { __typename }' })
        .expect(200)
      assert.equal(res.body.data.ok, true)
    }
  })

  it('limits password reset requests per IP and email', async () => {
    const app = createProbeApp({
      loginMax: 20,
      loginWindowMs: 60_000,
      passwordResetMax: 2,
      passwordResetWindowMs: 60_000,
    })

    const payload = {
      query: RESET_MUTATION,
      variables: { input: { email: 'reset@example.com' } },
    }

    await request(app).post('/graphql').send(payload).expect(200)
    await request(app).post('/graphql').send(payload).expect(200)

    const blocked = await request(app).post('/graphql').send(payload).expect(429)
    assert.match(blocked.body.errors[0].message, /password reset/i)
  })
})
