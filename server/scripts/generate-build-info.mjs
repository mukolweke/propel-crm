import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(readFileSync(join(serverRoot, 'package.json'), 'utf8'))

const commitSource =
  process.env.GIT_COMMIT ?? process.env.RENDER_GIT_COMMIT ?? process.env.GITHUB_SHA ?? 'dev'

const buildInfo = {
  version: packageJson.version ?? '0.0.0',
  commit: commitSource.slice(0, 12),
  buildDate: new Date().toISOString(),
}

const destination = join(serverRoot, 'dist/build-info.json')
writeFileSync(destination, `${JSON.stringify(buildInfo, null, 2)}\n`)

console.log(`Wrote build metadata → ${destination}`)
