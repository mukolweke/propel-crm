import type { Request } from 'express'
import { AppError } from '../utils/errors.js'
import { ACCESS_TOKEN_COOKIE, CSRF_TOKEN_COOKIE } from '../utils/auth-cookies.js'
import { extractMutationNames } from '../utils/graphql-request.js'

const PUBLIC_MUTATIONS = new Set([
  'login',
  'requestPasswordReset',
  'resetPassword',
  'refreshSession',
])

export function assertValidCsrf(req: Request): void {
  const cookies = req.cookies as Record<string, string | undefined> | undefined
  if (!cookies?.[ACCESS_TOKEN_COOKIE]) return

  const query = typeof req.body?.query === 'string' ? req.body.query : ''
  if (!query.toLowerCase().includes('mutation')) return

  const mutations = extractMutationNames(query)
  if (!mutations.length) return
  if (mutations.every((name) => PUBLIC_MUTATIONS.has(name))) return

  const headerToken = req.headers['x-csrf-token']
  const cookieToken = cookies[CSRF_TOKEN_COOKIE]
  if (
    typeof headerToken !== 'string' ||
    typeof cookieToken !== 'string' ||
    headerToken.length === 0 ||
    headerToken !== cookieToken
  ) {
    throw new AppError('Invalid or missing CSRF token', 'CSRF_INVALID', 403)
  }
}
