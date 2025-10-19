import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { createUserBadge } from './badgeService';
import { UserProfile, SponsorTier, UserRole } from '../types/models';

export interface RegistrationData {
  category: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  countryCode: string;
  password: string;
  confirmPassword?: string;
  company?: string;
  jobTitle?: string;
  nationality?: string;
  country?: string;
  hearAbout?: string;
  companyDescription?: string;
  logoFile?: File | null;
  logoPreview?: string;
}

export interface RegistrationResult {
  success: boolean;
  error?: string;
  userId?: string;
  retryAfter?: number;
}

class RegistrationService {
  private static instance: RegistrationService;
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private processingQueue: Array<{ data: RegistrationData; resolve: Function; reject: Function }> = [];
  private isProcessing = false;
  private readonly RATE_LIMIT = 10; // requests per minute
  private readonly RATE_WINDOW = 60 * 1000; // 1 minute

  public static getInstance(): RegistrationService {
    if (!RegistrationService.instance) {
      RegistrationService.instance = new RegistrationService();
    }
    return RegistrationService.instance;
  }

  // Rate limiting check
  private checkRateLimit(email: string): boolean {
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(email);

    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimitMap.set(email, { count: 1, resetTime: now + this.RATE_WINDOW });
      return true;
    }

    if (userLimit.count >= this.RATE_LIMIT) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  // Enhanced email validation with domain checking
  private validateEmail(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Check for disposable email domains
    const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
    const domain = email.split('@')[1];

    if (disposableDomains.includes(domain)) {
      return { valid: false, error: 'Disposable email addresses are not allowed' };
    }

    return { valid: true };
  }

  // Enhanced duplicate check with retry logic
  private async checkDuplicateEmail(email: string, maxRetries = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const existingUsersQuery = query(
          collection(db, 'Users'),
          where('email', '==', email)
        );
        const existingUsersSnapshot = await getDocs(existingUsersQuery);
        return !existingUsersSnapshot.empty;
      } catch (error) {
        console.warn(`Duplicate check attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw new Error('Unable to verify email uniqueness. Please try again.');
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return false;
  }

  // Batch user creation for better performance
  private async createUserBatch(usersData: Array<{ data: RegistrationData; firebaseUser: any }>): Promise<void> {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    for (const { data, firebaseUser } of usersData) {
      const userRef = doc(db, 'Users', firebaseUser.uid);
      const userDoc = this.prepareUserDocument(data, firebaseUser, timestamp);
      batch.set(userRef, userDoc);
    }

    await batch.commit();
  }

  // Prepare user document with validation
  private prepareUserDocument(data: RegistrationData, firebaseUser: any, timestamp: string): Omit<UserProfile, 'uid'> {
    const fullName = `${data.firstName} ${data.lastName}`.trim();

    if (fullName.length < 2) {
      throw new Error('Full name must be at least 2 characters');
    }

    const baseData = {
      email: data.email,
      fullName,
      position: this.getPositionFromCategory(data.category),
      company: data.company || '',
      category: data.category as UserRole,
      mobile: data.mobile,
      countryCode: data.countryCode,
      createdAt: timestamp,
      isAgent: data.category === 'Agent',
      generatedPassword: data.password,
      loginEmail: data.email,
      contactEmail: data.email,
      contactPhone: data.mobile,
      website: '',
      address: '',
      industry: '',
      companySize: '',
      logoUrl: '',
      bio: '',
      linkedin: '',
      twitter: '',
      interests: [],
      budget: '',
      boothId: '',
      sponsorTier: 'gold' as SponsorTier
    };

    // Add category-specific fields
    const categorySpecificData = this.getCategorySpecificData(data);

    return { ...baseData, ...categorySpecificData };
  }

  private getPositionFromCategory(category: string): string {
    const positions: Record<string, string> = {
      'Exhibitor': 'Exhibitor Representative',
      'Sponsor': 'Sponsor Representative',
      'Speaker': 'Speaker',
      'Hosted Buyer': 'Hosted Buyer',
      'Agent': 'Event Agent',
      'Organizer': 'Event Organizer',
      'Admin': 'Administrator',
      'VIP': 'VIP Guest',
      'Media': 'Media Representative'
    };
    return positions[category] || 'Attendee';
  }

  private getCategorySpecificData(data: RegistrationData): Record<string, any> {
    switch (data.category) {
      case 'Exhibitor':
        return {
          industry: '',
          companySize: '',
          companyDescription: data.companyDescription || ''
        };
      case 'Sponsor':
        return {
          sponsorTier: 'gold'
        };
      case 'Speaker':
        return {
          bio: data.companyDescription || ''
        };
      case 'Hosted Buyer':
        return {
          industry: '',
          companySize: '',
          budget: '',
          interests: []
        };
      default:
        return {};
    }
  }

  // Enhanced registration with retry logic and better error handling
  public async registerUser(data: RegistrationData): Promise<RegistrationResult> {
    const startTime = Date.now();

    try {
      // Rate limiting check
      if (!this.checkRateLimit(data.email)) {
        return {
          success: false,
          error: 'Too many registration attempts. Please wait before trying again.',
          retryAfter: this.RATE_WINDOW / 1000
        };
      }

      // Validate email
      const emailValidation = this.validateEmail(data.email);
      if (!emailValidation.valid) {
        return { success: false, error: emailValidation.error };
      }

      // Check for duplicates with retry
      const isDuplicate = await this.checkDuplicateEmail(data.email);
      if (isDuplicate) {
        return {
          success: false,
          error: `An account with email ${data.email} already exists. Please use a different email address.`
        };
      }

      // Create Firebase Auth user with retry
      let firebaseUser;
      const maxAuthRetries = 3;

      for (let attempt = 1; attempt <= maxAuthRetries; attempt++) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          firebaseUser = userCredential.user;
          break;
        } catch (error: any) {
          if (attempt === maxAuthRetries) {
            throw error;
          }

          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }

      if (!firebaseUser) {
        throw new Error('Failed to create user account');
      }

      // Use transaction for atomic operations
      const userId = firebaseUser.uid;
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'Users', userId);
        const userDoc = this.prepareUserDocument(data, firebaseUser, new Date().toISOString());
        transaction.set(userRef, userDoc);
      });

      // Create badge with retry logic
      let badgeResult;
      const maxBadgeRetries = 3;

      for (let attempt = 1; attempt <= maxBadgeRetries; attempt++) {
        try {
          badgeResult = await createUserBadge(userId, {
            name: `${data.firstName} ${data.lastName}`.trim(),
            role: this.getPositionFromCategory(data.category),
            company: data.company || '',
            category: data.category
          });
          break;
        } catch (error) {
          console.warn(`Badge creation attempt ${attempt} failed:`, error);
          if (attempt === maxBadgeRetries) {
            throw new Error('Badge creation failed after multiple attempts');
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }

      if (badgeResult) {
        // Update user with badge info
        await setDoc(doc(db, 'Users', userId), {
          badgeId: badgeResult.id,
          badgeCreated: true,
          badgeCreatedAt: new Date(),
          badgeStatus: 'active'
        }, { merge: true });
      }

      // Add to event collection if applicable
      await this.addToEventCollection(userId, data);

      // Log successful registration
      console.log(`✅ Registration completed for ${data.email} in ${Date.now() - startTime}ms`);

      return { success: true, userId };

    } catch (error: any) {
      console.error('❌ Registration failed:', error);

      // Determine if error is retryable
      const retryableErrors = [
        'network-request-failed',
        'timeout',
        'unavailable',
        'internal-error'
      ];

      const isRetryable = retryableErrors.some(err => error.message?.includes(err));

      return {
        success: false,
        error: error.message || 'Registration failed. Please try again.',
        retryAfter: isRetryable ? 5 : undefined
      };
    }
  }

  // Add user to event-specific collections
  private async addToEventCollection(userId: string, data: RegistrationData): Promise<void> {
    try {
      const globalSettings = await getDoc(doc(db, 'AppSettings', 'global'));

      if (!globalSettings.exists()) {
        console.log('No global settings found for event collection');
        return;
      }

      const settings = globalSettings.data() as any;
      const eventId = settings.eventId;

      if (!eventId || eventId === 'default' || eventId === '') {
        console.log('No valid eventId found for event collection');
        return;
      }

      const userRef = doc(db, 'Users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.error('User document not found for event collection');
        return;
      }

      const userData = userDoc.data();

      // Add to appropriate event collection based on category
      let collectionName = '';
      switch (data.category) {
        case 'Exhibitor':
          collectionName = 'Exhibitors';
          break;
        case 'Sponsor':
          collectionName = 'Sponsors';
          break;
        case 'Speaker':
          collectionName = 'Speakers';
          break;
        case 'Hosted Buyer':
          collectionName = 'HostedBuyers';
          break;
        default:
          return; // No event collection for visitors/media
      }

      if (collectionName) {
        await setDoc(doc(db, 'Events', eventId, collectionName, userId), {
          ...userData,
          userId,
          eventId,
          addedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error adding user to event collection:', error);
      // Don't fail registration if event collection fails
    }
  }

  // Queue management for high-volume periods
  public async registerUserQueued(data: RegistrationData): Promise<RegistrationResult> {
    return new Promise((resolve, reject) => {
      this.processingQueue.push({ data, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const { data, resolve, reject } = this.processingQueue.shift()!;

      try {
        const result = await this.registerUser(data);
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Small delay between registrations to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  // Health check method for monitoring
  public getSystemHealth() {
    return {
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing,
      rateLimitEntries: this.rateLimitMap.size,
      timestamp: new Date().toISOString()
    };
  }
}

export const registrationService = RegistrationService.getInstance();
