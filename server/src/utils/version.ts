import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packagePath = join(dirname(fileURLToPath(import.meta.url)), '../../package.json')
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: string }

export const appVersion = packageJson.version ?? '0.0.0'
