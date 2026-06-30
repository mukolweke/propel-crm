import { getRequestId } from './request-context.js'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const SENSITIVE_KEY_PATTERN =
  /password|passwd|token|authorization|cookie|csrf|secret|jwt|api[_-]?key|credential/i

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key)
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack && process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
    }
  }
  return { message: String(error) }
}

function redactMeta(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]'
  if (value === null || value === undefined) return value

  if (value instanceof Error) return serializeError(value)

  if (Array.isArray(value)) {
    return value.map((item) => redactMeta(item, depth + 1))
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = isSensitiveKey(key) ? '[REDACTED]' : redactMeta(nested, depth + 1)
    }
    return result
  }

  return value
}

function log(
  level: LogLevel,
  message: string,
  meta?: unknown,
  rootFields?: Record<string, unknown>,
): void {
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
  }

  const requestId = getRequestId()
  if (requestId) entry.requestId = requestId

  if (rootFields) {
    Object.assign(entry, redactMeta(rootFields) as Record<string, unknown>)
  }

  if (meta !== undefined) {
    entry.meta = redactMeta(meta)
  }

  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  fn(JSON.stringify(entry))
}

export const logger = {
  info: (message: string, meta?: unknown, rootFields?: Record<string, unknown>) =>
    log('info', message, meta, rootFields),
  warn: (message: string, meta?: unknown, rootFields?: Record<string, unknown>) =>
    log('warn', message, meta, rootFields),
  error: (message: string, meta?: unknown, rootFields?: Record<string, unknown>) =>
    log('error', message, meta, rootFields),
  debug: (message: string, meta?: unknown, rootFields?: Record<string, unknown>) =>
    log('debug', message, meta, rootFields),
}
