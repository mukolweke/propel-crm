import type { Server } from 'node:http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import depthLimit from 'graphql-depth-limit'
import { fileURLToPath } from 'node:url'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { connectDatabase } from './config/database.js'
import { env, corsOrigins, isProduction } from './config/env.js'
import { typeDefs, resolvers } from './graphql/resolvers/index.js'
import { buildContext } from './middleware/auth.js'
import { assertValidCsrf } from './middleware/csrf.js'
import { createGraphqlMutationRateLimitMiddleware } from './middleware/graphql-mutation-rate-limit.js'
import { enforceHttps } from './middleware/https.js'
import { requestLoggingMiddleware } from './middleware/request-logging.js'
import { registerProcessHandlers } from './process-handlers.js'
import { createHealthRouter } from './routes/health.js'
import { logger } from './utils/logger.js'
import { AppError } from './utils/errors.js'
import type { GraphQLContext } from './types/index.js'

let apolloServerInstance: ApolloServer<GraphQLContext> | null = null
let httpServerInstance: Server | null = null

export function getRuntimeServers(): { httpServer: Server; apolloServer: ApolloServer<GraphQLContext> } | null {
  if (!httpServerInstance || !apolloServerInstance) return null
  return { httpServer: httpServerInstance, apolloServer: apolloServerInstance }
}

export async function createApp() {
  const app = express()
  app.set('trust proxy', 1)

  app.use(enforceHttps)

  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
      hsts: isProduction
        ? {
            maxAge: 31_536_000,
            includeSubDomains: true,
            preload: false,
          }
        : false,
    }),
  )

  app.use(compression())
  app.use(cookieParser())
  app.use(requestLoggingMiddleware)

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: isProduction ? 120 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  })

  const mutationRateLimiters = createGraphqlMutationRateLimitMiddleware()

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: !isProduction,
    validationRules: [depthLimit(8)],
    formatError: (formattedError, error) => {
      if (error instanceof AppError) {
        const gqlError = error.toGraphQLError()
        return {
          message: gqlError.message,
          extensions: gqlError.extensions,
        }
      }

      logger.error('GraphQL error', {
        message: formattedError.message,
        code: formattedError.extensions?.code,
      })

      if (isProduction && formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return { message: 'An unexpected error occurred', extensions: { code: 'INTERNAL_ERROR' } }
      }

      return formattedError
    },
  })

  apolloServerInstance = server
  await server.start()

  app.use(createHealthRouter())

  app.use('/graphql', apiLimiter)

  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    }),
    (_req, res, next) => {
      res.set('Cache-Control', 'no-store')
      next()
    },
    express.json({ limit: '512kb' }),
    mongoSanitize(),
    ...mutationRateLimiters,
    (req, res, next) => {
      try {
        assertValidCsrf(req)
        next()
      } catch (error) {
        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            errors: [
              {
                message: error.message,
                extensions: { code: error.code, statusCode: error.statusCode },
              },
            ],
          })
          return
        }
        next(error)
      }
    },
    expressMiddleware(server, {
      context: async ({ req }) => buildContext(req),
    }),
  )

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return app
}

async function bootstrap() {
  registerProcessHandlers(getRuntimeServers)

  await connectDatabase()
  const app = await createApp()

  httpServerInstance = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info('Propel CRM API ready', {
      port: env.PORT,
      environment: env.NODE_ENV,
      graphqlPath: '/graphql',
    })
  })
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url)
if (isMainModule) {
  bootstrap().catch((err) => {
    logger.error('Failed to start server', err)
    process.exit(1)
  })
}
