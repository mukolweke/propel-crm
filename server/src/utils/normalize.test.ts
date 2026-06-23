import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeEmail, normalizePhone, escapeRegex } from './normalize.js'

describe('normalizePhone', () => {
  it('normalizes local Kenyan format starting with 0', () => {
    assert.equal(normalizePhone('0712345678'), '+254712345678')
  })

  it('normalizes country code without plus', () => {
    assert.equal(normalizePhone('254712345678'), '+254712345678')
  })

  it('keeps international plus format', () => {
    assert.equal(normalizePhone('+254712345678'), '+254712345678')
  })

  it('strips spaces, dashes, and brackets', () => {
    assert.equal(normalizePhone('+254 (712) 345-678'), '+254712345678')
    assert.equal(normalizePhone('07 12 34 56 78'), '+254712345678')
  })

  it('returns empty string for blank input', () => {
    assert.equal(normalizePhone(''), '')
    assert.equal(normalizePhone('   '), '')
    assert.equal(normalizePhone(null), '')
  })

  it('treats equivalent formats as the same value', () => {
    const formats = ['+254712345678', '254712345678', '0712345678']
    const normalized = formats.map((f) => normalizePhone(f))
    assert.deepEqual(new Set(normalized), new Set(['+254712345678']))
  })
})

describe('normalizeEmail', () => {
  it('lowercases and trims emails', () => {
    assert.equal(normalizeEmail('  John@Email.COM  '), 'john@email.com')
  })

  it('returns empty string for blank input', () => {
    assert.equal(normalizeEmail(''), '')
    assert.equal(normalizeEmail(undefined), '')
  })
})

describe('escapeRegex', () => {
  it('escapes special regex characters', () => {
    assert.equal(escapeRegex('a+b(c)'), 'a\\+b\\(c\\)')
  })
})
