import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(serverRoot, 'src/graphql/schema/index.graphql')
const destination = join(serverRoot, 'dist/graphql/schema/index.graphql')

mkdirSync(dirname(destination), { recursive: true })
copyFileSync(source, destination)

console.log(`Copied GraphQL schema → ${destination}`)
