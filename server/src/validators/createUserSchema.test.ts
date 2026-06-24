import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createUserSchema, parseInput } from './index.js'
import { AppError } from '../utils/errors.js'

const validAgentInput = {
  fullName: 'Jane Agent',
  email: 'jane@example.com',
  password: 'Str0ng!Pass',
}

describe('createUserSchema', () => {
  it('accepts valid agent onboarding input without role', () => {
    const result = parseInput(createUserSchema, validAgentInput)
    assert.equal(result.fullName, 'Jane Agent')
    assert.equal(result.email, 'jane@example.com')
    assert.equal(result.password, 'Str0ng!Pass')
    assert.equal(result.role, 'user')
  })

  it('accepts explicit role: user', () => {
    const result = parseInput(createUserSchema, { ...validAgentInput, role: 'user' })
    assert.equal(result.role, 'user')
  })

  it('rejects role: super_admin', () => {
    assert.throws(
      () => parseInput(createUserSchema, { ...validAgentInput, role: 'super_admin' }),
      (err: unknown) => {
        assert.ok(err instanceof AppError)
        assert.equal(err.code, 'VALIDATION_ERROR')
        assert.equal(err.message, 'Unknown role: super_admin')
        return true
      },
    )
  })

  for (const role of ['client', 'admin', 'tenant_admin', 'guest'] as const) {
    it(`rejects unknown role: ${role}`, () => {
      assert.throws(
        () => parseInput(createUserSchema, { ...validAgentInput, role }),
        (err: unknown) => {
          assert.ok(err instanceof AppError)
          assert.equal(err.code, 'VALIDATION_ERROR')
          assert.equal(err.message, `Unknown role: ${role}`)
          return true
        },
      )
    })
  }

  it('rejects unknown fields on create user input', () => {
    assert.throws(
      () =>
        parseInput(createUserSchema, {
          ...validAgentInput,
          isActive: false,
        } as typeof validAgentInput & { isActive: boolean }),
      (err: unknown) => {
        assert.ok(err instanceof AppError)
        assert.equal(err.code, 'VALIDATION_ERROR')
        return true
      },
    )
  })
})
