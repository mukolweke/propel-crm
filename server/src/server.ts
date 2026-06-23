import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import depthLimit from 'graphql-depth-limit'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { connectDatabase } from './config/database.js'
import { env, corsOrigins, isProduction } from './config/env.js'
import { typeDefs, resolvers } from './graphql/resolvers/index.js'
import { buildContext } from './middleware/auth.js'
import { logger } from './utils/logger.js'
import { AppError } from './utils/errors.js'

async function bootstrap() {
  await connectDatabase()

  const app = express()
  app.set('trust proxy', 1)

  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  )

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
    expressMiddleware(server, {
      context: async ({ req }) =>
        buildContext(req.headers.authorization, req.ip, req.headers['user-agent']),
    }),
  )

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', err)
    res.status(500).json({ error: 'Internal server error' })
  })

  app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Propel CRM API ready at http://localhost:${env.PORT}/graphql`)
  })
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', err)
  process.exit(1)
})
