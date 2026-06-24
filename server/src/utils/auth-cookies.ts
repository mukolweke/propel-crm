import type { CookieOptions, Response } from 'express'
import crypto from 'node:crypto'
import { env, isProduction } from '../config/env.js'
import type { TokenPair } from '../types/index.js'

export const ACCESS_TOKEN_COOKIE = 'propel_access_token'
export const REFRESH_TOKEN_COOKIE = 'propel_refresh_token'
export const CSRF_TOKEN_COOKIE = 'propel_csrf'

const REMEMBER_REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function parseDurationMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim())
  if (!match) return fallbackMs
  const amount = Number(match[1])
  const unit = match[2]
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }
  return amount * (multipliers[unit] ?? 1000)
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  }
}

export function createCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function setAuthCookies(res: Response, tokens: TokenPair, remember = false): string {
  const accessMaxAge = parseDurationMs(env.JWT_ACCESS_EXPIRES_IN, 15 * 60 * 1000)
  const refreshMaxAge = remember
    ? REMEMBER_REFRESH_MAX_AGE_MS
    : parseDurationMs(env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000)

  const csrfToken = createCsrfToken()

  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(),
    maxAge: accessMaxAge,
  })

  const refreshOptions: CookieOptions = {
    ...baseCookieOptions(),
    path: '/graphql',
  }
  if (remember) {
    refreshOptions.maxAge = refreshMaxAge
  } else {
    refreshOptions.maxAge = refreshMaxAge
  }
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, refreshOptions)

  res.cookie(CSRF_TOKEN_COOKIE, csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: refreshMaxAge,
  })

  return csrfToken
}

export function clearAuthCookies(res: Response): void {
  const clearOpts: CookieOptions = { path: '/', httpOnly: true, secure: isProduction, sameSite: 'strict' }
  res.clearCookie(ACCESS_TOKEN_COOKIE, clearOpts)
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...clearOpts, path: '/graphql' })
  res.clearCookie(CSRF_TOKEN_COOKIE, { path: '/', secure: isProduction, sameSite: 'strict' })
}

export function getAccessTokenFromCookies(cookies: Record<string, string | undefined>): string | null {
  const token = cookies[ACCESS_TOKEN_COOKIE]
  return token?.trim() || null
}

export function getRefreshTokenFromCookies(cookies: Record<string, string | undefined>): string | null {
  const token = cookies[REFRESH_TOKEN_COOKIE]
  return token?.trim() || null
}
