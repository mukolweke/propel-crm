import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getBuildMetadata } from './build-metadata.js'

describe('build metadata', () => {
  it('exposes version, commit, buildDate, and environment', () => {
    const metadata = getBuildMetadata()
    assert.ok(metadata.version)
    assert.ok(metadata.commit)
    assert.ok(metadata.buildDate)
    assert.ok(metadata.environment)
  })
})
