// Shared Firestore data models
export type Role = 'Attendee' | 'Exhibitor' | 'Organizer' | 'Media' | 'Speaker' | 'VIP' | 'Hosted Buyer' | 'Agent';

export interface UserDoc {
  uid: string;
  email: string;
  fullName: string;
  position?: string;
  company?: string;
  category: Role;
  avatar?: string;
  isAgent?: boolean;
  createdAt: string; // ISO or Firestore Timestamp as .toDate()
  lastCheckIn?: any; // Firestore Timestamp
  checkInCount?: number;
}

export interface EventDoc {
  id: string;
  title: string;
  description?: string;
  startAt: any; // Firestore Timestamp
  endAt: any; // Firestore Timestamp
  venue?: string;
  status?: 'draft' | 'published' | 'archived';
  createdBy: string; // uid
}

export interface BadgeDoc {
  id: string; // uid or generated id
  uid: string;
  category: Role;
  qrUrl: string;
  pdfUrl?: string;
  updatedAt: any; // Timestamp
}

export interface CheckInDoc {
  id: string;
  uid: string;
  type: 'in' | 'out';
  at: any; // Timestamp
  eventId?: string;
  scannedBy?: string; // agent uid
}

export interface LeadDoc {
  id: string;
  exhibitorUid: string;
  attendeeUid: string;
  notes?: string;
  score?: number;
  createdAt: any;
}

export interface SponsorDoc {
  id: string;
  name: string;
  tier: 'gold' | 'silver' | 'bronze';
  logoUrl?: string;
}

export interface ExhibitorDoc {
  id: string;
  name: string;
  description?: string;
  boothId?: string;
  assets?: string[]; // storage URLs
}

export interface SessionDoc {
  id: string;
  title: string;
  description?: string;
  speakerIds?: string[]; // user uids
  startAt: any;
  endAt: any;
  room?: string;
}
