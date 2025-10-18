// =============================================================================
// TYPE UTILITIES AND CONVERSION FUNCTIONS
// =============================================================================
// This file contains utility functions for type conversions and validations
// Updated: 2025 - Enhanced for better type safety

import { Timestamp } from 'firebase/firestore';
import {
  UserProfile,
  BadgeDoc,
  BadgeTemplate,
  EventDoc,
  CheckInDoc,
  LeadDoc,
  SponsorDoc,
  ExhibitorDoc,
  SessionDoc,
  SpeakerDoc,
  NotificationDoc,
  EmailDoc,
  UserRole,
  BadgeCategory,
  BadgeStatus,
  EventStatus,
  ValidationError,
  ServiceError,
  ApiResponse,
  PaginatedResponse
} from './models';

// =============================================================================
// DATE/TIMESTAMP CONVERSION UTILITIES
// =============================================================================

/**
 * Convert Firestore Timestamp to JavaScript Date
 */
export const timestampToDate = (timestamp: Timestamp | string | Date): Date => {
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && 'seconds' in timestamp) {
    return (timestamp as Timestamp).toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  throw new Error('Invalid timestamp format');
};

/**
 * Convert JavaScript Date to Firestore Timestamp
 */
export const dateToTimestamp = (date: Date | string | Timestamp): Timestamp => {
  if (date && typeof date === 'object' && 'toDate' in date) {
    return date as Timestamp;
  }
  if (date instanceof Date) {
    return Timestamp.fromDate(date);
  }
  if (typeof date === 'string') {
    return Timestamp.fromDate(new Date(date));
  }
  throw new Error('Invalid date format');
};

/**
 * Convert date fields in an object from Timestamp to Date
 */
export const convertTimestampsToDates = <T extends Record<string, any>>(obj: T): T => {
  const converted = { ...obj };

  for (const key in converted) {
    if (converted[key] && typeof converted[key] === 'object' && 'toDate' in converted[key]) {
      converted[key] = (converted[key] as Timestamp).toDate() as any;
    } else if (converted[key] && typeof converted[key] === 'object') {
      converted[key] = convertTimestampsToDates(converted[key]);
    }
  }

  return converted;
};

/**
 * Type guard to check if a value is a Date object
 */
const isDate = (value: any): value is Date => {
  return value && typeof value === 'object' && value.constructor === Date;
};

/**
 * Convert date fields in an object from Date to Timestamp
 */
export const convertDatesToTimestamps = <T extends Record<string, any>>(obj: T): T => {
  const converted = { ...obj };

  for (const key in converted) {
    const value = converted[key];
    if (isDate(value)) {
      converted[key] = Timestamp.fromDate(value) as any;
    } else if (value && typeof value === 'object') {
      converted[key] = convertDatesToTimestamps(value);
    }
  }

  return converted;
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if a value is a valid UserRole
 */
export const isValidUserRole = (value: any): value is UserRole => {
  if (typeof value !== 'string') return false;
  const validRoles: UserRole[] = [
    'Visitor', 'Exhibitor', 'Organizer', 'Media', 'Speaker',
    'VIP', 'Hosted Buyer', 'Agent', 'Sponsor', 'Administrator'
  ];
  return validRoles.includes(value as UserRole);
};

/**
 * Type guard to check if a value is a valid BadgeCategory
 */
export const isValidBadgeCategory = (value: string): value is BadgeCategory => {
  const validCategories: BadgeCategory[] = [
    'Organizer', 'VIP', 'Speaker', 'Exhibitor', 'Media',
    'Hosted Buyer', 'Agent', 'Visitor', 'Sponsor'
  ];
  return validCategories.includes(value as BadgeCategory);
};

/**
 * Type guard to check if a value is a valid BadgeStatus
 */
export const isValidBadgeStatus = (value: string): value is BadgeStatus => {
  const validStatuses: BadgeStatus[] = [
    'pending', 'printed', 'reprint', 'damaged', 'lost',
    'active', 'expired', 'cancelled'
  ];
  return validStatuses.includes(value as BadgeStatus);
};

/**
 * Type guard to check if a value is a valid EventStatus
 */
export const isValidEventStatus = (value: string): value is EventStatus => {
  const validStatuses: EventStatus[] = [
    'draft', 'published', 'archived', 'cancelled', 'completed'
  ];
  return validStatuses.includes(value as EventStatus);
};

/**
 * Type guard to check if an error is a ValidationError
 */
export const isValidationError = (error: any): error is ValidationError => {
  return error && typeof error === 'object' && 'field' in error && 'rule' in error;
};

/**
 * Type guard to check if an error is a ServiceError
 */
export const isServiceError = (error: any): error is ServiceError => {
  return error && typeof error === 'object' && 'service' in error && 'operation' in error;
};

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate required fields in an object
 */
export const validateRequiredFields = <T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[]
): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const field of requiredFields) {
    if (!obj[field]) {
      errors.push({
        code: 'REQUIRED_FIELD',
        message: `${String(field)} is required`,
        field: String(field),
        value: obj[field],
        rule: 'required',
        timestamp: new Date().toISOString()
      });
    }
  }

  return errors;
};

/**
 * Validate field length
 */
export const validateFieldLength = <T extends Record<string, any>>(
  obj: T,
  fieldValidations: Array<{
    field: keyof T;
    min?: number;
    max?: number;
  }>
): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const validation of fieldValidations) {
    const value = obj[validation.field];
    if (value && typeof value === 'string') {
      if (validation.min && value.length < validation.min) {
        errors.push({
          code: 'MIN_LENGTH',
          message: `${String(validation.field)} must be at least ${validation.min} characters`,
          field: String(validation.field),
          value,
          rule: 'minLength',
          timestamp: new Date().toISOString()
        });
      }
      if (validation.max && value.length > validation.max) {
        errors.push({
          code: 'MAX_LENGTH',
          message: `${String(validation.field)} must be no more than ${validation.max} characters`,
          field: String(validation.field),
          value,
          rule: 'maxLength',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  return errors;
};

// =============================================================================
// TYPE CONVERSION HELPERS
// =============================================================================

/**
 * Convert UserProfile to a plain object safe for JSON serialization
 */
export const serializeUserProfile = (profile: UserProfile): Record<string, any> => {
  return {
    ...profile,
    lastCheckIn: profile.lastCheckIn && typeof profile.lastCheckIn === 'object' && 'toDate' in profile.lastCheckIn
      ? (profile.lastCheckIn as Timestamp).toDate()
      : profile.lastCheckIn,
    lastCheckOut: profile.lastCheckOut && typeof profile.lastCheckOut === 'object' && 'toDate' in profile.lastCheckOut
      ? (profile.lastCheckOut as Timestamp).toDate()
      : profile.lastCheckOut,
    badgeCreatedAt: profile.badgeCreatedAt && typeof profile.badgeCreatedAt === 'object' && 'toDate' in profile.badgeCreatedAt
      ? (profile.badgeCreatedAt as Timestamp).toDate()
      : profile.badgeCreatedAt,
    badgeUpdatedAt: profile.badgeUpdatedAt && typeof profile.badgeUpdatedAt === 'object' && 'toDate' in profile.badgeUpdatedAt
      ? (profile.badgeUpdatedAt as Timestamp).toDate()
      : profile.badgeUpdatedAt,
    lastLoginAt: profile.lastLoginAt && typeof profile.lastLoginAt === 'object' && 'toDate' in profile.lastLoginAt
      ? (profile.lastLoginAt as Timestamp).toDate()
      : profile.lastLoginAt,
  };
};

/**
 * Convert BadgeDoc to a plain object safe for JSON serialization
 */
export const serializeBadgeDoc = (badge: BadgeDoc): Record<string, any> => {
  return {
    ...badge,
    createdAt: badge.createdAt && typeof badge.createdAt === 'object' && 'toDate' in badge.createdAt
      ? (badge.createdAt as Timestamp).toDate()
      : badge.createdAt,
    updatedAt: badge.updatedAt && typeof badge.updatedAt === 'object' && 'toDate' in badge.updatedAt
      ? (badge.updatedAt as Timestamp).toDate()
      : badge.updatedAt,
    printedAt: badge.printedAt && typeof badge.printedAt === 'object' && 'toDate' in badge.printedAt
      ? (badge.printedAt as Timestamp).toDate()
      : badge.printedAt,
  };
};

// =============================================================================
// ERROR CREATION UTILITIES
// =============================================================================

/**
 * Create a standardized ValidationError
 */
export const createValidationError = (
  field: string,
  value: any,
  rule: string,
  message?: string
): ValidationError => ({
  code: 'VALIDATION_ERROR',
  message: message || `Validation failed for field: ${field}`,
  field,
  value,
  rule,
  timestamp: new Date().toISOString()
});

/**
 * Create a standardized ServiceError
 */
export const createServiceError = (
  service: string,
  operation: string,
  message: string,
  retryable: boolean = false,
  details?: Record<string, any>
): ServiceError => ({
  code: 'SERVICE_ERROR',
  message,
  service,
  operation,
  retryable,
  details,
  timestamp: new Date().toISOString()
});

/**
 * Create a standardized ApiResponse
 */
export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  error?: ValidationError | ServiceError,
  message?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  message,
  timestamp: new Date().toISOString()
});

/**
 * Create a standardized PaginatedResponse
 */
export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  error?: ValidationError | ServiceError,
  message?: string
): PaginatedResponse<T> => ({
  success: !error,
  data,
  error,
  message,
  timestamp: new Date().toISOString(),
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  }
});

// =============================================================================
// SANITIZATION UTILITIES
// =============================================================================

/**
 * Sanitize string input by trimming and removing potentially harmful characters
 */
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>\"'&]/g, '');
};

/**
 * Sanitize user profile data
 */
export const sanitizeUserProfile = (profile: Partial<UserProfile>): Partial<UserProfile> => {
  const sanitized = { ...profile };

  // Sanitize string fields
  if (sanitized.fullName) sanitized.fullName = sanitizeString(sanitized.fullName);
  if (sanitized.company) sanitized.company = sanitizeString(sanitized.company);
  if (sanitized.position) sanitized.position = sanitizeString(sanitized.position);
  if (sanitized.bio) sanitized.bio = sanitizeString(sanitized.bio);
  if (sanitized.website) sanitized.website = sanitizeString(sanitized.website);

  // Validate email if provided
  if (sanitized.email && !isValidEmail(sanitized.email)) {
    throw createValidationError('email', sanitized.email, 'email', 'Invalid email format');
  }

  // Validate phone if provided
  if (sanitized.contactPhone && !isValidPhone(sanitized.contactPhone)) {
    throw createValidationError('contactPhone', sanitized.contactPhone, 'phone', 'Invalid phone format');
  }

  return sanitized;
};

// =============================================================================
// TYPE ASSERTION HELPERS
// =============================================================================

/**
 * Assert that a value is of a specific type, throwing an error if not
 */
export const assertType = <T>(
  value: any,
  type: string,
  field?: string
): asserts value is T => {
  if (typeof value !== type) {
    throw createValidationError(
      field || 'unknown',
      value,
      'type',
      `Expected ${type}, got ${typeof value}`
    );
  }
};

/**
 * Assert that a value is not null or undefined
 */
export const assertNotNull = <T>(
  value: T | null | undefined,
  field?: string
): asserts value is T => {
  if (value === null || value === undefined) {
    throw createValidationError(
      field || 'unknown',
      value,
      'required',
      'Value cannot be null or undefined'
    );
  }
};

// =============================================================================
// DATA TRANSFORMATION UTILITIES
// =============================================================================

/**
 * Transform UserProfile for API response
 */
export const transformUserProfileForApi = (profile: UserProfile): Record<string, any> => {
  return {
    uid: profile.uid,
    email: profile.email,
    fullName: profile.fullName,
    position: profile.position,
    company: profile.company,
    category: profile.category,
    avatar: profile.avatar,
    isAgent: profile.isAgent,
    createdAt: profile.createdAt && typeof profile.createdAt === 'object' && 'toDate' in profile.createdAt
      ? (profile.createdAt as Timestamp).toDate()
      : profile.createdAt,
    // Include other fields as needed, but exclude sensitive data
  };
};

/**
 * Transform BadgeDoc for API response
 */
export const transformBadgeForApi = (badge: BadgeDoc): Record<string, any> => {
  return {
    id: badge.id,
    uid: badge.uid,
    eventId: badge.eventId,
    category: badge.category,
    status: badge.status,
    name: badge.name,
    role: badge.role,
    company: badge.company,
    qrCode: badge.qrCode,
    badgeUrl: badge.badgeUrl,
    createdAt: badge.createdAt && typeof badge.createdAt === 'object' && 'toDate' in badge.createdAt
      ? (badge.createdAt as Timestamp).toDate()
      : badge.createdAt,
    // Exclude internal fields like metadata, notes, etc.
  };
};

// =============================================================================
// CONSTANTS
// =============================================================================

export const TYPE_CONSTANTS = {
  USER_ROLES: [
    'Visitor', 'Exhibitor', 'Organizer', 'Media', 'Speaker',
    'VIP', 'Hosted Buyer', 'Agent', 'Sponsor', 'Administrator'
  ] as UserRole[],

  BADGE_CATEGORIES: [
    'Organizer', 'VIP', 'Speaker', 'Exhibitor', 'Media',
    'Hosted Buyer', 'Agent', 'Visitor', 'Sponsor'
  ] as BadgeCategory[],

  BADGE_STATUSES: [
    'pending', 'printed', 'reprint', 'damaged', 'lost',
    'active', 'expired', 'cancelled'
  ] as BadgeStatus[],

  EVENT_STATUSES: [
    'draft', 'published', 'archived', 'cancelled', 'completed'
  ] as EventStatus[]
} as const;

// =============================================================================
// EXPORT UTILITIES
// =============================================================================

export * from './models';
export * from './badge';
