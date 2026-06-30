import mongoose from 'mongoose'
import { env } from './env.js'
import { logger } from '../utils/logger.js'

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true)

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected', { database: mongoose.connection.db?.databaseName })
  })
  mongoose.connection.on('error', (err) => logger.error('MongoDB error', err))
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'))

  await mongoose.connect(env.MONGODB_URI)
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect()
}

/** True when Mongoose has an active connection to MongoDB. */
export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected
}

export interface DatabaseReadinessResult {
  ready: boolean
  latencyMs: number
  state: string
}

function roundMs(durationMs: number): number {
  return Math.round(durationMs * 100) / 100
}

function getConnectionStateLabel(): string {
  const states: Record<number, string> = {
    [mongoose.ConnectionStates.disconnected]: 'disconnected',
    [mongoose.ConnectionStates.connected]: 'connected',
    [mongoose.ConnectionStates.connecting]: 'connecting',
    [mongoose.ConnectionStates.disconnecting]: 'disconnecting',
  }
  return states[mongoose.connection.readyState] ?? 'unknown'
}

/** Ping MongoDB and measure round-trip latency for readiness probes. */
export async function checkDatabaseReadiness(): Promise<DatabaseReadinessResult> {
  const start = process.hrtime.bigint()
  const state = getConnectionStateLabel()

  if (!isDatabaseReady() || !mongoose.connection.db) {
    return {
      ready: false,
      latencyMs: roundMs(Number(process.hrtime.bigint() - start) / 1e6),
      state,
    }
  }

  try {
    await mongoose.connection.db.admin().ping()
    return {
      ready: true,
      latencyMs: roundMs(Number(process.hrtime.bigint() - start) / 1e6),
      state: 'connected',
    }
  } catch {
    return {
      ready: false,
      latencyMs: roundMs(Number(process.hrtime.bigint() - start) / 1e6),
      state: getConnectionStateLabel(),
    }
  }
}
