import type { Request, RequestHandler, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { isProduction } from '../config/env.js'
import { extractMutationEmail, requestHasMutation } from '../utils/graphql-request.js'

export type MutationRateLimitConfig = {
  loginMax: number
  loginWindowMs: number
  passwordResetMax: number
  passwordResetWindowMs: number
}

export const DEFAULT_MUTATION_RATE_LIMITS: MutationRateLimitConfig = {
  loginMax: isProduction ? 5 : 200,
  loginWindowMs: 15 * 60 * 1000,
  passwordResetMax: isProduction ? 3 : 100,
  passwordResetWindowMs: 60 * 60 * 1000,
}

function graphqlRateLimitHandler(message: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({
      errors: [
        {
          message,
          extensions: { code: 'RATE_LIMITED', statusCode: 429 },
        },
      ],
    })
  }
}

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown'
}

function mutationRateLimitKey(req: Request, mutationName: string, prefix: string): string {
  const email = extractMutationEmail(req, mutationName)
  const ip = clientIp(req)
  return email ? `${prefix}:${ip}:${email}` : `${prefix}:${ip}`
}

export function createGraphqlMutationRateLimitMiddleware(
  config: MutationRateLimitConfig = DEFAULT_MUTATION_RATE_LIMITS,
): RequestHandler[] {
  const loginLimiter = rateLimit({
    windowMs: config.loginWindowMs,
    max: config.loginMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !requestHasMutation(req, 'login'),
    keyGenerator: (req) => mutationRateLimitKey(req, 'login', 'login'),
    handler: graphqlRateLimitHandler(
      'Too many login attempts. Please try again in 15 minutes.',
    ),
  })

  const passwordResetLimiter = rateLimit({
    windowMs: config.passwordResetWindowMs,
    max: config.passwordResetMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !requestHasMutation(req, 'requestPasswordReset'),
    keyGenerator: (req) => mutationRateLimitKey(req, 'requestPasswordReset', 'password-reset'),
    handler: graphqlRateLimitHandler(
      'Too many password reset requests. Please try again later.',
    ),
  })

  return [loginLimiter, passwordResetLimiter]
}
