import express from 'express'
import cors from 'cors'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { connectDatabase } from './config/database.js'
import { env, corsOrigins, isProduction } from './config/env.js'
import { typeDefs, resolvers } from './graphql/resolvers/index.js'
import { buildContext } from './middleware/auth.js'
import { logger } from './utils/logger.js'

async function bootstrap() {
  await connectDatabase()

  const app = express()
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: !isProduction,
    formatError: (formattedError) => {
      logger.error('GraphQL error', formattedError)
      return formattedError
    },
  })

  await server.start()

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'propel-crm-api', timestamp: new Date().toISOString() })
  })

  app.use(
    '/graphql',
    cors<cors.CorsRequest>({ origin: corsOrigins, credentials: true }),
    express.json({ limit: '1mb' }),
    expressMiddleware(server, {
      context: async ({ req }) => buildContext(req.headers.authorization),
    }),
  )

  app.listen(env.PORT, () => {
    logger.info(`Propel CRM API ready at http://localhost:${env.PORT}/graphql`)
  })
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', err)
  process.exit(1)
})
