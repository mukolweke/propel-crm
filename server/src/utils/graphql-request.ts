import type { Request } from 'express'

export function extractGraphQLOperationName(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined

  const payload = body as Record<string, unknown>
  if (typeof payload.operationName === 'string' && payload.operationName.trim()) {
    return payload.operationName.trim()
  }

  const query = typeof payload.query === 'string' ? payload.query : ''
  if (!query) return undefined

  const namedOperation = /^\s*(?:query|mutation|subscription)\s+(\w+)/i.exec(query)
  if (namedOperation?.[1]) return namedOperation[1]

  const mutations = extractMutationNames(query)
  if (mutations.length > 0) return mutations[0]

  const queryField = /^\s*query[^{]*\{[^}]*?(\w+)\s*(?:\(|{)/is.exec(query)
  if (queryField?.[1]) return queryField[1]

  return undefined
}

export function extractMutationNames(query: string): string[] {
  const names: string[] = []
  const pattern = /\bmutation\b[^{]*\{([^}]+)\}/gis
  let blockMatch: RegExpExecArray | null
  while ((blockMatch = pattern.exec(query)) !== null) {
    const body = blockMatch[1] ?? ''
    const fieldPattern = /^\s*(\w+)\s*(?:\(|:)/gm
    let fieldMatch: RegExpExecArray | null
    while ((fieldMatch = fieldPattern.exec(body)) !== null) {
      if (fieldMatch[1]) names.push(fieldMatch[1])
    }
  }
  return names
}

export function requestHasMutation(req: Request, mutationName: string): boolean {
  const query = typeof req.body?.query === 'string' ? req.body.query : ''
  if (!query.toLowerCase().includes('mutation')) return false
  return extractMutationNames(query).includes(mutationName)
}

export function extractMutationEmail(req: Request, mutationName: string): string {
  if (!requestHasMutation(req, mutationName)) return ''

  const variables = req.body?.variables
  if (!variables || typeof variables !== 'object') return ''

  const input = (variables as Record<string, unknown>).input
  if (!input || typeof input !== 'object') return ''

  const email = (input as Record<string, unknown>).email
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}
