import { Schema, model, type Document, type Types } from 'mongoose'
import type { SharePermission } from '../types/index.js'

export interface ISharedAccess extends Document {
  _id: Types.ObjectId
  contactId: Types.ObjectId
  ownerId: Types.ObjectId
  sharedUserId: Types.ObjectId
  permission: SharePermission
  createdAt: Date
  updatedAt: Date
}

const sharedAccessSchema = new Schema<ISharedAccess>(
  {
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sharedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    permission: { type: String, enum: ['view', 'report', 'edit'], default: 'view' },
  },
  { timestamps: true },
)

sharedAccessSchema.index({ contactId: 1, sharedUserId: 1 }, { unique: true })
sharedAccessSchema.index({ sharedUserId: 1 })

export const SharedAccess = model<ISharedAccess>('SharedAccess', sharedAccessSchema)
