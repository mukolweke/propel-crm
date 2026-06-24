import { getCsrfToken } from '@/utils/csrf'

export const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL ?? '/graphql'

export interface GraphQLErrorItem {
  message: string
  extensions?: { code?: string; statusCode?: number; field?: string }
}

export class ApiError extends Error {
  code?: string
  statusCode?: number
  field?: string

  constructor(message: string, code?: string, statusCode?: number, field?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
    this.field = field
  }
}

export interface GraphQLSessionHandler {
  refresh: () => Promise<boolean>
  onExpired: () => void | Promise<void>
}

let sessionHandler: GraphQLSessionHandler | null = null

export function configureGraphQLSession(handler: GraphQLSessionHandler) {
  sessionHandler = handler
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Unable to connect to the server. Check that the API is running and try again.'
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

function isAuthError(code?: string, statusCode?: number): boolean {
  return (
    statusCode === 401 ||
    code === 'UNAUTHENTICATED' ||
    code === 'INVALID_TOKEN' ||
    code === 'SESSION_EXPIRED'
  )
}

interface RequestOptions {
  retried?: boolean
  /** When false, skip automatic session refresh (login, password reset, etc.). */
  session?: boolean
}

async function executeGraphQLFetch(
  query: string,
  variables?: Record<string, unknown>,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const csrf = getCsrfToken()
  if (csrf) headers['X-CSRF-Token'] = csrf

  try {
    return await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ query, variables }),
    })
  } catch (error) {
    throw new ApiError(getErrorMessage(error), 'NETWORK_ERROR')
  }
}

async function parseGraphQLJson(response: Response): Promise<{
  data?: unknown
  errors?: GraphQLErrorItem[]
}> {
  const text = await response.text()

  if (response.status === 429) {
    throw new ApiError('Too many requests. Please wait a moment and try again.', 'RATE_LIMITED', 429)
  }

  if (response.status === 403) {
    throw new ApiError('Request blocked for security reasons.', 'CSRF_INVALID', 403)
  }

  if (!text) {
    throw new ApiError(
      `Request failed (${response.status})`,
      'NETWORK_ERROR',
      response.status,
    )
  }

  try {
    return JSON.parse(text) as { data?: unknown; errors?: GraphQLErrorItem[] }
  } catch {
    throw new ApiError(
      response.ok ? 'Invalid server response' : `Request failed (${response.status})`,
      'NETWORK_ERROR',
      response.status,
    )
  }
}

function throwGraphQLError(err: GraphQLErrorItem): never {
  throw new ApiError(
    err.message,
    err.extensions?.code,
    err.extensions?.statusCode,
    err.extensions?.field,
  )
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  options: RequestOptions = {},
): Promise<T> {
  const useSession = options.session !== false
  const response = await executeGraphQLFetch(query, variables)
  const json = await parseGraphQLJson(response)

  if (json.errors?.length) {
    const err = json.errors[0]!
    const code = err.extensions?.code
    const statusCode = err.extensions?.statusCode

    if (useSession && !options.retried && sessionHandler && isAuthError(code, statusCode)) {
      const refreshed = await sessionHandler.refresh()
      if (refreshed) {
        return graphqlRequest<T>(query, variables, { ...options, retried: true, session: true })
      }
      await sessionHandler.onExpired()
      throw new ApiError('Your session has ended. Please sign in again.', 'SESSION_EXPIRED', 401)
    }

    throwGraphQLError(err)
  }

  if (!response.ok) {
    throw new ApiError(`Request failed (${response.status})`, 'NETWORK_ERROR', response.status)
  }

  if (!json.data) {
    throw new ApiError('No data returned', 'EMPTY_RESPONSE')
  }

  return json.data as T
}

/** GraphQL call without automatic session refresh (login, refresh, password reset). */
export async function graphqlRequestRaw<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  return graphqlRequest<T>(query, variables, { session: false })
}
