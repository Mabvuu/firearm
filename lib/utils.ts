// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Role } from './roles'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateFingerprint() {
  return crypto.randomUUID()
}

export function hasRole(userRole: Role, allowed: Role[]) {
  return allowed.includes(userRole)
}

export function canViewRecord(
  recordFingerprint: string,
  userFingerprint: string,
  userRole: Role,
  allowedRoles: Role[]
) {
  if (!hasRole(userRole, allowedRoles)) return false
  return recordFingerprint === userFingerprint
}
