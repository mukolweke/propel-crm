import type { Server } from 'node:http'
import type { ApolloServer } from '@apollo/server'
import { disconnectDatabase } from './config/database.js'
import { logger } from './utils/logger.js'
import type { GraphQLContext } from './types/index.js'

interface ShutdownDeps {
  httpServer: Server
  apolloServer: ApolloServer<GraphQLContext>
}

let shuttingDown = false

export function registerProcessHandlers(getDeps: () => ShutdownDeps | null): void {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error)
    process.exit(1)
  })

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason)
  })

  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true

    logger.info('Shutdown initiated', { signal })

    const deps = getDeps()
    if (!deps) {
      process.exit(0)
      return
    }

    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out; forcing exit')
      process.exit(1)
    }, 30_000)
    forceExitTimer.unref()

    try {
      await new Promise<void>((resolve, reject) => {
        deps.httpServer.close((err) => (err ? reject(err) : resolve()))
      })
      await deps.apolloServer.stop()
      await disconnectDatabase()
      logger.info('Shutdown complete')
      process.exit(0)
    } catch (error) {
      logger.error('Error during shutdown', error)
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })

  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })
}
