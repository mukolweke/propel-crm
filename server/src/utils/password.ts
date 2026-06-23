import { z } from 'zod'
import { AppError } from './errors.js'

export const PASSWORD_MIN_LENGTH = 8

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128)
  .refine((val) => PASSWORD_REGEX.test(val), {
    message:
      'Password must include uppercase, lowercase, number, and special character',
  })

export function validatePassword(password: string): void {
  const result = passwordSchema.safeParse(password)
  if (!result.success) {
    throw new AppError(result.error.errors[0]?.message ?? 'Invalid password', 'WEAK_PASSWORD', 400)
  }
}

export const BCRYPT_ROUNDS = 12
