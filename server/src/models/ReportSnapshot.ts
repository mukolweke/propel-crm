import { Schema, model, type Document, type Types } from 'mongoose'

export interface IReportSnapshot extends Document {
  _id: Types.ObjectId
  ownerId: Types.ObjectId
  date: Date
  interactionsCount: number
  contactsAdded: number
  convertedClients: number
  followUpsCompleted: number
  createdAt: Date
  updatedAt: Date
}

const reportSnapshotSchema = new Schema<IReportSnapshot>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    interactionsCount: { type: Number, default: 0 },
    contactsAdded: { type: Number, default: 0 },
    convertedClients: { type: Number, default: 0 },
    followUpsCompleted: { type: Number, default: 0 },
  },
  { timestamps: true },
)

reportSnapshotSchema.index({ ownerId: 1, date: 1 }, { unique: true })

export const ReportSnapshot = model<IReportSnapshot>('ReportSnapshot', reportSnapshotSchema)
