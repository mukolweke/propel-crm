import { env } from '../config/env.js'
import { isDatabaseReady } from '../config/database.js'
import { getBuildMetadata } from './build-metadata.js'

export function logStartupBanner(): void {
  const { version, commit, buildDate, environment } = getBuildMetadata()
  const mongo = isDatabaseReady() ? 'Connected' : 'Disconnected'
  const nodeMajor = `v${process.versions.node.split('.')[0]}`

  const lines = [
    'Propel CRM API',
    `Version: ${version}`,
    `Commit: ${commit}`,
    `Build: ${buildDate}`,
    `Environment: ${environment}`,
    `Node: ${nodeMajor}`,
    `Mongo: ${mongo}`,
    'GraphQL: Enabled',
    `Port: ${env.PORT}`,
  ]

  console.log(lines.join('\n'))
}
