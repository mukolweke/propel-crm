import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { escapeCsv } from './reportExport.ts'

describe('escapeCsv', () => {
  it('neutralizes Excel formula injection payload as text', () => {
    const payload = "=cmd|' /C calc'!A0"
    const escaped = escapeCsv(payload)

    assert.equal(escaped, "'=cmd|' /C calc'!A0")
    assert.match(escaped, /^'[=+\-@]/)
  })

  it('prefixes fields starting with formula characters', () => {
    assert.equal(escapeCsv('+123'), "'+123")
    assert.equal(escapeCsv('-sum(A1)'), "'-sum(A1)")
    assert.equal(escapeCsv('@SUM(A1)'), "'@SUM(A1)")
    assert.equal(escapeCsv('\ttabbed'), "'\ttabbed")
    assert.equal(escapeCsv('\rreturn'), "'\rreturn")
  })

  it('preserves comma, quote, and newline escaping', () => {
    assert.equal(escapeCsv('hello, world'), '"hello, world"')
    assert.equal(escapeCsv('say "hi"'), '"say ""hi"""')
    assert.equal(escapeCsv('line1\nline2'), '"line1\nline2"')
  })

  it('applies formula neutralization before comma quoting', () => {
    assert.equal(escapeCsv('=1+1,extra'), `"'=1+1,extra"`)
  })

  it('leaves normal values unchanged', () => {
    assert.equal(escapeCsv('Jane Doe'), 'Jane Doe')
    assert.equal(escapeCsv('KES 1,200,000'), '"KES 1,200,000"')
  })
})
