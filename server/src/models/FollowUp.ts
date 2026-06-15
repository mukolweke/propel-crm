import { Schema, model, type Document, type Types } from 'mongoose'
import type { FollowUpStatus } from '../types/index.js'

export interface IFollowUp extends Document {
  _id: Types.ObjectId
  ownerId: Types.ObjectId
  contactId: Types.ObjectId
  scheduledDate: Date
  status: FollowUpStatus
  notes: string
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const followUpSchema = new Schema<IFollowUp>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    scheduledDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'completed', 'overdue'], default: 'pending' },
    notes: { type: String, default: '' },
    completedAt: { type: Date },
  },
  { timestamps: true },
)

followUpSchema.index({ ownerId: 1, scheduledDate: 1, status: 1 })

export const FollowUp = model<IFollowUp>('FollowUp', followUpSchema)
