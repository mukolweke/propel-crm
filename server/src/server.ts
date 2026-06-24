import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import depthLimit from 'graphql-depth-limit'
import { fileURLToPath } from 'node:url'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { connectDatabase } from './config/database.js'
import { env, corsOrigins, isProduction } from './config/env.js'
import { typeDefs, resolvers } from './graphql/resolvers/index.js'
import { buildContext } from './middleware/auth.js'
import { assertValidCsrf } from './middleware/csrf.js'
import { logger } from './utils/logger.js'
import { AppError } from './utils/errors.js'

export async function createApp() {
  const app = express()
  app.set('trust proxy', 1)

  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  )

  app.use(cookieParser())

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 20 : 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  })

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: isProduction ? 120 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  })

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

  await server.start()

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'propel-crm-api', timestamp: new Date().toISOString() })
  })

  app.use('/graphql', loginLimiter, apiLimiter)

  app.use(
    '/graphql',
    cors<cors.CorsRequest>({ origin: corsOrigins, credentials: true }),
    express.json({ limit: '512kb' }),
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
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}

async function bootstrap() {
  await connectDatabase()
  const app = await createApp()

  app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Propel CRM API ready at http://localhost:${env.PORT}/graphql`)
  })
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url)
if (isMainModule) {
  bootstrap().catch((err) => {
    logger.error('Failed to start server', err)
    process.exit(1)
  })
}
