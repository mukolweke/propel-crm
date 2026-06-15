import type { Document } from 'mongoose'

export function toId(doc: { _id: { toString(): string } } | string | null | undefined): string {
  if (!doc) return ''
  if (typeof doc === 'string') return doc
  return doc._id.toString()
}

export function mapDoc<T extends Document>(doc: T | null): T | null {
  return doc
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}
