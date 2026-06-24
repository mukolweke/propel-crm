import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import { env } from '../config/env.js'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { createApp } from '../server.js'
import { User } from '../models/index.js'
import { BCRYPT_ROUNDS } from '../utils/password.js'
import { CSRF_TOKEN_COOKIE } from '../utils/auth-cookies.js'

const TEST_EMAIL = `cookie-flow-${Date.now()}@example.com`
const TEST_PASSWORD = 'Str0ng!Pass'

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

describe('cookie auth flow', { skip: !env.MONGODB_URI }, () => {
  let app: Awaited<ReturnType<typeof createApp>>
  let authCookies: string[]

  before(async () => {
    await connectDatabase()
    app = await createApp()

    const password = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS)
    await User.create({
      fullName: 'Cookie Flow User',
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

  it('login → authenticated query → refresh → logout', async () => {
    const loginRes = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation Login($input: LoginInput!) {
            login(input: $input) {
              mustChangePassword
              user { id email role }
            }
          }
        `,
        variables: { input: { email: TEST_EMAIL, password: TEST_PASSWORD, remember: false } },
      })
      .expect(200)

    assert.equal(loginRes.body.errors, undefined)
    assert.equal(loginRes.body.data.login.user.email, TEST_EMAIL)
    authCookies = Array.isArray(loginRes.headers['set-cookie'])
      ? (loginRes.headers['set-cookie'] as string[])
      : loginRes.headers['set-cookie']
        ? [loginRes.headers['set-cookie'] as string]
        : []
    assert.ok(authCookies?.length)

    const csrf = extractCookie(authCookies, CSRF_TOKEN_COOKIE)?.split('=')[1]
    assert.ok(csrf)

    const meRes = await request(app)
      .post('/graphql')
      .set('Cookie', cookieHeader(authCookies, ['propel_access_token', 'propel_refresh_token', CSRF_TOKEN_COOKIE]))
      .set('X-CSRF-Token', decodeURIComponent(csrf!))
      .send({
        query: `query Me { me { id email } }`,
      })
      .expect(200)

    assert.equal(meRes.body.errors, undefined)
    assert.equal(meRes.body.data.me.email, TEST_EMAIL)

    const refreshRes = await request(app)
      .post('/graphql')
      .set('Cookie', cookieHeader(authCookies, ['propel_refresh_token']))
      .send({
        query: `mutation { refreshSession { success } }`,
      })
      .expect(200)

    assert.equal(refreshRes.body.errors, undefined)
    assert.equal(refreshRes.body.data.refreshSession.success, true)
    const refreshedCookies = Array.isArray(refreshRes.headers['set-cookie'])
      ? (refreshRes.headers['set-cookie'] as string[])
      : refreshRes.headers['set-cookie']
        ? [refreshRes.headers['set-cookie'] as string]
        : []
    assert.ok(refreshedCookies?.length)

    const refreshedCsrf = extractCookie(refreshedCookies, CSRF_TOKEN_COOKIE)?.split('=')[1]
    const logoutRes = await request(app)
      .post('/graphql')
      .set(
        'Cookie',
        cookieHeader(refreshedCookies, ['propel_access_token', 'propel_refresh_token', CSRF_TOKEN_COOKIE]),
      )
      .set('X-CSRF-Token', decodeURIComponent(refreshedCsrf!))
      .send({ query: `mutation { logout }` })
      .expect(200)

    assert.equal(logoutRes.body.errors, undefined)
    assert.equal(logoutRes.body.data.logout, true)

    const afterLogout = await request(app)
      .post('/graphql')
      .send({ query: `query Me { me { id } }` })
      .expect(200)

    assert.equal(afterLogout.body.data.me, null)
  })
})
