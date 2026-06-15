import type { GraphQLContext } from '../types/index.js'
import { verifyAccessToken, extractBearerToken } from '../utils/jwt.js'

export function buildContext(authHeader?: string): GraphQLContext {
  const token = extractBearerToken(authHeader)
  const user = token ? verifyAccessToken(token) : null
  return { user }
}

export function requireAuth(context: GraphQLContext) {
  if (!context.user) {
    throw new Error('UNAUTHENTICATED')
  }
  return context.user
}
