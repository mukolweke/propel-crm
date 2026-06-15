import { Schema, model, type Document, type Types } from 'mongoose'
import type { InteractionType } from '../types/index.js'

export interface IInteraction extends Document {
  _id: Types.ObjectId
  contactId: Types.ObjectId
  ownerId: Types.ObjectId
  interactionType: InteractionType
  notes: string
  outcome: string
  nextFollowUpDate?: Date
  createdAt: Date
  updatedAt: Date
}

const interactionSchema = new Schema<IInteraction>(
  {
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    interactionType: {
      type: String,
      enum: ['call', 'whatsapp', 'sms', 'meeting', 'property_viewing', 'physical_visit'],
      required: true,
    },
    notes: { type: String, default: '' },
    outcome: { type: String, default: '' },
    nextFollowUpDate: { type: Date },
  },
  { timestamps: true },
)

interactionSchema.index({ ownerId: 1, createdAt: -1 })
interactionSchema.index({ contactId: 1, createdAt: -1 })

export const Interaction = model<IInteraction>('Interaction', interactionSchema)
