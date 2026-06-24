import { AppError } from '../src/utils/errors.js'
import { validatePassword } from '../src/utils/password.js'

export class SeedConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SeedConfigError'
  }
}

export function resolveSeedAdminConfig(
  env: NodeJS.ProcessEnv = process.env,
): { email: string; password: string } {
  const email = env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = env.SEED_ADMIN_PASSWORD

  if (!email) {
    throw new SeedConfigError(
      'SEED_ADMIN_EMAIL is required. Set it in the environment before running seed.',
    )
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    throw new SeedConfigError('SEED_ADMIN_EMAIL must be a valid email address.')
  }

  if (!password) {
    throw new SeedConfigError(
      'SEED_ADMIN_PASSWORD is required. Set it in the environment before running seed.',
    )
  }

  try {
    validatePassword(password)
  } catch (err) {
    if (err instanceof AppError) {
      throw new SeedConfigError(`SEED_ADMIN_PASSWORD is invalid: ${err.message}`)
    }
    throw err
  }

  return { email, password }
}
