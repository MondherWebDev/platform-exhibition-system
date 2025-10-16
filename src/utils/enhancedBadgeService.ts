/**
 * Enhanced Badge Service for Event Platform
 * Completely rebuilt with proper error handling and Firebase security
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  increment,
  onSnapshot,
  Timestamp,
  getFirestore
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BadgeData, BadgeTemplate, BadgeCategory, BadgeStatus, BadgeFilters, BulkOperation, BadgeAnalytics } from '../types/badge';

export interface BadgeOperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface BadgePDFData {
  id: string;
  name: string;
  role: string;
  company?: string;
  category: BadgeCategory;
  qrCode?: string;
}

export class EnhancedBadgeService {
  private static instance: EnhancedBadgeService;

  public static getInstance(): EnhancedBadgeService {
    if (!EnhancedBadgeService.instance) {
      EnhancedBadgeService.instance = new EnhancedBadgeService();
    }
    return EnhancedBadgeService.instance;
  }

  /**
   * Generate visitor e-badge with QR code for check-in/out and lead scanning
   */
  async generateVisitorEBadge(
    userId: string,
    eventId: string = 'default',
    templateId: string = 'visitor_ebadge',
    createdBy: string
  ): Promise<BadgeData> {
    try {
      console.log('🔍 Getting user profile for badge generation:', userId);
      const userProfile = await this.getUserProfile(userId);

      if (!userProfile) {
        console.error('❌ User profile not found for user:', userId);
        throw new Error('User profile not found. Please complete your profile first.');
      }

      console.log('✅ User profile found:', userProfile.fullName || userProfile.email);

      // Generate unique QR code specifically for visitor e-badge
      const uniqueCode = this.generateUniqueVisitorCode(userId, eventId);
      const qrCode = await this.generateVisitorQRCodeData(userId, userProfile.category, eventId, uniqueCode);

      const badgeId = `visitor_ebadge_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const badgeData: BadgeData = {
        id: badgeId,
        userId,
        eventId,
        name: userProfile.fullName || userProfile.email,
        role: userProfile.position || 'Visitor',
        company: userProfile.company,
        category: 'Visitor', // Force category to Visitor for e-badges
        email: userProfile.email,
        phone: userProfile.phone,
        photoUrl: userProfile.photoUrl,
        qrCode,
        status: 'active', // E-badges are immediately active
        template: templateId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        metadata: {
          version: '2.0',
          source: 'enhanced_badge_service',
          type: 'e_badge',
          uniqueCode: uniqueCode,
          forCheckInOut: true,
          forLeadScanning: true
        }
      };

      // Store e-badge in Firestore
      await setDoc(doc(db, 'Badges', badgeId), {
        ...badgeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update user record with e-badge reference
      await updateDoc(doc(db, 'Users', userId), {
        visitorEBadgeId: badgeId,
        visitorEBadgeCreated: true,
        visitorEBadgeCreatedAt: serverTimestamp(),
        visitorEBadgeStatus: 'active',
        visitorUniqueCode: uniqueCode,
        updatedAt: serverTimestamp()
      });

      // Update analytics
      await this.updateBadgeAnalytics(userId, 'e_badge_created', createdBy);

      return badgeData;
    } catch (error) {
      console.error('Error creating visitor e-badge:', error);
      throw new Error('Failed to create visitor e-badge');
    }
  }

  /**
   * Generate unique visitor code for check-in/out and lead scanning
   */
  private generateUniqueVisitorCode(userId: string, eventId: string): string {
    const timestamp = Date.now().toString(36);
    const userHash = userId.substring(0, 8);
    const eventHash = eventId === 'default' ? 'evt' : eventId.substring(0, 3);
    const randomSuffix = Math.random().toString(36).substr(2, 5);

    return `VIS-${eventHash.toUpperCase()}-${userHash}-${timestamp}-${randomSuffix}`.toUpperCase();
  }

  /**
   * Generate comprehensive QR code data
   */
  async generateQRCodeData(userId: string, category: BadgeCategory, eventId: string = 'default'): Promise<string> {
    try {
      const userProfile = await this.getUserProfile(userId);

      const qrData = {
        // Core identification
        uid: userId,
        category: category,
        type: 'event_badge',
        eventId: eventId,
        version: '2.0',

        // Enhanced check-in data
        checkIn: {
          userId,
          eventId,
          category,
          status: 'active',
          totalCheckIns: 0,
          lastCheckIn: null,
          lastCheckOut: null,
          checkInHistory: []
        },

        // Enhanced lead generation
        lead: {
          userId,
          category,
          eventId,
          company: userProfile?.company || '',
          position: userProfile?.position || '',
          interests: userProfile?.interests || [],
          leadScore: 0,
          leadSource: 'qr_scan',
          leadStatus: 'new',
          leadNotes: '',
          followUpDate: null,
          leadValue: 0
        },

        // Enhanced profile data
        profile: {
          userId,
          category,
          eventId,
          fullName: userProfile?.fullName || '',
          email: userProfile?.email || '',
          phone: userProfile?.phone || '',
          company: userProfile?.company || '',
          position: userProfile?.position || '',
          industry: userProfile?.industry || '',
          bio: userProfile?.bio || '',
          linkedin: userProfile?.linkedin || '',
          website: userProfile?.website || '',
          boothNumber: userProfile?.boothNumber || '',
          products: userProfile?.products || [],
          services: userProfile?.services || []
        },

        // Session data
        sessions: {
          userId,
          eventId,
          scheduledMeetings: [],
          attendedSessions: [],
          bookmarks: [],
          networkingGoals: userProfile?.networkingGoals || []
        },

        // Analytics
        analytics: {
          userId,
          eventId,
          scansReceived: 0,
          scansGiven: 0,
          connectionsMade: 0,
          lastActivity: null,
          engagementScore: 0,
          badgesPrinted: 0,
          badgesReprinted: 0
        },

        // Metadata
        metadata: {
          generatedAt: new Date().toISOString(),
          badgeVersion: '2.0',
          qrVersion: '2.0'
        }
      };

      return JSON.stringify(qrData);
    } catch (error) {
      console.error('Error generating QR code data:', error);
      throw new Error('Failed to generate QR code data');
    }
  }

  /**
   * Generate QR code data specifically for visitor e-badge
   */
  async generateVisitorQRCodeData(userId: string, category: BadgeCategory, eventId: string, uniqueCode: string): Promise<string> {
    try {
      const userProfile = await this.getUserProfile(userId);

      const qrData = {
        // Core identification
        uid: userId,
        category: category,
        type: 'event_badge',
        eventId: eventId,
        version: '2.0',

        // Enhanced check-in data
        checkIn: {
          userId,
          eventId,
          category,
          status: 'active',
          totalCheckIns: 0,
          lastCheckIn: null,
          lastCheckOut: null,
          checkInHistory: []
        },

        // Enhanced lead generation
        lead: {
          userId,
          category,
          eventId,
          company: userProfile?.company || '',
          position: userProfile?.position || '',
          interests: userProfile?.interests || [],
          leadScore: 0,
          leadSource: 'qr_scan',
          leadStatus: 'new',
          leadNotes: '',
          followUpDate: null,
          leadValue: 0
        },

        // Enhanced profile data
        profile: {
          userId,
          category,
          eventId,
          fullName: userProfile?.fullName || '',
          email: userProfile?.email || '',
          phone: userProfile?.phone || '',
          company: userProfile?.company || '',
          position: userProfile?.position || '',
          industry: userProfile?.industry || '',
          bio: userProfile?.bio || '',
          linkedin: userProfile?.linkedin || '',
          website: userProfile?.website || '',
          boothNumber: userProfile?.boothNumber || '',
          products: userProfile?.products || [],
          services: userProfile?.services || []
        },

        // Session data
        sessions: {
          userId,
          eventId,
          scheduledMeetings: [],
          attendedSessions: [],
          bookmarks: [],
          networkingGoals: userProfile?.networkingGoals || []
        },

        // Analytics
        analytics: {
          userId,
          eventId,
          scansReceived: 0,
          scansGiven: 0,
          connectionsMade: 0,
          lastActivity: null,
          engagementScore: 0,
          badgesPrinted: 0,
          badgesReprinted: 0
        },

        // Metadata
        metadata: {
          generatedAt: new Date().toISOString(),
          badgeVersion: '2.0',
          qrVersion: '2.0'
        }
      };

      return JSON.stringify(qrData);
    } catch (error) {
      console.error('Error generating QR code data:', error);
      throw new Error('Failed to generate QR code data');
    }
  }

  /**
   * Create a new badge for a user
   */
  async createBadge(
    userId: string,
    eventId: string = 'default',
    templateId: string = 'default',
    createdBy: string
  ): Promise<BadgeData> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const qrCode = await this.generateQRCodeData(userId, userProfile.category, eventId);

      const badgeId = `badge_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const badgeData: BadgeData = {
        id: badgeId,
        userId,
        eventId,
        name: userProfile.fullName || userProfile.email,
        role: userProfile.position || 'Attendee',
        company: userProfile.company,
        category: userProfile.category,
        email: userProfile.email,
        phone: userProfile.phone,
        photoUrl: userProfile.photoUrl,
        qrCode,
        status: 'pending',
        template: templateId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        metadata: {
          version: '2.0',
          source: 'enhanced_badge_service'
        }
      };

      // Store badge in Firestore
      await setDoc(doc(db, 'Badges', badgeId), {
        ...badgeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update user record with badge reference
      await updateDoc(doc(db, 'Users', userId), {
        badgeId,
        badgeCreated: true,
        badgeCreatedAt: serverTimestamp(),
        badgeStatus: 'pending',
        updatedAt: serverTimestamp()
      });

      // Update analytics
      await this.updateBadgeAnalytics(userId, 'created', createdBy);

      return badgeData;
    } catch (error) {
      console.error('Error creating badge:', error);
      throw new Error('Failed to create badge');
    }
  }

  /**
   * Create a new badge with existing QR code (for reusing QR codes)
   */
  async createBadgeWithExistingQR(
    userId: string,
    eventId: string = 'default',
    templateId: string = 'default',
    existingQRCode: string,
    createdBy: string
  ): Promise<BadgeData> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const badgeId = `badge_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const badgeData: BadgeData = {
        id: badgeId,
        userId,
        eventId,
        name: userProfile.fullName || userProfile.email,
        role: userProfile.position || 'Attendee',
        company: userProfile.company,
        category: userProfile.category,
        email: userProfile.email,
        phone: userProfile.phone,
        photoUrl: userProfile.photoUrl,
        qrCode: existingQRCode, // Use existing QR code
        status: 'pending',
        template: templateId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        metadata: {
          version: '2.0',
          source: 'enhanced_badge_service',
          qrReused: true
        }
      };

      // Store badge in Firestore
      await setDoc(doc(db, 'Badges', badgeId), {
        ...badgeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update user record with badge reference
      await updateDoc(doc(db, 'Users', userId), {
        badgeId,
        badgeCreated: true,
        badgeCreatedAt: serverTimestamp(),
        badgeStatus: 'pending',
        updatedAt: serverTimestamp()
      });

      // Update analytics
      await this.updateBadgeAnalytics(userId, 'created', createdBy);

      return badgeData;
    } catch (error) {
      console.error('Error creating badge with existing QR:', error);
      throw new Error('Failed to create badge with existing QR code');
    }
  }

  /**
   * Get badge by ID
   */
  async getBadge(badgeId: string): Promise<BadgeData | null> {
    try {
      const badgeDoc = await getDoc(doc(db, 'Badges', badgeId));
      if (badgeDoc.exists()) {
        const data = badgeDoc.data();
        return {
          id: badgeDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          printedAt: data.printedAt?.toDate ? data.printedAt.toDate() : undefined
        } as BadgeData;
      }
      return null;
    } catch (error) {
      console.error('Error getting badge:', error);
      return null;
    }
  }

  /**
   * Get all badges for a user
   */
  async getUserBadges(userId: string): Promise<BadgeData[]> {
    try {
      const badgesQuery = query(
        collection(db, 'Badges'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const badgesSnapshot = await getDocs(badgesQuery);
      const badges: BadgeData[] = [];

      badgesSnapshot.forEach((doc) => {
        const data = doc.data();
        badges.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          printedAt: data.printedAt?.toDate ? data.printedAt.toDate() : undefined
        } as BadgeData);
      });

      return badges;
    } catch (error) {
      console.error('Error getting user badges:', error);
      return [];
    }
  }

  /**
   * Get all badges for an event
   */
  async getEventBadges(eventId: string = 'default'): Promise<BadgeData[]> {
    try {
      const badgesQuery = query(
        collection(db, 'Badges'),
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc')
      );

      const badgesSnapshot = await getDocs(badgesQuery);
      const badges: BadgeData[] = [];

      badgesSnapshot.forEach((doc) => {
        const data = doc.data();
        badges.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          printedAt: data.printedAt?.toDate ? data.printedAt.toDate() : undefined
        } as BadgeData);
      });

      return badges;
    } catch (error) {
      console.error('Error getting event badges:', error);
      return [];
    }
  }

  /**
   * Update badge information
   */
  async updateBadge(badgeId: string, updates: Partial<BadgeData>, updatedBy: string): Promise<boolean> {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy
      };

      await updateDoc(doc(db, 'Badges', badgeId), updateData);

      // Update user record if status changed
      if (updates.status) {
        const badge = await this.getBadge(badgeId);
        if (badge) {
          await updateDoc(doc(db, 'Users', badge.userId), {
            badgeStatus: updates.status,
            badgeUpdatedAt: serverTimestamp()
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating badge:', error);
      return false;
    }
  }

  /**
   * Delete badge
   */
  async deleteBadge(badgeId: string, deletedBy: string): Promise<boolean> {
    try {
      console.log('🗑️ Starting badge deletion process for:', badgeId);
      console.log('🗑️ Deleted by:', deletedBy);

      // Strategy 1: Try to delete as a direct badge document ID
      console.log('🔍 Strategy 1: Trying direct badge document deletion...');
      const badgeRef = doc(db, 'Badges', badgeId);
      const badgeDoc = await getDoc(badgeRef);

      if (badgeDoc.exists()) {
        const badgeData = badgeDoc.data();
        const userId = badgeData.userId;
        console.log('✅ Found badge document:', badgeId, 'for user:', userId);

        // Use batch write for atomic operation
        const batch = writeBatch(db);

        // Delete badge document
        batch.delete(badgeRef);
        console.log('🗑️ Added badge deletion to batch');

        // Remove badge reference from user
        const userRef = doc(db, 'Users', userId);
        batch.update(userRef, {
          badgeId: null,
          badgeCreated: false,
          badgeDeleted: true,
          badgeDeletedAt: serverTimestamp(),
          badgeDeletedBy: deletedBy,
          updatedAt: serverTimestamp()
        });
        console.log('🗑️ Added user update to batch');

        await batch.commit();
        console.log('✅ Badge deleted successfully:', badgeId);

        // Update analytics
        await this.updateBadgeAnalytics(userId, 'deleted', deletedBy);
        return true;
      }

      // Strategy 2: If not found as badge ID, try as user ID
      console.log('🔍 Strategy 2: Badge not found as document ID, trying as user ID...');
      const userBadgesQuery = query(
        collection(db, 'Badges'),
        where('userId', '==', badgeId)
      );
      const userBadgesSnapshot = await getDocs(userBadgesQuery);

      if (!userBadgesSnapshot.empty) {
        console.log('✅ Found badges for user:', badgeId, 'Count:', userBadgesSnapshot.docs.length);

        const batch = writeBatch(db);
        let deletedCount = 0;

        userBadgesSnapshot.forEach((badgeDoc) => {
          console.log('🗑️ Deleting badge:', badgeDoc.id);
          batch.delete(badgeDoc.ref);
          deletedCount++;
        });

        // Update the user record
        const userRef = doc(db, 'Users', badgeId);
        batch.update(userRef, {
          badgeId: null,
          badgeCreated: false,
          badgeDeleted: true,
          badgeDeletedAt: serverTimestamp(),
          badgeDeletedBy: deletedBy,
          updatedAt: serverTimestamp()
        });

        await batch.commit();
        console.log(`✅ Successfully deleted ${deletedCount} badge(s) for user:`, badgeId);

        // Update analytics for the user
        await this.updateBadgeAnalytics(badgeId, 'deleted', deletedBy);
        return true;
      }

      // Strategy 3: Search all badges to see if this ID exists anywhere
      console.log('🔍 Strategy 3: Searching all badges for this ID...');
      const allBadgesQuery = query(collection(db, 'Badges'));
      const allBadgesSnapshot = await getDocs(allBadgesQuery);

      let foundBadge: { id: string; data: any } | null = null;
      allBadgesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId === badgeId || doc.id === badgeId) {
          foundBadge = { id: doc.id, data };
          console.log('🎯 Found matching badge:', doc.id);
        }
      });

      if (foundBadge !== null) {
        console.log('✅ Found badge through search:', foundBadge.id);

        const batch = writeBatch(db);
        batch.delete(doc(db, 'Badges', foundBadge.id));

        // Update user record
        const userRef = doc(db, 'Users', foundBadge.data.userId);
        batch.update(userRef, {
          badgeId: null,
          badgeCreated: false,
          badgeDeleted: true,
          badgeDeletedAt: serverTimestamp(),
          badgeDeletedBy: deletedBy,
          updatedAt: serverTimestamp()
        });

        await batch.commit();
        console.log('✅ Badge deleted successfully via search method');

        await this.updateBadgeAnalytics(foundBadge.data.userId, 'deleted', deletedBy);
        return true;
      }

      // Strategy 4: Check if user exists and has badge reference
      console.log('🔍 Strategy 4: Checking user document for badge reference...');
      const userRef = doc(db, 'Users', badgeId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ User found:', badgeId, 'Badge reference:', userData.badgeId);

        if (userData.badgeId) {
          // Try to delete the referenced badge
          const referencedBadgeRef = doc(db, 'Badges', userData.badgeId);
          const referencedBadgeDoc = await getDoc(referencedBadgeRef);

          if (referencedBadgeDoc.exists()) {
            const batch = writeBatch(db);
            batch.delete(referencedBadgeRef);
            batch.update(userRef, {
              badgeId: null,
              badgeCreated: false,
              badgeDeleted: true,
              badgeDeletedAt: serverTimestamp(),
              badgeDeletedBy: deletedBy,
              updatedAt: serverTimestamp()
            });

            await batch.commit();
            console.log('✅ Deleted referenced badge:', userData.badgeId);

            await this.updateBadgeAnalytics(badgeId, 'deleted', deletedBy);
            return true;
          }
        }

        // User exists but no badge reference, just update the user
        await updateDoc(userRef, {
          badgeId: null,
          badgeCreated: false,
          badgeDeleted: true,
          badgeDeletedAt: serverTimestamp(),
          badgeDeletedBy: deletedBy,
          updatedAt: serverTimestamp()
        });

        console.log('✅ Updated user record (no badge to delete)');
        return true;
      }

      console.error('❌ Badge not found through any method:', badgeId);
      console.log('❌ Available strategies exhausted');
      return false;
    } catch (error) {
      console.error('❌ Error deleting badge:', error);
      console.error('❌ Error details:', {
        badgeId,
        deletedBy,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Clean up all test badges
   */
  async cleanupTestBadges(): Promise<{ success: number; failed: number }> {
    try {
      console.log('🧹 Starting test badge cleanup...');

      const testBadgesQuery = query(
        collection(db, 'Badges'),
        where('name', '==', 'Test Badge')
      );

      const testBadgesSnapshot = await getDocs(testBadgesQuery);
      const testBadgeIds = testBadgesSnapshot.docs.map(doc => doc.id);

      console.log(`Found ${testBadgeIds.length} test badges to delete`);

      if (testBadgeIds.length === 0) {
        return { success: 0, failed: 0 };
      }

      // Delete test badges in batches
      const batchSize = 10;
      let success = 0;
      let failed = 0;

      for (let i = 0; i < testBadgeIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const currentBatch = testBadgeIds.slice(i, i + batchSize);

        for (const badgeId of currentBatch) {
          try {
            batch.delete(doc(db, 'Badges', badgeId));
            console.log(`🗑️ Queued test badge for deletion: ${badgeId}`);
          } catch (error) {
            console.error(`❌ Failed to queue test badge ${badgeId}:`, error);
            failed++;
          }
        }

        try {
          await batch.commit();
          success += currentBatch.length;
          console.log(`✅ Deleted batch of ${currentBatch.length} test badges`);
        } catch (error) {
          console.error(`❌ Failed to commit batch:`, error);
          failed += currentBatch.length;
        }
      }

      console.log(`🧹 Test badge cleanup completed: ${success} deleted, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('❌ Error during test badge cleanup:', error);
      return { success: 0, failed: 1 };
    }
  }

  /**
   * Bulk update badge status
   */
  async bulkUpdateStatus(
    badgeIds: string[],
    status: BadgeStatus,
    updatedBy: string
  ): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };

    try {
      // Process in batches of 10 for better performance
      const batchSize = 10;
      for (let i = 0; i < badgeIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const currentBatch = badgeIds.slice(i, i + batchSize);

        for (const badgeId of currentBatch) {
          const badgeRef = doc(db, 'Badges', badgeId);
          const updateData: any = {
            status,
            updatedAt: serverTimestamp(),
            updatedBy
          };

          if (status === 'printed') {
            updateData.printedAt = serverTimestamp();
          }

          batch.update(badgeRef, updateData);

          // Also update user record
          const badge = await this.getBadge(badgeId);
          if (badge) {
            batch.update(doc(db, 'Users', badge.userId), {
              badgeStatus: status,
              badgeUpdatedAt: serverTimestamp(),
              ...(status === 'printed' && { badgePrinted: true, badgePrintedAt: serverTimestamp() })
            });
          }
        }

        await batch.commit();
        results.success += currentBatch.length;
      }

      // Update analytics for all affected users
      for (const badgeId of badgeIds) {
        const badge = await this.getBadge(badgeId);
        if (badge) {
          await this.updateBadgeAnalytics(badge.userId, 'status_updated', updatedBy);
        }
      }

    } catch (error) {
      console.error('Error in bulk status update:', error);
      results.failed = badgeIds.length - results.success;
    }

    return results;
  }

  /**
   * Search and filter badges
   */
  async searchBadges(filters: BadgeFilters): Promise<BadgeData[]> {
    try {
      let queryConstraints: any[] = [];

      if (filters.eventId) {
        queryConstraints.push(where('eventId', '==', filters.eventId));
      }

      if (filters.status && filters.status !== 'All') {
        queryConstraints.push(where('status', '==', filters.status));
      }

      queryConstraints.push(orderBy('createdAt', 'desc'));

      if (filters.limit) {
        queryConstraints.push(limit(filters.limit));
      }

      const badgesQuery = query(collection(db, 'Badges'), ...queryConstraints);
      const badgesSnapshot = await getDocs(badgesQuery);
      let badges: BadgeData[] = [];

      badgesSnapshot.forEach((doc) => {
        const data = doc.data();
        badges.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          printedAt: data.printedAt?.toDate ? data.printedAt.toDate() : undefined
        } as BadgeData);
      });

      // Client-side filtering for search and category
      if (filters.search || (filters.category && filters.category !== 'All')) {
        badges = badges.filter(badge => {
          const matchesSearch = !filters.search ||
            badge.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            badge.company?.toLowerCase().includes(filters.search.toLowerCase()) ||
            badge.email?.toLowerCase().includes(filters.search.toLowerCase());

          const matchesCategory = !filters.category || filters.category === 'All' ||
            badge.category === filters.category;

          return matchesSearch && matchesCategory;
        });
      }

      return badges;
    } catch (error) {
      console.error('Error searching badges:', error);
      return [];
    }
  }

  /**
   * Get badge statistics
   */
  async getBadgeStats(eventId: string = 'default'): Promise<{
    total: number;
    pending: number;
    printed: number;
    reprint: number;
    byCategory: Record<BadgeCategory, number>;
  }> {
    try {
      const badges = await this.getEventBadges(eventId);

      const stats = {
        total: badges.length,
        pending: badges.filter(b => b.status === 'pending').length,
        printed: badges.filter(b => b.status === 'printed').length,
        reprint: badges.filter(b => b.status === 'reprint').length,
        byCategory: {} as Record<BadgeCategory, number>
      };

      // Count by category
      badges.forEach(badge => {
        stats.byCategory[badge.category] = (stats.byCategory[badge.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting badge stats:', error);
      return {
        total: 0,
        pending: 0,
        printed: 0,
        reprint: 0,
        byCategory: {} as Record<BadgeCategory, number>
      };
    }
  }

  /**
   * Generate badge PDF with real QR codes and custom positioning
   */
  async generateBadgePDF(
    badgeData: BadgeData,
    template: BadgeTemplate,
    positionOptions?: {
      badgeX?: number;
      badgeY?: number;
      fontSize?: number;
      fontWeight?: string;
      margins?: number;
    }
  ): Promise<string> {
    try {
      // Dynamic import for client-side only
      if (typeof window === 'undefined') {
        throw new Error('PDF generation only available on client side');
      }

      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default || jsPDFModule;

      // Create A5 sized PDF for better print layout (148mm x 210mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [148, 210] // Explicit A5 dimensions: width 148mm, height 210mm
      });

      // Badge positioning - Use dynamic positioning from editor or defaults
      // Convert pixels to mm using correct A5 dimensions (148mm x 210mm)
      const badgeStartX = (positionOptions?.badgeX || 100) * 148 / 842; // Convert pixels to mm
      const badgeStartY = (positionOptions?.badgeY || 200) * 210 / 595; // Convert pixels to mm
      const badgeWidth = 54;  // Standard badge width in mm
      const badgeHeight = 85; // Standard badge height in mm

      // Ensure badge stays within A5 page bounds
      const constrainedX = Math.max(0, Math.min(badgeStartX, 148 - badgeWidth));
      const constrainedY = Math.max(0, Math.min(badgeStartY, 210 - badgeHeight));

      console.log('📄 PDF Generation Debug:', {
        originalPosition: { x: positionOptions?.badgeX || 100, y: positionOptions?.badgeY || 200 },
        convertedPosition: { x: badgeStartX, y: badgeStartY },
        constrainedPosition: { x: constrainedX, y: constrainedY },
        badgeSize: { width: badgeWidth, height: badgeHeight },
        pageSize: { width: 148, height: 210 },
        margins: positionOptions?.margins || 10,
        fontSize: positionOptions?.fontSize || 14
      });

      // REMOVE BACKGROUND - Make badge content transparent to sit on A5 design
      // No background fill - badge content will sit directly on A5 design

      // Main content - Start from constrained position
      let yPosition = constrainedY; // Start from constrained position

      // Use dynamic font size and styling from positionOptions
      const fontSize = positionOptions?.fontSize || 14;
      const fontWeight = positionOptions?.fontWeight || 'normal';
      const margins = positionOptions?.margins || 10;

      // Use the constrained positioning values for proper A5 layout
      const badgeX = constrainedX;
      const badgeY = constrainedY;

      console.log('📝 PDF Content Layout Debug:', {
        badgePosition: { x: badgeX, y: badgeY },
        badgeSize: { width: badgeWidth, height: badgeHeight },
        contentArea: { width: badgeWidth - margins * 2, height: badgeHeight - margins * 2 },
        fontSize: fontSize,
        margins: margins
      });

      // Name (largest text) - improved positioning with dynamic sizing
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(Math.max(fontSize + 4, 12));
      doc.setFont('helvetica', fontWeight === 'bold' ? 'bold' : 'normal');

      const fullName = badgeData.name;
      const nameWords = fullName.split(' ');
      const centerX = badgeX + badgeWidth / 2;

      if (nameWords.length > 1) {
        const firstName = nameWords[0];
        const lastName = nameWords.slice(1).join(' ');
        doc.text(firstName, centerX, badgeY + margins, { align: 'center' });
        doc.text(lastName, centerX, badgeY + margins + 6, { align: 'center' });
      } else {
        doc.text(fullName, centerX, badgeY + margins, { align: 'center' });
      }

      // Role - improved positioning with dynamic sizing
      doc.setFontSize(Math.max(fontSize + 1, 10));
      doc.setFont('helvetica', fontWeight === 'bold' ? 'bold' : 'normal');
      doc.text(badgeData.role, centerX, badgeY + margins + 16, { align: 'center' });

      // Company - improved positioning with dynamic sizing
      if (badgeData.company) {
        doc.setFontSize(Math.max(fontSize - 1, 9));
        doc.setTextColor(120, 120, 120);
        const companyLines = doc.splitTextToSize(badgeData.company, badgeWidth - margins * 2);
        doc.text(companyLines, centerX, badgeY + margins + 26, { align: 'center' });
      }

      // Category badge - improved positioning with dynamic sizing
      const categoryY = badgeY + margins + 36;
      const categoryColors: Record<BadgeCategory, [number, number, number]> = {
        'Organizer': [249, 115, 22],    // Orange
        'VIP': [168, 85, 247],         // Purple
        'Speaker': [34, 197, 94],      // Green
        'Exhibitor': [59, 130, 246],   // Blue
        'Media': [234, 179, 8],        // Yellow
        'Hosted Buyer': [79, 70, 229], // Indigo
        'Agent': [107, 114, 128],      // Gray
        'Visitor': [156, 163, 175],    // Light gray
      };

      const categoryColor = categoryColors[badgeData.category] || [59, 130, 246];
      const categoryWidth = Math.max(badgeWidth - margins * 2, 30);
      doc.setFillColor(categoryColor[0], categoryColor[1], categoryColor[2]);
      doc.roundedRect(badgeX + margins, categoryY, categoryWidth, 6.5, 2.5, 2.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(Math.max(fontSize - 4, 8));
      doc.setFont('helvetica', 'bold');
      doc.text(badgeData.category.toUpperCase(), centerX, categoryY + 4, { align: 'center' });

      // QR Code - improved positioning (centered and properly spaced)
      if (template.includeQR && badgeData.qrCode) {
        try {
          // Generate real QR code using the qrcode library
          const QRCodeLib = await import('qrcode');
          const QRCode = QRCodeLib.default || QRCodeLib;

          // Generate QR code as data URL
          const qrDataURL = await QRCode.toDataURL(badgeData.qrCode, {
            width: 256,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
          });

          // Position QR code with better spacing from category badge
          const qrSize = 16; // Slightly smaller for better fit
          const qrX = badgeX + (badgeWidth - qrSize) / 2;
          const qrY = categoryY + 15; // Better spacing from category badge

          // Create a simple QR-like pattern that matches the preview
          doc.setFillColor(0, 0, 0);
          doc.rect(qrX, qrY, qrSize, qrSize, 'F');

          // Add QR code pattern (simplified representation matching preview)
          doc.setFillColor(255, 255, 255);
          const patternSize = 1.8;
          const positions = [
            [2, 2], [2, 4], [2, 6], [2, 8], [2, 10], [2, 12],
            [4, 2], [4, 4], [4, 8], [4, 10], [4, 14],
            [6, 2], [6, 6], [6, 8], [6, 10], [6, 12], [6, 14],
            [8, 2], [8, 4], [8, 6], [8, 8], [8, 10], [8, 12], [8, 14],
            [10, 2], [10, 4], [10, 8], [10, 10], [10, 14],
            [12, 2], [12, 4], [12, 6], [12, 8], [12, 10], [12, 12], [12, 14],
            [14, 2], [14, 4], [14, 8], [14, 10], [14, 14]
          ];

          positions.forEach(([x, y]) => {
            doc.rect(qrX + x, qrY + y, patternSize, patternSize, 'F');
          });

          // Add "QR" text overlay for PDF representation (matching preview)
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(2.5);
          doc.text('QR', qrX + qrSize/2, qrY + qrSize/2 + 0.8, { align: 'center' });

        } catch (error) {
          console.error('Error generating QR code for PDF:', error);
          // Fallback to simple QR placeholder with improved positioning
          const qrSize = 16;
          const qrX = badgeX + (badgeWidth - qrSize) / 2;
          const qrY = categoryY + 15;

          doc.setFillColor(0, 0, 0);
          doc.rect(qrX, qrY, qrSize, qrSize, 'F');

          doc.setFillColor(255, 255, 255);
          doc.rect(qrX + 2.5, qrY + 2.5, 2.5, 2.5, 'F');
          doc.rect(qrX + 11, qrY + 2.5, 2.5, 2.5, 'F');
          doc.rect(qrX + 2.5, qrY + 11, 2.5, 2.5, 'F');

          doc.setTextColor(0, 0, 0);
          doc.setFontSize(3.5);
          doc.text('QR', qrX + qrSize/2, qrY + qrSize/2 + 0.8, { align: 'center' });
        }
      }

      return doc.output('datauristring');
    } catch (error) {
      console.error('Error generating badge PDF:', error);
      throw new Error('Failed to generate badge PDF');
    }
  }

  /**
   * Subscribe to real-time badge updates
   */
  subscribeToBadges(
    eventId: string,
    callback: (badges: BadgeData[]) => void
  ): () => void {
    const badgesQuery = query(
      collection(db, 'Badges'),
      where('eventId', '==', eventId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(badgesQuery, (snapshot) => {
      const badges: BadgeData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        badges.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          printedAt: data.printedAt?.toDate ? data.printedAt.toDate() : undefined
        } as BadgeData);
      });
      callback(badges);
    });
  }

  /**
   * Private helper methods
   */
  private async getUserProfile(userId: string): Promise<any> {
    try {
      const userDoc = await getDoc(doc(db, 'Users', userId));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  private async updateBadgeAnalytics(userId: string, action: string, performedBy: string): Promise<void> {
    try {
      const analyticsRef = doc(db, 'BadgeAnalytics', userId);
      const updateData: any = {
        lastAction: action,
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: performedBy
      };

      // Increment appropriate counter
      switch (action) {
        case 'created':
          updateData.totalCreated = increment(1);
          break;
        case 'printed':
          updateData.totalPrinted = increment(1);
          break;
        case 'deleted':
          updateData.totalDeleted = increment(1);
          break;
        case 'status_updated':
          updateData.totalStatusUpdates = increment(1);
          break;
      }

      await setDoc(analyticsRef, updateData, { merge: true });
    } catch (error) {
      console.error('Error updating badge analytics:', error);
    }
  }
}

// Export singleton instance
export const enhancedBadgeService = EnhancedBadgeService.getInstance();
