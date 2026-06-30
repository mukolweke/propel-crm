import type { Request, Response, Router } from 'express'
import express from 'express'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { isDatabaseReady } from '../config/database.js'
import { appVersion } from '../utils/version.js'

const startTime = Date.now()

function buildBaseHealth() {
  const memory = process.memoryUsage()
  return {
    status: 'ok' as const,
    service: 'propel-crm-api',
    version: appVersion,
    environment: env.NODE_ENV,
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

function getMongoStateLabel(): string {
  const states: Record<number, string> = {
    [mongoose.ConnectionStates.disconnected]: 'disconnected',
    [mongoose.ConnectionStates.connected]: 'connected',
    [mongoose.ConnectionStates.connecting]: 'connecting',
    [mongoose.ConnectionStates.disconnecting]: 'disconnecting',
  }
  return states[mongoose.connection.readyState] ?? 'unknown'
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
export function readyHandler(_req: Request, res: Response): void {
  const mongoReady = isDatabaseReady()
  const body = {
    status: mongoReady ? ('ok' as const) : ('degraded' as const),
    check: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      mongodb: {
        status: mongoReady ? ('up' as const) : ('down' as const),
        state: getMongoStateLabel(),
      },
    },
  }

  res.status(mongoReady ? 200 : 503).json(body)
}

/** Full health snapshot for operators and dashboards. */
export function healthHandler(_req: Request, res: Response): void {
  const mongoReady = isDatabaseReady()
  res.status(mongoReady ? 200 : 503).json({
    ...buildBaseHealth(),
    status: mongoReady ? 'ok' : 'degraded',
    checks: {
      mongodb: {
        status: mongoReady ? 'up' : 'down',
        state: getMongoStateLabel(),
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
