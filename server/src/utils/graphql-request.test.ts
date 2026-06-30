import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractGraphQLOperationName,
  extractMutationEmail,
  extractMutationNames,
  requestHasMutation,
} from '../utils/graphql-request.js'

describe('graphql-request helpers', () => {
  it('extracts operation name from body.operationName', () => {
    const name = extractGraphQLOperationName({
      operationName: 'GetContacts',
      query: 'query { contacts { id } }',
    })
    assert.equal(name, 'GetContacts')
  })

  it('extracts mutation field names from a GraphQL document', () => {
    const names = extractMutationNames(`
      mutation Login($input: LoginInput!) {
        login(input: $input) {
          user { id }
        }
      }
    `)
    assert.deepEqual(names, ['login'])
  })

  it('detects requestPasswordReset mutation', () => {
    const req = {
      body: {
        query: `mutation { requestPasswordReset(input: { email: "a@b.com" }) { message } }`,
      },
    } as Parameters<typeof requestHasMutation>[0]

    assert.equal(requestHasMutation(req, 'requestPasswordReset'), true)
    assert.equal(requestHasMutation(req, 'login'), false)
  })

  it('extracts email from mutation variables', () => {
    const req = {
      body: {
        query: `mutation Login($input: LoginInput!) { login(input: $input) { user { id } } }`,
        variables: { input: { email: 'User@Example.com', password: 'x' } },
      },
    } as Parameters<typeof extractMutationEmail>[0]

    assert.equal(extractMutationEmail(req, 'login'), 'user@example.com')
  })
})
