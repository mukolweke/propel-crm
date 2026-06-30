import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from '../config/env.js'

export interface BuildMetadata {
  version: string
  commit: string
  buildDate: string
  environment: string
}

const packagePath = join(dirname(fileURLToPath(import.meta.url)), '../../package.json')
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: string }
const buildInfoPath = join(dirname(fileURLToPath(import.meta.url)), '../build-info.json')

function readBuildInfoFile(): Partial<BuildMetadata> {
  if (!existsSync(buildInfoPath)) return {}

  try {
    return JSON.parse(readFileSync(buildInfoPath, 'utf8')) as Partial<BuildMetadata>
  } catch {
    return {}
  }
}

function resolveCommit(fileCommit?: string): string {
  const fromEnv =
    process.env.GIT_COMMIT ??
    process.env.RENDER_GIT_COMMIT ??
    process.env.GITHUB_SHA

  const raw = fromEnv ?? fileCommit ?? 'dev'
  return raw.slice(0, 12)
}

export function getBuildMetadata(): BuildMetadata {
  const fromFile = readBuildInfoFile()

  return {
    version: fromFile.version ?? packageJson.version ?? '0.0.0',
    commit: resolveCommit(fromFile.commit),
    buildDate: process.env.BUILD_DATE ?? fromFile.buildDate ?? 'unknown',
    environment: env.NODE_ENV,
  }
}

/** @deprecated Use getBuildMetadata().version */
export const appVersion = getBuildMetadata().version
