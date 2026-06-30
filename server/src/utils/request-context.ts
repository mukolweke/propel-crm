import { AsyncLocalStorage } from 'node:async_hooks'

interface RequestContextStore {
  requestId: string
}

export const requestContext = new AsyncLocalStorage<RequestContextStore>()

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId
}

export function runWithRequestContext<T>(store: RequestContextStore, fn: () => T): T {
  return requestContext.run(store, fn)
}
