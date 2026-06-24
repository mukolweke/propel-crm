import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'
import mongoSanitize from 'express-mongo-sanitize'
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { createApp } from '../server.js'
import { User } from '../models/index.js'
import { BCRYPT_ROUNDS } from '../utils/password.js'

const TEST_EMAIL = `mongo-sanitize-${Date.now()}@example.com`
const TEST_PASSWORD = 'Str0ng!Pass'

function createSanitizeProbeApp() {
  const app = express()
  app.use(express.json())
  app.use(mongoSanitize())
  app.post('/probe', (req, res) => {
    res.json(req.body)
  })
  return app
}

describe('express-mongo-sanitize middleware', () => {
  it('removes MongoDB operator keys from JSON bodies', async () => {
    const app = createSanitizeProbeApp()

    const res = await request(app)
      .post('/probe')
      .send({
        query: 'query { me { id } }',
        variables: {
          $gt: 'injected',
          input: { email: 'user@example.com', password: 'secret' },
        },
      })
      .expect(200)

    assert.equal(res.body.query, 'query { me { id } }')
    assert.equal(res.body.variables.$gt, undefined)
    assert.deepEqual(res.body.variables.input, {
      email: 'user@example.com',
      password: 'secret',
    })
  })

  it('removes dotted keys used for operator injection', async () => {
    const app = createSanitizeProbeApp()

    const res = await request(app)
      .post('/probe')
      .send({
        variables: {
          'role.admin': true,
          input: { fullName: 'Jane Doe' },
        },
      })
      .expect(200)

    assert.equal(res.body.variables['role.admin'], undefined)
    assert.deepEqual(res.body.variables.input, { fullName: 'Jane Doe' })
  })

  it('leaves normal GraphQL payloads unchanged', async () => {
    const app = createSanitizeProbeApp()

    const payload = {
      query: `
        mutation Login($input: LoginInput!) {
          login(input: $input) { user { email } }
        }
      `,
      variables: {
        input: {
          email: 'user@example.com',
          password: 'Str0ng!Pass',
          remember: false,
        },
      },
      operationName: 'Login',
    }

    const res = await request(app).post('/probe').send(payload).expect(200)

    assert.deepEqual(res.body, payload)
  })
})

describe('graphql health with mongo sanitize', () => {
  it('health endpoint is unaffected', async () => {
    const app = await createApp()
    const res = await request(app).get('/health').expect(200)
    assert.equal(res.body.status, 'ok')
  })
})

describe('graphql route with mongo sanitize', { skip: !env.MONGODB_URI }, () => {
  let app: Awaited<ReturnType<typeof createApp>>

  before(async () => {
    await connectDatabase()
    app = await createApp()

    const password = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS)
    await User.create({
      fullName: 'Mongo Sanitize User',
      email: TEST_EMAIL,
      password,
      role: 'user',
      mustChangePassword: false,
      isActive: true,
    })
  })

  after(async () => {
    await User.deleteOne({ email: TEST_EMAIL })
    await disconnectDatabase()
  })

  it('allows valid login mutation through /graphql', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation Login($input: LoginInput!) {
            login(input: $input) {
              mustChangePassword
              user { id email }
            }
          }
        `,
        variables: {
          input: { email: TEST_EMAIL, password: TEST_PASSWORD, remember: false },
        },
      })
      .expect(200)

    assert.equal(res.body.errors, undefined)
    assert.equal(res.body.data.login.user.email, TEST_EMAIL)
  })

  it('strips operator keys from variables without breaking valid fields', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation Login($input: LoginInput!) {
            login(input: $input) {
              user { email }
            }
          }
        `,
        variables: {
          $where: 'injected',
          input: { email: TEST_EMAIL, password: TEST_PASSWORD, remember: false },
        },
      })
      .expect(200)

    assert.equal(res.body.errors, undefined)
    assert.equal(res.body.data.login.user.email, TEST_EMAIL)
  })
})
