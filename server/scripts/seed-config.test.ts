import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSeedAdminConfig, SeedConfigError } from './seed-config.js'

describe('resolveSeedAdminConfig', () => {
  it('returns email and password when both env vars are set and password is strong', () => {
    const result = resolveSeedAdminConfig({
      SEED_ADMIN_EMAIL: ' Admin@Example.COM ',
      SEED_ADMIN_PASSWORD: 'Str0ng!Pass',
    })
    assert.equal(result.email, 'admin@example.com')
    assert.equal(result.password, 'Str0ng!Pass')
  })

  it('fails when SEED_ADMIN_PASSWORD is unset', () => {
    assert.throws(
      () =>
        resolveSeedAdminConfig({
          SEED_ADMIN_EMAIL: 'admin@example.com',
        }),
      (err: unknown) => {
        assert.ok(err instanceof SeedConfigError)
        assert.match(err.message, /SEED_ADMIN_PASSWORD is required/)
        return true
      },
    )
  })

  it('fails when SEED_ADMIN_EMAIL is unset', () => {
    assert.throws(
      () =>
        resolveSeedAdminConfig({
          SEED_ADMIN_PASSWORD: 'Str0ng!Pass',
        }),
      (err: unknown) => {
        assert.ok(err instanceof SeedConfigError)
        assert.match(err.message, /SEED_ADMIN_EMAIL is required/)
        return true
      },
    )
  })

  it('fails when password does not meet policy', () => {
    assert.throws(
      () =>
        resolveSeedAdminConfig({
          SEED_ADMIN_EMAIL: 'admin@example.com',
          SEED_ADMIN_PASSWORD: 'weak',
        }),
      (err: unknown) => {
        assert.ok(err instanceof SeedConfigError)
        assert.match(err.message, /SEED_ADMIN_PASSWORD is invalid/)
        return true
      },
    )
  })
})
