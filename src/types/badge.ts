export interface BadgeData {
  id: string;
  userId: string;
  eventId: string;
  name: string;
  role: string;
  company?: string;
  category: BadgeCategory;
  email?: string;
  phone?: string;
  photoUrl?: string;
  qrCode: string;
  badgeUrl?: string;
  status: BadgeStatus;
  template: string;
  createdAt: Date;
  updatedAt: Date;
  printedAt?: Date;
  createdBy: string;
  updatedBy?: string;
  metadata?: Record<string, any>;
}

export type BadgeCategory =
  | 'Organizer'
  | 'VIP'
  | 'Speaker'
  | 'Exhibitor'
  | 'Media'
  | 'Hosted Buyer'
  | 'Agent'
  | 'Visitor';

export type BadgeStatus = 'pending' | 'printed' | 'reprint' | 'damaged' | 'lost' | 'active';

export interface BadgeTemplate {
  id: string;
  name: string;
  description: string;
  layout: 'standard' | 'modern' | 'classic' | 'minimal' | 'corporate';
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
  createdAt: Date;
  updatedAt: Date;
}

export interface BadgeFilters {
  search?: string;
  category?: BadgeCategory | 'All';
  status?: BadgeStatus | 'All';
  eventId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface BulkOperation {
  type: 'status_update' | 'print' | 'delete' | 'export';
  badgeIds: string[];
  parameters?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
}

export interface BadgeAnalytics {
  userId: string;
  totalCreated: number;
  totalPrinted: number;
  totalDeleted: number;
  totalStatusUpdates: number;
  lastAction: string;
  lastUpdated: Date;
  lastUpdatedBy: string;
}
