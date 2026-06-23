import { Schema, model, type Document, type Types } from 'mongoose'
import type { AuditAction, AuditEntityType, UserRole } from '../types/index.js'

export interface IAuditLog extends Document {
  _id: Types.ObjectId
  action: AuditAction
  entityType: AuditEntityType
  entityId?: Types.ObjectId
  performedBy?: Types.ObjectId
  performedByRole?: UserRole
  ownerId?: Types.ObjectId
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    performedByRole: { type: String, enum: ['super_admin', 'user'] },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'auditlogs',
  },
)

auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })

auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs are immutable')
})
auditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs are immutable')
})
auditLogSchema.pre('updateMany', function () {
  throw new Error('Audit logs are immutable')
})
auditLogSchema.pre('deleteOne', function () {
  throw new Error('Audit logs are immutable')
})
auditLogSchema.pre('deleteMany', function () {
  throw new Error('Audit logs are immutable')
})

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema)
