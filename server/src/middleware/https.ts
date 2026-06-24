import type { Request, Response, NextFunction } from 'express'
import { isProduction } from '../config/env.js'

/** True when the request reached the app over TLS (directly or via a trusted proxy). */
export function isSecureRequest(req: Request): boolean {
  if (req.secure) return true

  const forwardedProto = req.headers['x-forwarded-proto']
  if (typeof forwardedProto === 'string') {
    const proto = forwardedProto.split(',')[0]?.trim().toLowerCase()
    if (proto === 'https') return true
  }

  return false
}

export function createHttpsEnforcer(requireHttps: boolean) {
  return function enforceHttps(req: Request, res: Response, next: NextFunction): void {
    if (!requireHttps || isSecureRequest(req)) {
      next()
      return
    }

    const host = req.headers.host
    if (!host) {
      res.status(400).json({ error: 'HTTPS required' })
      return
    }

    res.redirect(301, `https://${host}${req.originalUrl}`)
  }
}

/** Redirects plain HTTP to HTTPS in production (relies on `trust proxy`). */
export const enforceHttps = createHttpsEnforcer(isProduction)
