import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import { env } from '../../config/env.js'
import { connectDatabase, disconnectDatabase } from '../../config/database.js'
import { createApp } from '../../server.js'
import { User } from '../../models/index.js'
import { BCRYPT_ROUNDS } from '../../utils/password.js'
import { CSRF_TOKEN_COOKIE } from '../../utils/auth-cookies.js'

const RUN_ID = Date.now()
const PASSWORD = 'Str0ng!Pass'
const ADMIN_A_EMAIL = `set-active-admin-a-${RUN_ID}@example.com`
const ADMIN_B_EMAIL = `set-active-admin-b-${RUN_ID}@example.com`
const AGENT_EMAIL = `set-active-agent-${RUN_ID}@example.com`

function extractCookie(setCookieHeader: string[] | undefined, name: string): string | undefined {
  if (!setCookieHeader) return undefined
  const entry = setCookieHeader.find((line) => line.startsWith(`${name}=`))
  if (!entry) return undefined
  return entry.split(';')[0]
}

function cookieHeader(setCookieHeader: string[] | undefined, names: string[]): string {
  return names
    .map((name) => extractCookie(setCookieHeader, name))
    .filter((value): value is string => Boolean(value))
    .join('; ')
}

function setCookieArray(header: string | string[] | undefined): string[] {
  if (!header) return []
  return Array.isArray(header) ? header : [header]
}

async function login(app: Awaited<ReturnType<typeof createApp>>, email: string) {
  const res = await request(app)
    .post('/graphql')
    .send({
      query: `
        mutation Login($input: LoginInput!) {
          login(input: $input) { user { id } }
        }
      `,
      variables: { input: { email, password: PASSWORD, remember: false } },
    })
    .expect(200)

  assert.equal(res.body.errors, undefined)
  const cookies = setCookieArray(res.headers['set-cookie'])
  const csrf = extractCookie(cookies, CSRF_TOKEN_COOKIE)?.split('=')[1]
  assert.ok(csrf)
  return { cookies, csrf: decodeURIComponent(csrf!) }
}

function postSetUserActive(
  app: Awaited<ReturnType<typeof createApp>>,
  auth: { cookies: string[]; csrf: string },
  userId: string,
  isActive: boolean,
) {
  return request(app)
    .post('/graphql')
    .set(
      'Cookie',
      cookieHeader(auth.cookies, ['propel_access_token', 'propel_refresh_token', CSRF_TOKEN_COOKIE]),
    )
    .set('X-CSRF-Token', auth.csrf)
    .send({
      query: `
        mutation SetUserActive($userId: ID!, $isActive: Boolean!) {
          setUserActive(userId: $userId, isActive: $isActive) {
            id isActive role
          }
        }
      `,
      variables: { userId, isActive },
    })
}

describe('setUserActive super admin guard', { skip: !env.MONGODB_URI }, () => {
  let app: Awaited<ReturnType<typeof createApp>>
  let adminAId: string
  let adminBId: string
  let agentId: string

  before(async () => {
    await connectDatabase()
    app = await createApp()

    const password = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS)
    const [adminA, adminB, agent] = await User.create([
      {
        fullName: 'Admin A',
        email: ADMIN_A_EMAIL,
        password,
        role: 'super_admin',
        mustChangePassword: false,
        isActive: true,
      },
      {
        fullName: 'Admin B',
        email: ADMIN_B_EMAIL,
        password,
        role: 'super_admin',
        mustChangePassword: false,
        isActive: true,
      },
      {
        fullName: 'Agent User',
        email: AGENT_EMAIL,
        password,
        role: 'user',
        mustChangePassword: false,
        isActive: true,
      },
    ])

    adminAId = adminA._id.toString()
    adminBId = adminB._id.toString()
    agentId = agent._id.toString()
  })

  after(async () => {
    await User.deleteMany({
      email: { $in: [ADMIN_A_EMAIL, ADMIN_B_EMAIL, AGENT_EMAIL] },
    })
    await disconnectDatabase()
  })

  it('rejects deactivating another super_admin via GraphQL', async () => {
    const auth = await login(app, ADMIN_A_EMAIL)

    const res = await postSetUserActive(app, auth, adminBId, false).expect(200)

    assert.ok(res.body.errors?.length)
    assert.match(res.body.errors[0].message, /super admin/i)
    assert.equal(res.body.data?.setUserActive, undefined)

    const target = await User.findById(adminBId)
    assert.equal(target?.isActive, true)
  })

  it('allows deactivating a regular user via GraphQL', async () => {
    const auth = await login(app, ADMIN_A_EMAIL)

    const res = await postSetUserActive(app, auth, agentId, false).expect(200)

    assert.equal(res.body.errors, undefined)
    assert.equal(res.body.data.setUserActive.isActive, false)

    const agent = await User.findById(agentId)
    assert.equal(agent?.isActive, false)
  })

  it('allows reactivating an inactive super_admin via GraphQL', async () => {
    await User.findByIdAndUpdate(adminBId, { isActive: false })

    const auth = await login(app, ADMIN_A_EMAIL)
    const res = await postSetUserActive(app, auth, adminBId, true).expect(200)

    assert.equal(res.body.errors, undefined)
    assert.equal(res.body.data.setUserActive.isActive, true)

    const target = await User.findById(adminBId)
    assert.equal(target?.isActive, true)
  })
})
