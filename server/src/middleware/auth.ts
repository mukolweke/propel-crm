import type { Request } from 'express'
import type { GraphQLContext } from '../types/index.js'
import { verifyAccessToken, extractBearerToken } from '../utils/jwt.js'

export function buildContext(
  authHeader?: string,
  ip?: string,
  userAgent?: string,
): GraphQLContext {
  const token = extractBearerToken(authHeader)
  const user = token ? verifyAccessToken(token) : null
  return { user, ip, userAgent }
}

export function requireAuth(context: GraphQLContext) {
  if (!context.user) throw new Error('UNAUTHENTICATED')
  return context.user
}

export function getRequestMeta(req: Request) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] }
}
