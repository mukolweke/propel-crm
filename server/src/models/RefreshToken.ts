import { Schema, model, type Document, type Types } from 'mongoose'

export interface IRefreshToken extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  tokenHash: string
  expiresAt: Date
  revokedAt?: Date
  replacedByTokenId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
    replacedByTokenId: { type: Schema.Types.ObjectId, ref: 'RefreshToken' },
  },
  { timestamps: true },
)

refreshTokenSchema.index({ userId: 1, revokedAt: 1 })

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema)
