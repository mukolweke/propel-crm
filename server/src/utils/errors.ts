import { GraphQLError } from 'graphql'

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }

  toGraphQLError(): GraphQLError {
    return new GraphQLError(this.message, {
      extensions: { code: this.code, statusCode: this.statusCode },
    })
  }
}

import type { AuthUser } from '../types/index.js'

export function assertAuthenticated(user: AuthUser | null | undefined): AuthUser {
  if (!user) {
    throw new AppError('Authentication required', 'UNAUTHENTICATED', 401).toGraphQLError()
  }
  return user
}

export function toGraphQLError(error: unknown): GraphQLError {
  if (error instanceof GraphQLError) return error
  if (error instanceof AppError) return error.toGraphQLError()
  if (error instanceof Error) {
    return new GraphQLError(error.message, { extensions: { code: 'INTERNAL_ERROR' } })
  }
  return new GraphQLError('An unexpected error occurred', { extensions: { code: 'INTERNAL_ERROR' } })
}
