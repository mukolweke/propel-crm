import type { Request } from 'express'

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
