import { Types } from 'mongoose'
import { z } from 'zod'
import { AppError } from './errors.js'

export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id
}

export const objectIdSchema = z.string().refine(isValidObjectId, { message: 'Invalid ID' })

export function parseObjectId(id: string, label = 'ID'): Types.ObjectId {
  if (!isValidObjectId(id)) {
    throw new AppError(`Invalid ${label}`, 'VALIDATION_ERROR', 400)
  }
  return new Types.ObjectId(id)
}
