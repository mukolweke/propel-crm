import type { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'
import { extractGraphQLOperationName } from '../utils/graphql-request.js'

function roundMs(durationMs: number): number {
  return Math.round(durationMs * 100) / 100
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint()

  res.on('finish', () => {
    const durationMs = roundMs(Number(process.hrtime.bigint() - start) / 1e6)
    const fields: Record<string, unknown> = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
    }

    if (req.path === '/graphql') {
      const operation = extractGraphQLOperationName(req.body)
      if (operation) fields.operation = operation
    }

    if (req.path.startsWith('/health')) {
      logger.info('Request completed', undefined, fields)
    } else if (res.statusCode >= 500) {
      logger.error('Request completed', undefined, fields)
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed', undefined, fields)
    } else {
      logger.info('Request completed', undefined, fields)
    }
  })

  next()
}
