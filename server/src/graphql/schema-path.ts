import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Absolute path to the GraphQL SDL file — stable in dev (src/) and prod (dist/). */
export function getGraphqlSchemaPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), 'schema', 'index.graphql')
}
