import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  createCsrfToken,
  getAccessTokenFromCookies,
  getRefreshTokenFromCookies,
  setAuthCookies,
} from '../utils/auth-cookies.js'

describe('auth-cookies', () => {
  it('sets httpOnly auth cookies and a readable CSRF cookie', () => {
    const setCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = []
    const res = {
      cookie(name: string, value: string, options: Record<string, unknown>) {
        setCalls.push({ name, value, options })
      },
    }

    setAuthCookies(res as never, { accessToken: 'access', refreshToken: 'refresh' }, true)

    const access = setCalls.find((c) => c.name === ACCESS_TOKEN_COOKIE)
    const refresh = setCalls.find((c) => c.name === REFRESH_TOKEN_COOKIE)
    const csrf = setCalls.find((c) => c.name === CSRF_TOKEN_COOKIE)

    assert.ok(access)
    assert.equal(access.options.httpOnly, true)
    assert.equal(access.options.sameSite, 'strict')
    assert.equal(access.value, 'access')

    assert.ok(refresh)
    assert.equal(refresh.options.httpOnly, true)
    assert.equal(refresh.options.path, '/graphql')

    assert.ok(csrf)
    assert.equal(csrf.options.httpOnly, false)
    assert.equal(csrf.options.sameSite, 'strict')
  })

  it('clears all auth cookies', () => {
    const cleared: string[] = []
    const res = {
      clearCookie(name: string) {
        cleared.push(name)
      },
    }

    clearAuthCookies(res as never)
    assert.deepEqual(cleared.sort(), [ACCESS_TOKEN_COOKIE, CSRF_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE].sort())
  })

  it('reads tokens from cookie map', () => {
    const cookies = {
      [ACCESS_TOKEN_COOKIE]: 'a',
      [REFRESH_TOKEN_COOKIE]: 'r',
    }
    assert.equal(getAccessTokenFromCookies(cookies), 'a')
    assert.equal(getRefreshTokenFromCookies(cookies), 'r')
  })

  it('creates unique csrf tokens', () => {
    const a = createCsrfToken()
    const b = createCsrfToken()
    assert.notEqual(a, b)
    assert.ok(a.length >= 32)
  })
})
