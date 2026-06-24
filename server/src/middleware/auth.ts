import type { Request } from 'express'
import type { AuthUser, GraphQLContext } from '../types/index.js'
import { User } from '../models/index.js'
import { verifyAccessToken, extractBearerToken } from '../utils/jwt.js'
import { getAccessTokenFromCookies } from '../utils/auth-cookies.js'

export function mapDbUserToAuthUser(user: {
  _id: { toString(): string }
  email: string
  role: AuthUser['role']
  mustChangePassword: boolean
}): AuthUser {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  }
}

/** Loads a live user record for authorization — role and status always come from the DB. */
export async function loadAuthUserFromId(userId: string): Promise<AuthUser | null> {
  const dbUser = await User.findOne({
    _id: userId,
    isActive: true,
    deletedAt: { $exists: false },
  }).select('email role mustChangePassword')

  if (!dbUser) return null
  return mapDbUserToAuthUser(dbUser)
}

async function resolveAuthUserFromAccessToken(token: string): Promise<AuthUser | null> {
  const payload = verifyAccessToken(token)
  if (!payload) return null
  return loadAuthUserFromId(payload.id)
}

function resolveAccessToken(req: Request): string | null {
  const cookieToken = getAccessTokenFromCookies(req.cookies ?? {})
  if (cookieToken) return cookieToken
  return extractBearerToken(req.headers.authorization)
}

export async function buildContext(req: Request): Promise<GraphQLContext> {
  const token = resolveAccessToken(req)
  const user = token ? await resolveAuthUserFromAccessToken(token) : null
  return {
    user,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    req,
    res: req.res,
  }
}

export function requireAuth(context: GraphQLContext) {
  if (!context.user) throw new Error('UNAUTHENTICATED')
  return context.user
}

export function getRequestMeta(req: Request) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] }
}
