export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  FRONT_DESK = 'front_desk',
  HOUSEKEEPING = 'housekeeping',
  ACCOUNTANT = 'accountant',
}

export enum RoomStatus {
  CLEAN = 'clean',
  DIRTY = 'dirty',
  INSPECTED = 'inspected',
  OUT_OF_ORDER = 'out_of_order',
}

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum ReservationSource {
  DIRECT = 'direct',
  BOOKING_COM = 'booking_com',
}

export enum PaymentMethod {
  CARD = 'card',
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  OTA_COLLECTED = 'ota_collected',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum HousekeepingTaskType {
  CHECKOUT_CLEAN = 'checkout_clean',
  TURNDOWN = 'turndown',
  INSPECTION = 'inspection',
  MAINTENANCE = 'maintenance',
}

export enum HousekeepingTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum OTAChannelName {
  BOOKING_COM = 'booking_com',
}

export enum OTASyncStatus {
  SUCCESS = 'success',
  PARTIAL = 'partial',
  FAILED = 'failed',
}

// Roles allowed to manage users & listings broadly within a property (mirrors
// spec's "Super Admin" concept, scoped per-tenant since owners self-signup).
export const PROPERTY_ADMIN_ROLES = [UserRole.OWNER, UserRole.ADMIN];
