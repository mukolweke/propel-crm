import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  DEFAULT_PHONE_COUNTRY_CODE: z.string().regex(/^\d+$/).default('254'),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(2525),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().email().default('noreply@propelcrm.com'),
  PASSWORD_RESET_CODE_TTL_MINUTES: z.coerce.number().min(5).max(60).default(15),
  PASSWORD_RESET_MAX_ATTEMPTS: z.coerce.number().min(3).max(10).default(5),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim())

export const isProduction = env.NODE_ENV === 'production'
