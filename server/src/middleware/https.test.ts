import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response } from 'express'
import { createHttpsEnforcer, isSecureRequest } from './https.js'

function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    secure: false,
    headers: {},
    hostname: 'api.example.com',
    originalUrl: '/graphql',
    ...overrides,
  } as Request
}

describe('isSecureRequest', () => {
  it('returns true when req.secure is set', () => {
    assert.equal(isSecureRequest(mockRequest({ secure: true })), true)
  })

  it('returns true when x-forwarded-proto is https', () => {
    assert.equal(
      isSecureRequest(mockRequest({ headers: { 'x-forwarded-proto': 'https' } })),
      true,
    )
  })

  it('returns true when x-forwarded-proto lists https first', () => {
    assert.equal(
      isSecureRequest(mockRequest({ headers: { 'x-forwarded-proto': 'https, http' } })),
      true,
    )
  })

  it('returns false for plain HTTP without forwarded proto', () => {
    assert.equal(isSecureRequest(mockRequest()), false)
  })

  it('returns false when x-forwarded-proto is http', () => {
    assert.equal(
      isSecureRequest(mockRequest({ headers: { 'x-forwarded-proto': 'http' } })),
      false,
    )
  })
})

describe('createHttpsEnforcer', () => {
  it('redirects HTTP to HTTPS when enforcement is enabled', () => {
    const enforce = createHttpsEnforcer(true)
    const req = mockRequest({ headers: { host: 'api.example.com' }, originalUrl: '/health' })
    let statusCode = 0
    let location = ''

    const res = {
      redirect(code: number, url: string) {
        statusCode = code
        location = url
      },
      status() {
        return this
      },
      json() {
        return this
      },
    } as unknown as Response

    let calledNext = false
    enforce(req, res, () => {
      calledNext = true
    })

    assert.equal(calledNext, false)
    assert.equal(statusCode, 301)
    assert.equal(location, 'https://api.example.com/health')
  })

  it('passes through HTTPS requests when enforcement is enabled', () => {
    const enforce = createHttpsEnforcer(true)
    const req = mockRequest({ secure: true })
    let calledNext = false

    enforce(req, { redirect() {} } as Response, () => {
      calledNext = true
    })

    assert.equal(calledNext, true)
  })

  it('does not redirect when enforcement is disabled', () => {
    const enforce = createHttpsEnforcer(false)
    let calledNext = false

    enforce(mockRequest(), { redirect() {} } as Response, () => {
      calledNext = true
    })

    assert.equal(calledNext, true)
  })
})
