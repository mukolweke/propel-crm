import crypto from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { runWithRequestContext } from '../utils/request-context.js'

export const REQUEST_ID_HEADER = 'x-request-id'
const MAX_REQUEST_ID_LENGTH = 64
const REQUEST_ID_PATTERN = /^[\w-]+$/

function generateRequestId(): string {
  return crypto.randomUUID()
}

/** Accept client-provided IDs when they are short and URL-safe. */
export function resolveRequestId(headerValue: string | string[] | undefined): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue
  if (typeof raw !== 'string') return generateRequestId()

  const trimmed = raw.trim()
  if (
    trimmed.length > 0 &&
    trimmed.length <= MAX_REQUEST_ID_LENGTH &&
    REQUEST_ID_PATTERN.test(trimmed)
  ) {
    return trimmed
  }

  return generateRequestId()
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER])
  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)

  runWithRequestContext({ requestId }, () => {
    next()
  })
}
