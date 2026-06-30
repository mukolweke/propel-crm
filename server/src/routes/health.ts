import type { Request, Response, Router } from 'express'
import express from 'express'
import { checkDatabaseReadiness } from '../config/database.js'
import { getBuildMetadata } from '../utils/build-metadata.js'

const startTime = Date.now()

function buildBaseHealth() {
  const memory = process.memoryUsage()
  const build = getBuildMetadata()

  return {
    status: 'ok' as const,
    service: 'propel-crm-api',
    version: build.version,
    commit: build.commit,
    buildDate: build.buildDate,
    environment: build.environment,
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    uptimeMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    memory: {
      rssMb: roundMb(memory.rss),
      heapUsedMb: roundMb(memory.heapUsed),
      heapTotalMb: roundMb(memory.heapTotal),
      externalMb: roundMb(memory.external),
    },
  }
}

function roundMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100
}

/** Liveness — process is running; no external dependency checks. */
export function liveHandler(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    check: 'live',
    timestamp: new Date().toISOString(),
  })
}

/** Readiness — verifies MongoDB connectivity before accepting traffic. */
export async function readyHandler(_req: Request, res: Response): Promise<void> {
  const mongo = await checkDatabaseReadiness()

  res.status(mongo.ready ? 200 : 503).json({
    status: mongo.ready ? 'ready' : 'not_ready',
    check: 'ready',
    mongoLatency: mongo.latencyMs,
    timestamp: new Date().toISOString(),
    checks: {
      mongodb: {
        status: mongo.ready ? 'up' : 'down',
        state: mongo.state,
        latencyMs: mongo.latencyMs,
      },
    },
  })
}

/** Full health snapshot for operators and dashboards. */
export async function healthHandler(_req: Request, res: Response): Promise<void> {
  const mongo = await checkDatabaseReadiness()

  res.status(mongo.ready ? 200 : 503).json({
    ...buildBaseHealth(),
    status: mongo.ready ? 'ok' : 'degraded',
    checks: {
      mongodb: {
        status: mongo.ready ? 'up' : 'down',
        state: mongo.state,
        latencyMs: mongo.latencyMs,
      },
    },
  })
}

export function createHealthRouter(): Router {
  const router = express.Router()
  router.get('/health', healthHandler)
  router.get('/health/live', liveHandler)
  router.get('/health/ready', readyHandler)
  return router
}
