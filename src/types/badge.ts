// =============================================================================
// BADGE-SPECIFIC TYPES AND INTERFACES
// =============================================================================
// This file extends the core types from models.ts with badge-specific functionality
// Updated: 2025 - Enhanced for better integration with centralized types

import { BadgeDoc, BadgeTemplate, BadgeCategory, BadgeStatus, UserRole, SponsorTier } from './models';

// Re-export BadgeTemplate for backward compatibility
export type { BadgeTemplate };

// =============================================================================
// LEGACY TYPE ALIASES (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use BadgeDoc from models.ts instead
 * Legacy alias for backward compatibility
 */
export interface BadgeData extends BadgeDoc {
  // This extends BadgeDoc but keeps the old interface name for compatibility
  // Consider migrating to BadgeDoc in the future
}

/**
 * @deprecated Use BadgeCategory from models.ts instead
 * Legacy alias for backward compatibility
 */
export type { BadgeCategory };

/**
 * @deprecated Use BadgeStatus from models.ts instead
 * Legacy alias for backward compatibility
 */
export type { BadgeStatus };

/**
 * @deprecated Use BadgeTemplate from models.ts instead
 * Legacy alias for backward compatibility
 */
export interface BadgeTemplateLegacy extends BadgeTemplate {
  // This extends BadgeTemplate but keeps the old interface name for compatibility
  // Consider migrating to BadgeTemplate in the future
}

// =============================================================================
// ENHANCED BADGE TYPES
// =============================================================================

export interface BadgeFilters {
  search?: string;
  category?: BadgeCategory | 'All';
  status?: BadgeStatus | 'All';
  eventId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  template?: string;
  createdBy?: string;
}

export interface BadgeGenerationOptions {
  template?: string;
  includeQR?: boolean;
  includePhoto?: boolean;
  format?: 'png' | 'jpeg' | 'pdf' | 'svg';
  quality?: number;
  size?: {
    width: number;
    height: number;
  };
  customFields?: Record<string, any>;
}

export interface BadgeBulkOperation {
  type: 'status_update' | 'print' | 'delete' | 'export' | 'generate' | 'duplicate';
  badgeIds: string[];
  parameters?: Record<string, any>;
  options?: BadgeGenerationOptions;
  createdBy: string;
  createdAt: Date;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  results?: Array<{
    badgeId: string;
    success: boolean;
    error?: string;
    output?: string;
  }>;
}

export interface BadgeAnalytics {
  userId: string;
  totalCreated: number;
  totalPrinted: number;
  totalDeleted: number;
  totalStatusUpdates: number;
  totalReprints: number;
  averageGenerationTime: number;
  lastAction: string;
  lastUpdated: Date;
  lastUpdatedBy: string;

  // Template usage statistics
  templateUsage: Record<string, number>;

  // Status distribution
  statusDistribution: Record<BadgeStatus, number>;

  // Category distribution
  categoryDistribution: Record<BadgeCategory, number>;

  // Time-based metrics
  creationTrends: Record<string, number>; // date -> count
  printingTrends: Record<string, number>; // date -> count
}

export interface BadgeValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export interface BadgeExportOptions {
  format: 'pdf' | 'csv' | 'json' | 'excel' | 'zip';
  includeQR?: boolean;
  includePhoto?: boolean;
  template?: string;
  layout?: 'single' | 'grid' | 'list';
  paperSize?: 'a4' | 'letter' | 'badge';
  orientation?: 'portrait' | 'landscape';
  customFields?: string[];
}

export interface BadgePrintJob {
  id: string;
  badgeIds: string[];
  template: string;
  options: BadgeExportOptions;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  outputUrl?: string;
  error?: string;
  progress?: number;
}

// =============================================================================
// QR CODE TYPES
// =============================================================================

export interface QRCodeData {
  uid: string;
  category: BadgeCategory;
  type: 'checkin' | 'lead' | 'matchmaking' | 'contact';
  eventId: string;
  timestamp: number;
  version: string;

  // Enhanced data for different use cases
  checkIn?: {
    userId: string;
    eventId: string;
    category: BadgeCategory;
    lastCheckIn?: string;
    lastCheckOut?: string;
    totalCheckIns: number;
    status: 'active' | 'checked_in' | 'checked_out';
    checkInHistory: Array<{
      type: 'in' | 'out';
      timestamp: string;
      processedBy?: string;
    }>;
  };

  lead?: {
    userId: string;
    category: BadgeCategory;
    eventId: string;
    company?: string;
    position?: string;
    interests?: string[];
    leadScore: number;
    leadSource: string;
    leadStatus: string;
    leadNotes?: string;
    followUpDate?: string;
    leadValue?: number;
  };

  profile?: {
    userId: string;
    category: BadgeCategory;
    eventId: string;
    company?: string;
    position?: string;
    industry?: string;
    interests?: string[];
    bio?: string;
    linkedin?: string;
    website?: string;
    boothNumber?: string;
    products?: string[];
    services?: string[];
  };

  contact?: {
    userId: string;
    fullName: string;
    email: string;
    phone?: string;
    company?: string;
    position?: string;
    category: BadgeCategory;
    eventId: string;
  };

  sessions?: {
    userId: string;
    eventId: string;
    scheduledMeetings?: Array<{
      id: string;
      title: string;
      startTime: string;
      attendeeIds: string[];
    }>;
    attendedSessions?: string[];
    bookmarks?: string[];
    networkingGoals?: string[];
  };

  analytics?: {
    userId: string;
    eventId: string;
    scansReceived: number;
    scansGiven: number;
    connectionsMade: number;
    lastActivity?: string;
    engagementScore: number;
  };
}

export interface QRScanResult {
  success: boolean;
  action: 'checkin' | 'checkout' | 'lead_capture' | 'matchmaking' | 'contact_exchange' | 'error';
  message: string;
  data?: any;
  error?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

// =============================================================================
// BADGE TEMPLATE TYPES
// =============================================================================

export interface BadgeTemplateField {
  id: string;
  name: string;
  type: 'text' | 'image' | 'qr' | 'barcode' | 'shape' | 'line';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style?: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    border?: string;
    borderRadius?: number;
    opacity?: number;
  };
  dataSource?: string; // Field name from badge data
  format?: string; // Formatting options
  visible?: boolean;
}

export interface BadgeTemplateLayout {
  id: string;
  name: string;
  description: string;
  size: {
    width: number;
    height: number;
    unit: 'mm' | 'px' | 'in';
  };
  orientation: 'portrait' | 'landscape';
  fields: BadgeTemplateField[];
  background?: {
    type: 'color' | 'gradient' | 'image';
    value: string;
  };
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

export interface BadgeBatchResult {
  success: boolean;
  processed: number;
  failed: number;
  results: Array<{
    badgeId: string;
    success: boolean;
    error?: string;
    data?: any;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  errors?: Array<{
    badgeId: string;
    error: string;
    code: string;
  }>;
}

// =============================================================================
// TYPE GUARDS AND UTILITIES
// =============================================================================

export type BadgeOperationType = 'create' | 'update' | 'delete' | 'print' | 'export' | 'duplicate';
export type BadgeExportFormat = 'pdf' | 'csv' | 'json' | 'excel' | 'zip';
export type BadgeLayoutType = 'standard' | 'modern' | 'classic' | 'minimal' | 'corporate' | 'premium' | 'custom';

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

/**
 * @deprecated Use BadgeFilters instead
 */
export interface BadgeFiltersLegacy {
  search?: string;
  category?: BadgeCategory | 'All';
  status?: BadgeStatus | 'All';
  eventId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * @deprecated Use BadgeBulkOperation instead
 */
export interface BulkOperation {
  type: 'status_update' | 'print' | 'delete' | 'export';
  badgeIds: string[];
  parameters?: Record<string, string | number | boolean>;
  createdBy: string;
  createdAt: Date;
}

/**
 * @deprecated Use BadgeAnalytics instead
 */
export interface BadgeAnalyticsLegacy {
  userId: string;
  totalCreated: number;
  totalPrinted: number;
  totalDeleted: number;
  totalStatusUpdates: number;
  lastAction: string;
  lastUpdated: Date;
  lastUpdatedBy: string;
}
