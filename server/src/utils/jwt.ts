import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { AuthUser, TokenPair } from '../types/index.js'

interface AccessPayload extends AuthUser {
  type: 'access'
}

interface RefreshPayload {
  id: string
  email: string
  type: 'refresh'
}

export function signAccessToken(user: AuthUser): string {
  const payload: AccessPayload = { ...user, type: 'access' }
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'] }
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options)
}

export function signRefreshToken(user: AuthUser): string {
  const payload: RefreshPayload = { id: user.id, email: user.email, type: 'refresh' }
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] }
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options)
}

export function signTokenPair(user: AuthUser): TokenPair {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  }
}

export function verifyAccessToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload
    if (payload.type !== 'access') return null
    return { id: payload.id, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): RefreshPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload
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
