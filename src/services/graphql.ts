export const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql'

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
  refresh: () => Promise<string | null>
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
}

async function executeGraphQLFetch(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    return await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
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
  token?: string | null,
  options: RequestOptions = {},
): Promise<T> {
  const response = await executeGraphQLFetch(query, variables, token)
  const json = await parseGraphQLJson(response)

  if (json.errors?.length) {
    const err = json.errors[0]!
    const code = err.extensions?.code
    const statusCode = err.extensions?.statusCode

    if (token && !options.retried && sessionHandler && isAuthError(code, statusCode)) {
      const newToken = await sessionHandler.refresh()
      if (newToken) {
        return graphqlRequest<T>(query, variables, newToken, { retried: true })
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

/** Raw GraphQL call without session refresh (used for login / refresh / password reset). */
export async function graphqlRequestRaw<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  const response = await executeGraphQLFetch(query, variables, token)
  const json = await parseGraphQLJson(response)

  if (json.errors?.length) {
    throwGraphQLError(json.errors[0]!)
  }

  if (!response.ok) {
    throw new ApiError(`Request failed (${response.status})`, 'NETWORK_ERROR', response.status)
  }

  if (!json.data) {
    throw new ApiError('No data returned', 'EMPTY_RESPONSE')
  }

  return json.data as T
}
