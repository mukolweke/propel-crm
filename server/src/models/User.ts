import { Schema, model, type Document, type Types } from 'mongoose'
import type { NotificationSettings, UserRole } from '../types/index.js'

export interface IUser extends Document {
  _id: Types.ObjectId
  fullName: string
  email: string
  password: string
  role: UserRole
  profileImage?: string
  notificationSettings: NotificationSettings
  createdAt: Date
  updatedAt: Date
}

const notificationSettingsSchema = new Schema<NotificationSettings>(
  {
    emailAlerts: { type: Boolean, default: true },
    followUpReminders: { type: Boolean, default: true },
    weeklyDigest: { type: Boolean, default: false },
    sharedListUpdates: { type: Boolean, default: true },
  },
  { _id: false },
)

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['agent', 'manager'], default: 'agent' },
    profileImage: { type: String },
    notificationSettings: { type: notificationSettingsSchema, default: () => ({}) },
  },
  { timestamps: true },
)

userSchema.index({ email: 1 })

export const User = model<IUser>('User', userSchema)
