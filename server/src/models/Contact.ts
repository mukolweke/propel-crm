import { Schema, model, type Document, type Types } from 'mongoose'
import type { ContactStatus } from '../types/index.js'
import { normalizeEmail, normalizePhone } from '../utils/normalize.js'

export interface IContact extends Document {
  _id: Types.ObjectId
  ownerId: Types.ObjectId
  sharedWith: Types.ObjectId[]
  fullName: string
  phone: string
  phoneNormalized: string
  email: string
  emailNormalized: string
  propertyInterest: string
  budgetRange: string
  preferredLocation: string
  leadSource: string
  notes: string
  status: ContactStatus
  lastInteractionDate?: Date
  nextFollowUpDate?: Date
  isConverted: boolean
  deletedAt?: Date
  deletedBy?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const contactSchema = new Schema<IContact>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    phoneNormalized: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true, trim: true },
    emailNormalized: { type: String, default: '' },
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
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

contactSchema.pre('save', function (next) {
  this.phoneNormalized = normalizePhone(this.phone)
  this.emailNormalized = normalizeEmail(this.email)
  next()
})

contactSchema.index({ ownerId: 1, status: 1, deletedAt: 1 })
contactSchema.index({ ownerId: 1, createdAt: -1 })
contactSchema.index({ sharedWith: 1, deletedAt: 1 })
contactSchema.index({ deletedAt: 1 })
contactSchema.index({ phoneNormalized: 1 })
contactSchema.index({ emailNormalized: 1 })

export const Contact = model<IContact>('Contact', contactSchema)

export const notDeletedFilter = { deletedAt: { $exists: false } }
