import bcrypt from 'bcryptjs'
import { User } from '../../models/index.js'
import { AppError } from '../../utils/errors.js'
import { signTokenPair } from '../../utils/jwt.js'
import type { AuthUser, TokenPair } from '../../types/index.js'
import { parseInput, registerSchema, loginSchema } from '../../validators/index.js'

const SALT_ROUNDS = 10

function toAuthUser(user: { _id: { toString(): string }; email: string; role: AuthUser['role'] }): AuthUser {
  return { id: user._id.toString(), email: user.email, role: user.role }
}

export const authService = {
  async register(input: unknown) {
    const data = parseInput(registerSchema, input)
    const existing = await User.findOne({ email: data.email })
    if (existing) throw new AppError('Email already registered', 'EMAIL_EXISTS', 409)

    const password = await bcrypt.hash(data.password, SALT_ROUNDS)
    const user = await User.create({
      fullName: data.fullName,
      email: data.email,
      password,
      role: data.role ?? 'agent',
    })

    const authUser = toAuthUser(user)
    return { user: authUser, tokens: signTokenPair(authUser) }
  },

  async login(input: unknown) {
    const data = parseInput(loginSchema, input)
    const user = await User.findOne({ email: data.email }).select('+password')
    if (!user) throw new AppError('Invalid email or password', 'INVALID_CREDENTIALS', 401)

    const valid = await bcrypt.compare(data.password, user.password)
    if (!valid) throw new AppError('Invalid email or password', 'INVALID_CREDENTIALS', 401)

    const authUser = toAuthUser(user)
    return { user: authUser, tokens: signTokenPair(authUser) }
  },

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const { verifyRefreshToken, signTokenPair: sign } = await import('../../utils/jwt.js')
    const payload = verifyRefreshToken(refreshToken)
    if (!payload) throw new AppError('Invalid refresh token', 'INVALID_TOKEN', 401)

    const user = await User.findById(payload.id)
    if (!user) throw new AppError('User not found', 'NOT_FOUND', 404)

    return sign(toAuthUser(user))
  },

  async getMe(userId: string) {
    const user = await User.findById(userId)
    if (!user) throw new AppError('User not found', 'NOT_FOUND', 404)
    return user
  },
}
