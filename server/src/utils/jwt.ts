import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { AuthUser } from '../types/index.js'

interface AccessPayload extends AuthUser {
  type: 'access'
}

interface RefreshPayload {
  id: string
  email: string
  role: AuthUser['role']
  type: 'refresh'
  tokenId: string
  rawToken: string
}

const signOptions = (expiresIn: string): SignOptions => ({
  expiresIn: expiresIn as SignOptions['expiresIn'],
  algorithm: 'HS256',
  issuer: 'propel-crm',
  audience: 'propel-crm-client',
})

export function signAccessToken(user: AuthUser): string {
  const payload: AccessPayload = { ...user, type: 'access' }
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, signOptions(env.JWT_ACCESS_EXPIRES_IN))
}

export function signRefreshToken(user: AuthUser, rawToken: string, tokenId: string): string {
  const payload: RefreshPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
    tokenId,
    rawToken,
  }
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, signOptions(env.JWT_REFRESH_EXPIRES_IN))
}

export function verifyAccessToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: 'propel-crm',
      audience: 'propel-crm-client',
    }) as AccessPayload
    if (payload.type !== 'access') return null
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword,
    }
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): RefreshPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
      issuer: 'propel-crm',
      audience: 'propel-crm-client',
    }) as RefreshPayload
    if (payload.type !== 'refresh') return null
    return payload
  } catch {
    return null
  }
}

export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7).trim() || null
}
