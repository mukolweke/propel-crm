import { GraphQLScalarType, Kind } from 'graphql'

export const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO-8601 date-time string',
  serialize(value: unknown) {
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'string') return new Date(value).toISOString()
    throw new Error('DateTime cannot represent value')
  },
  parseValue(value: unknown) {
    if (typeof value === 'string' || typeof value === 'number') return new Date(value)
    throw new Error('DateTime cannot represent value')
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) return new Date(ast.value)
    return null
  },
})

export const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  serialize(value: unknown) {
    return value
  },
  parseValue(value: unknown) {
    return value
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value)
      } catch {
        return ast.value
      }
    }
    return null
  },
})
