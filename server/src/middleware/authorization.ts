import type { Types } from 'mongoose'
import type { SharePermission } from '../types/index.js'
import type { IContact } from '../models/Contact.js'
import type { ISharedAccess } from '../models/SharedAccess.js'
import { AppError } from '../utils/errors.js'

export type ContactAccessLevel = 'owner' | SharePermission | null

export function isOwner(userId: string, ownerId: Types.ObjectId | string): boolean {
  return ownerId.toString() === userId
}

export function getSharePermission(
  userId: string,
  shares: Pick<ISharedAccess, 'sharedUserId' | 'permission'>[],
): SharePermission | null {
  const share = shares.find((s) => s.sharedUserId.toString() === userId)
  return share?.permission ?? null
}

export function getContactAccessLevel(
  userId: string,
  contact: Pick<IContact, 'ownerId'>,
  shares: Pick<ISharedAccess, 'sharedUserId' | 'permission'>[] = [],
): ContactAccessLevel {
  if (isOwner(userId, contact.ownerId)) return 'owner'
  return getSharePermission(userId, shares)
}

export function canViewContact(
  userId: string,
  contact: Pick<IContact, 'ownerId'>,
  shares: Pick<ISharedAccess, 'sharedUserId' | 'permission'>[] = [],
): boolean {
  const level = getContactAccessLevel(userId, contact, shares)
  return level !== null
}

export function canReportContact(
  userId: string,
  contact: Pick<IContact, 'ownerId'>,
  shares: Pick<ISharedAccess, 'sharedUserId' | 'permission'>[] = [],
): boolean {
  const level = getContactAccessLevel(userId, contact, shares)
  return level === 'owner' || level === 'report' || level === 'edit'
}

export function canEditContact(
  userId: string,
  contact: Pick<IContact, 'ownerId'>,
  shares: Pick<ISharedAccess, 'sharedUserId' | 'permission'>[] = [],
): boolean {
  const level = getContactAccessLevel(userId, contact, shares)
  return level === 'owner' || level === 'edit'
}

export function assertCanView(
  userId: string,
  contact: Pick<IContact, 'ownerId'>,
  shares: Pick<ISharedAccess, 'sharedUserId' | 'permission'>[] = [],
): void {
  if (!canViewContact(userId, contact, shares)) {
    throw new AppError('You do not have access to this contact', 'FORBIDDEN', 403)
  }
}

export function assertCanEdit(
  userId: string,
  contact: Pick<IContact, 'ownerId'>,
  shares: Pick<ISharedAccess, 'sharedUserId' | 'permission'>[] = [],
): void {
  if (!canEditContact(userId, contact, shares)) {
    throw new AppError('You do not have permission to edit this contact', 'FORBIDDEN', 403)
  }
}

export function assertIsOwner(userId: string, ownerId: Types.ObjectId | string): void {
  if (!isOwner(userId, ownerId)) {
    throw new AppError('Only the contact owner can perform this action', 'FORBIDDEN', 403)
  }
}

const PERMISSION_RANK: Record<SharePermission, number> = {
  view: 1,
  report: 2,
  edit: 3,
}

export function permissionIncludes(
  granted: SharePermission,
  required: SharePermission,
): boolean {
  return PERMISSION_RANK[granted] >= PERMISSION_RANK[required]
}
