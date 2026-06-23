import crypto from 'node:crypto'

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url')
}

export function generateResetCode(): string {
  return String(crypto.randomInt(100000, 1000000))
}
