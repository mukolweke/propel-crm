import { Schema, model, type Document, type Types } from 'mongoose'

export interface IPasswordResetCode extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  codeHash: string
  expiresAt: Date
  usedAt?: Date
  attempts: number
  createdAt: Date
  updatedAt: Date
}

const passwordResetCodeSchema = new Schema<IPasswordResetCode>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    codeHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
)

passwordResetCodeSchema.index({ userId: 1, usedAt: 1, expiresAt: -1 })

export const PasswordResetCode = model<IPasswordResetCode>(
  'PasswordResetCode',
  passwordResetCodeSchema,
)
