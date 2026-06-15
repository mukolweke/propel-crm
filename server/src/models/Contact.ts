import { Schema, model, type Document, type Types } from 'mongoose'
import type { ContactStatus } from '../types/index.js'

export interface IContact extends Document {
  _id: Types.ObjectId
  ownerId: Types.ObjectId
  sharedWith: Types.ObjectId[]
  fullName: string
  phone: string
  email: string
  propertyInterest: string
  budgetRange: string
  preferredLocation: string
  leadSource: string
  notes: string
  status: ContactStatus
  lastInteractionDate?: Date
  nextFollowUpDate?: Date
  isConverted: boolean
  createdAt: Date
  updatedAt: Date
}

const contactSchema = new Schema<IContact>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true, trim: true },
    propertyInterest: { type: String, default: '' },
    budgetRange: { type: String, default: '' },
    preferredLocation: { type: String, default: '' },
    leadSource: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'follow_up', 'converted', 'lost'],
      default: 'new',
    },
    lastInteractionDate: { type: Date },
    nextFollowUpDate: { type: Date },
    isConverted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

contactSchema.index({ ownerId: 1, status: 1 })
contactSchema.index({ ownerId: 1, createdAt: -1 })
contactSchema.index({ sharedWith: 1 })

export const Contact = model<IContact>('Contact', contactSchema)
