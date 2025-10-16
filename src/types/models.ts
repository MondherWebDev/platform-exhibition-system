// =============================================================================
// COMPREHENSIVE TYPE DEFINITIONS FOR EVENT PLATFORM
// =============================================================================
// This file contains all shared types, interfaces, and enums used across the platform
// Updated: 2025 - Consolidated and enhanced for better type safety

import { Timestamp } from 'firebase/firestore';

// =============================================================================
// CORE ENUMS AND UNION TYPES
// =============================================================================

export type UserRole =
  | 'Visitor'
  | 'Exhibitor'
  | 'Organizer'
  | 'Media'
  | 'Speaker'
  | 'VIP'
  | 'Hosted Buyer'
  | 'Agent'
  | 'Sponsor'
  | 'Administrator';

export type BadgeStatus =
  | 'pending'
  | 'printed'
  | 'reprint'
  | 'damaged'
  | 'lost'
  | 'active'
  | 'expired'
  | 'cancelled';

export type BadgeCategory =
  | 'Organizer'
  | 'VIP'
  | 'Speaker'
  | 'Exhibitor'
  | 'Media'
  | 'Hosted Buyer'
  | 'Agent'
  | 'Visitor'
  | 'Sponsor';

export type EventStatus = 'draft' | 'published' | 'archived' | 'cancelled' | 'completed';
export type CheckInType = 'in' | 'out' | 'break';
export type SponsorTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'partner';
export type SessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected' | 'nurturing';
export type MatchStatus = 'pending' | 'accepted' | 'declined' | 'completed';
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  userId?: string;
  context?: string;
  stack?: string;
}

export interface ValidationError extends AppError {
  field: string;
  value: any;
  rule: string;
}

export interface ServiceError extends AppError {
  service: string;
  operation: string;
  retryable: boolean;
}

// =============================================================================
// API TYPES
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiRequest {
  userId?: string;
  timestamp?: string;
  ipAddress?: string;
  userAgent?: string;
}

// =============================================================================
// USER AND PROFILE TYPES
// =============================================================================

export interface BaseUser {
  uid: string;
  email: string;
  fullName: string;
  position?: string;
  company?: string;
  category: UserRole;
  avatar?: string;
  isAgent?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfile extends BaseUser {
  // Contact Information
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  address?: string;

  // Professional Information
  industry?: string;
  companySize?: string;
  jobFunction?: string;

  // Social and Bio
  bio?: string;
  linkedin?: string;
  twitter?: string;

  // Event-specific fields
  interests?: string[];
  challenges?: string[];
  sessionInterests?: string[];
  networkingGoals?: string[];

  // Business Information
  logoUrl?: string;
  boothId?: string;
  sponsorTier?: SponsorTier;

  // Budget and Investment
  budget?: string;
  investmentCapacity?: number;

  // Newsletter and Communication
  subscribeNewsletter?: boolean;
  communicationPreferences?: string[];

  // Badge Information
  badgeId?: string;
  badgeCreated?: boolean;
  badgeCreatedAt?: string;
  badgePrinted?: boolean;
  badgeStatus?: BadgeStatus;
  badgeUpdatedAt?: string;

  // Authentication
  generatedPassword?: string;
  loginEmail?: string;
  lastLoginAt?: string;
  loginCount?: number;

  // Activity Tracking
  lastCheckIn?: Timestamp;
  lastCheckOut?: Timestamp;
  checkInCount?: number;
  totalSessionsAttended?: number;
  totalLeadsGenerated?: number;
  totalConnectionsMade?: number;

  // Metadata
  metadata?: Record<string, any>;
  tags?: string[];
  notes?: string;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

export interface EventDoc {
  id: string;
  title: string;
  description?: string;
  shortDescription?: string;
  startAt: Timestamp;
  endAt: Timestamp;
  venue?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  status: EventStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  // Event Configuration
  maxAttendees?: number;
  currentAttendees?: number;
  registrationOpen?: boolean;
  registrationDeadline?: Timestamp;

  // Event Features
  features?: {
    matchmaking?: boolean;
    leadGeneration?: boolean;
    checkIn?: boolean;
    sessions?: boolean;
    networking?: boolean;
    exhibitors?: boolean;
    sponsors?: boolean;
  };

  // Branding
  logoUrl?: string;
  bannerUrl?: string;
  themeColor?: string;
  website?: string;

  // Contact Information
  organizerEmail?: string;
  organizerPhone?: string;

  // Metadata
  tags?: string[];
  category?: string;
  metadata?: Record<string, any>;
}

// =============================================================================
// BADGE TYPES
// =============================================================================

export interface BadgeDoc {
  id: string;
  uid: string;
  eventId: string;
  category: BadgeCategory;
  qrCode: string;
  qrUrl?: string;
  pdfUrl?: string;
  badgeUrl?: string;
  status: BadgeStatus;
  template?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  printedAt?: Timestamp;
  createdBy: string;
  updatedBy?: string;

  // Badge Content
  name: string;
  role: string;
  company?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;

  // Metadata
  metadata?: Record<string, any>;
  notes?: string;
}

export interface BadgeTemplate {
  id: string;
  name: string;
  description: string;
  layout: 'standard' | 'modern' | 'classic' | 'minimal' | 'corporate' | 'premium';
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: {
    name: number;
    role: number;
    company: number;
  };
  includeQR: boolean;
  includePhoto: boolean;
  customFields?: string[];
  preview: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
}

// =============================================================================
// CHECK-IN TYPES
// =============================================================================

export interface CheckInDoc {
  id: string;
  uid: string;
  eventId: string;
  type: CheckInType;
  timestamp: Timestamp;
  scannedBy?: string;
  location?: string;
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: string;
  };
  notes?: string;
  status?: 'completed' | 'pending' | 'failed';
  metadata?: Record<string, any>;
}

export interface CheckInAnalytics {
  userId: string;
  eventId: string;
  totalCheckIns: number;
  totalCheckOuts: number;
  firstCheckIn?: Timestamp;
  lastCheckIn?: Timestamp;
  lastCheckOut?: Timestamp;
  averageSessionDuration?: number; // in minutes
  totalTimeSpent?: number; // in minutes
  checkInStreak?: number;
  lastActivity?: Timestamp;
}

// =============================================================================
// LEAD AND MATCHMAKING TYPES
// =============================================================================

export interface LeadDoc {
  id: string;
  exhibitorUid: string;
  attendeeUid: string;
  eventId: string;
  status: LeadStatus;
  score?: number;
  source: 'qr_scan' | 'manual' | 'import' | 'api' | 'matchmaking';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  contactedAt?: Timestamp;
  convertedAt?: Timestamp;

  // Lead Information
  notes?: string;
  followUpDate?: Timestamp;
  leadValue?: number;
  priority?: PriorityLevel;

  // Visitor Information
  visitorInfo?: {
    name: string;
    email: string;
    company?: string;
    position?: string;
    category?: UserRole;
    interests?: string[];
    challenges?: string[];
  };

  // Exhibitor Information
  exhibitorInfo?: {
    company: string;
    boothNumber?: string;
    industry?: string;
    products?: string[];
    services?: string[];
  };

  // Interaction History
  interactions?: LeadInteraction[];
  metadata?: Record<string, any>;
}

export interface LeadInteraction {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'demo' | 'proposal';
  timestamp: Timestamp;
  description: string;
  outcome?: string;
  nextAction?: string;
  createdBy: string;
}

export interface MatchDoc {
  id: string;
  visitorId: string;
  exhibitorId: string;
  eventId: string;
  status: MatchStatus;
  matchScore: number;
  createdAt: Timestamp;
  respondedAt?: Timestamp;
  scheduledAt?: Timestamp;

  // Match Details
  reason?: string;
  suggestedActions?: string[];
  expiresAt?: Timestamp;

  // Profile Information
  visitorInfo?: {
    name: string;
    company?: string;
    interests?: string[];
    challenges?: string[];
  };

  exhibitorInfo?: {
    company: string;
    boothNumber?: string;
    products?: string[];
    services?: string[];
  };

  metadata?: Record<string, any>;
}

// =============================================================================
// SPONSOR AND EXHIBITOR TYPES
// =============================================================================

export interface SponsorDoc {
  id: string;
  userId: string;
  eventId: string;
  name: string;
  tier: SponsorTier;
  logoUrl?: string;
  website?: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  // Sponsorship Details
  boothNumber?: string;
  boothSize?: string;
  benefits?: string[];
  investment?: number;

  // Contact Information
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Status
  status?: 'active' | 'inactive' | 'pending';
  metadata?: Record<string, any>;
}

export interface ExhibitorDoc {
  id: string;
  userId: string;
  eventId: string;
  name: string;
  description?: string;
  boothId?: string;
  boothNumber?: string;
  boothSize?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  // Company Information
  website?: string;
  logoUrl?: string;
  industry?: string;
  companySize?: string;

  // Products and Services
  products?: string[];
  services?: string[];
  targetAudience?: string[];
  uniqueSellingPoints?: string[];

  // Contact Information
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Exhibition Details
  assets?: string[];
  brochures?: string[];
  videos?: string[];
  presentationSlots?: string[];

  // Lead Generation
  leadGenerationGoals?: string[];
  targetVisitorTypes?: UserRole[];

  // Status
  status?: 'active' | 'inactive' | 'pending' | 'confirmed';
  metadata?: Record<string, any>;
}

// =============================================================================
// SESSION AND SPEAKER TYPES
// =============================================================================

export interface SessionDoc {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  shortDescription?: string;
  speakerIds: string[];
  moderatorId?: string;
  startAt: Timestamp;
  endAt: Timestamp;
  room?: string;
  capacity?: number;
  registeredCount?: number;
  status: SessionStatus;
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  // Session Details
  type?: 'keynote' | 'panel' | 'workshop' | 'networking' | 'breakout' | 'demo';
  level?: 'beginner' | 'intermediate' | 'advanced' | 'all';
  language?: string;
  tags?: string[];

  // Materials
  presentationUrl?: string;
  recordingUrl?: string;
  resources?: string[];

  // Engagement
  allowRecording?: boolean;
  allowQuestions?: boolean;
  requireRegistration?: boolean;

  metadata?: Record<string, any>;
}

export interface SpeakerDoc {
  id: string;
  userId: string;
  eventId: string;
  bio?: string;
  expertise?: string[];
  company?: string;
  position?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  photoUrl?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  // Speaking History
  previousTalks?: string[];
  topics?: string[];
  languages?: string[];

  // Session Information
  sessionIds?: string[];
  availability?: string[];

  status?: 'confirmed' | 'pending' | 'declined';
  metadata?: Record<string, any>;
}

// =============================================================================
// NOTIFICATION AND COMMUNICATION TYPES
// =============================================================================

export interface NotificationDoc {
  id: string;
  userId: string;
  eventId?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
  readAt?: Timestamp;

  // Notification Details
  actionUrl?: string;
  actionText?: string;
  priority?: PriorityLevel;
  expiresAt?: Timestamp;

  // Metadata
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface EmailDoc {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  type: 'transactional' | 'marketing' | 'notification' | 'reminder';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  createdAt: Timestamp;
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;

  // Email Details
  templateId?: string;
  variables?: Record<string, any>;
  attachments?: string[];

  // Tracking
  openedAt?: Timestamp;
  clickedAt?: Timestamp;
  openCount?: number;
  clickCount?: number;

  metadata?: Record<string, any>;
}

// =============================================================================
// ANALYTICS AND REPORTING TYPES
// =============================================================================

export interface EventAnalytics {
  eventId: string;
  totalAttendees: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  averageSessionTime: number;
  popularSessions: string[];
  leadGenerationStats: {
    totalLeads: number;
    conversionRate: number;
    topPerformers: string[];
  };
  engagementMetrics: {
    averageInteractions: number;
    networkingConnections: number;
    sessionAttendance: number;
  };
  demographics: {
    byRole: Record<UserRole, number>;
    byIndustry: Record<string, number>;
    byCompanySize: Record<string, number>;
  };
  generatedAt: Timestamp;
}

export interface UserAnalytics {
  userId: string;
  eventId: string;
  totalSessionsAttended: number;
  totalLeadsGenerated: number;
  totalConnectionsMade: number;
  totalCheckIns: number;
  averageSessionRating?: number;
  networkingScore?: number;
  engagementLevel?: 'low' | 'medium' | 'high';
  lastActivity?: Timestamp;
  generatedAt: Timestamp;
}

// =============================================================================
// UTILITY AND HELPER TYPES
// =============================================================================

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  search?: string;
  category?: UserRole | UserRole[];
  status?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  eventId?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchOptions {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
  limit?: number;
}

// =============================================================================
// FORM AND VALIDATION TYPES
// =============================================================================

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'textarea' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

// =============================================================================
// SERVICE RESPONSE TYPES
// =============================================================================

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  message?: string;
  timestamp: string;
}

export interface BatchOperation<T = any> {
  operation: 'create' | 'update' | 'delete' | 'import';
  items: T[];
  options?: Record<string, any>;
  createdBy: string;
  createdAt: string;
}

// =============================================================================
// LEGACY TYPE ALIASES (for backward compatibility)
// =============================================================================

export type Role = UserRole; // Legacy alias
export type UserDoc = UserProfile; // Legacy alias
