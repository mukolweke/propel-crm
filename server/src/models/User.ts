import { Schema, model, type Document, type Types } from 'mongoose'
import type { NotificationSettings, UserRole } from '../types/index.js'

export interface IUser extends Document {
  _id: Types.ObjectId
  fullName: string
  email: string
  password: string
  role: UserRole
  phone?: string
  agency?: string
  profileImage?: string
  notificationSettings: NotificationSettings
  mustChangePassword: boolean
  isActive: boolean
  loginAttempts: number
  lockedUntil?: Date
  lastLoginAt?: Date
  mfaEnabled: boolean
  mfaSecret?: string
  deletedAt?: Date
  deletedBy?: Types.ObjectId
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
    role: { type: String, enum: ['super_admin', 'user'], default: 'user' },
    phone: { type: String, default: '', trim: true },
    agency: { type: String, default: '', trim: true },
    profileImage: { type: String },
    notificationSettings: { type: notificationSettingsSchema, default: () => ({}) },
    mustChangePassword: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastLoginAt: { type: Date },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

userSchema.index({ email: 1 })
userSchema.index({ role: 1, isActive: 1 })
userSchema.index({ deletedAt: 1 })

export const User = model<IUser>('User', userSchema)
