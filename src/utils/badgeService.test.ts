/**
 * Badge Service Tests
 * Comprehensive testing for badge creation, management, and QR code functionality
 */

import {
  generateQRCodeData,
  createUserBadge,
  getUserBadge,
  getEventBadges,
  updateBadge,
  updateBadgeStatus,
  deleteBadge,
  generateEnhancedBadge,
  processQRCodeScan,
  bulkUpdateBadgeStatus,
  searchBadges,
  badgeTemplates
} from './badgeService';

// Mock Firebase
jest.mock('../firebaseConfig', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn()
}));

describe('Badge Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateQRCodeData', () => {
    it('should generate valid QR code data for a user', () => {
      const userId = 'test-user-123';
      const category = 'Exhibitor';
      const eventId = 'test-event-456';

      const qrData = generateQRCodeData(userId, category, eventId);

      expect(typeof qrData).toBe('string');

      const parsedData = JSON.parse(qrData);
      expect(parsedData.uid).toBe(userId);
      expect(parsedData.category).toBe(category);
      expect(parsedData.eventId).toBe(eventId);
      expect(parsedData.type).toBe('event_badge');
      expect(parsedData.timestamp).toBeDefined();
      expect(parsedData.version).toBe('1.0');
    });

    it('should include all required data sections', () => {
      const qrData = generateQRCodeData('test-user', 'Visitor', 'test-event');
      const parsedData = JSON.parse(qrData);

      expect(parsedData.checkIn).toBeDefined();
      expect(parsedData.lead).toBeDefined();
      expect(parsedData.profile).toBeDefined();
      expect(parsedData.contact).toBeDefined();
      expect(parsedData.sessions).toBeDefined();
      expect(parsedData.analytics).toBeDefined();
    });

    it('should handle missing eventId gracefully', () => {
      const qrData = generateQRCodeData('test-user', 'Visitor');
      const parsedData = JSON.parse(qrData);

      expect(parsedData.eventId).toBe('default');
    });
  });

  describe('Badge Templates', () => {
    it('should have predefined templates', () => {
      expect(badgeTemplates).toBeDefined();
      expect(Array.isArray(badgeTemplates)).toBe(true);
      expect(badgeTemplates.length).toBeGreaterThan(0);
    });

    it('should have required template properties', () => {
      badgeTemplates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.backgroundColor).toBeDefined();
        expect(template.textColor).toBeDefined();
        expect(template.accentColor).toBeDefined();
        expect(template.layout).toBeDefined();
      });
    });
  });

  describe('Badge Creation', () => {
    it('should create a badge successfully', async () => {
      const { setDoc, doc } = require('firebase/firestore');

      // Mock successful Firestore operations
      doc.mockReturnValue('mock-doc-ref');
      setDoc.mockResolvedValue(undefined);

      const userData = {
        name: 'John Doe',
        role: 'Software Engineer',
        company: 'Tech Corp',
        category: 'Exhibitor'
      };

      const result = await createUserBadge('test-user-123', userData, 'test-event');

      expect(result).toBeDefined();
      expect(result?.name).toBe(userData.name);
      expect(result?.role).toBe(userData.role);
      expect(result?.company).toBe(userData.company);
      expect(result?.category).toBe(userData.category);
      expect(setDoc).toHaveBeenCalledTimes(2); // Badge + User update
    });

    it('should handle badge creation errors', async () => {
      const { setDoc } = require('firebase/firestore');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      const userData = {
        name: 'John Doe',
        role: 'Software Engineer',
        company: 'Tech Corp',
        category: 'Exhibitor'
      };

      const result = await createUserBadge('test-user-123', userData, 'test-event');

      expect(result).toBeNull();
    });
  });

  describe('Badge Retrieval', () => {
    it('should retrieve user badge successfully', async () => {
      const { getDoc, doc } = require('firebase/firestore');

      const mockBadgeData = {
        id: 'badge_123',
        userId: 'test-user-123',
        name: 'John Doe',
        role: 'Software Engineer',
        company: 'Tech Corp',
        category: 'Exhibitor',
        qrCode: 'test-qr-data',
        badgeUrl: 'test-url',
        createdAt: new Date(),
        eventId: 'test-event'
      };

      // Mock user document exists with badge reference
      getDoc.mockImplementation((ref: any) => {
        if (ref && ref.path && ref.path.includes('Users')) {
          return Promise.resolve({
            exists: () => true,
            data: () => ({ badgeId: 'badge_123' })
          });
        } else if (ref && ref.path && ref.path.includes('Badges')) {
          return Promise.resolve({
            exists: () => true,
            data: () => mockBadgeData
          });
        }
        return Promise.resolve({ exists: () => false });
      });

      const result = await getUserBadge('test-user-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('badge_123');
      expect(result?.name).toBe('John Doe');
    });

    it('should return null for non-existent badge', async () => {
      const { getDoc } = require('firebase/firestore');

      getDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await getUserBadge('non-existent-user');

      expect(result).toBeNull();
    });
  });

  describe('Badge Status Management', () => {
    it('should update badge status successfully', async () => {
      const { setDoc, getDoc, doc } = require('firebase/firestore');

      // Mock user exists with badge reference
      getDoc.mockImplementation((ref: any) => {
        if (ref && ref.path && ref.path.includes('Users')) {
          return Promise.resolve({
            exists: () => true,
            data: () => ({ badgeId: 'badge_123' })
          });
        }
        return Promise.resolve({ exists: () => false });
      });

      setDoc.mockResolvedValue(undefined);

      const result = await updateBadgeStatus('test-user-123', 'printed');

      expect(result).toBe(true);
      expect(setDoc).toHaveBeenCalledTimes(2); // Badge + User update
    });

    it('should handle non-existent user', async () => {
      const { getDoc } = require('firebase/firestore');

      getDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await updateBadgeStatus('non-existent-user', 'printed');

      expect(result).toBe(false);
    });
  });

  describe('Badge Search and Filtering', () => {
    it('should search badges by name', async () => {
      const { query, collection, where, getDocs } = require('firebase/firestore');

      const mockBadges = [
        {
          id: 'badge_1',
          data: () => ({
            name: 'John Doe',
            category: 'Exhibitor',
            status: 'pending',
            eventId: 'test-event'
          })
        },
        {
          id: 'badge_2',
          data: () => ({
            name: 'Jane Smith',
            category: 'Visitor',
            status: 'printed',
            eventId: 'test-event'
          })
        }
      ];

      getDocs.mockResolvedValue({
        forEach: (callback: (doc: any, index: number, array: any[]) => void) => {
          mockBadges.forEach((badge, index) => {
            callback(badge, index, mockBadges);
          });
        }
      });

      const results = await searchBadges({
        search: 'John',
        eventId: 'test-event'
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('John Doe');
    });

    it('should filter badges by category', async () => {
      const { query, collection, where, getDocs } = require('firebase/firestore');

      const mockBadges = [
        {
          id: 'badge_1',
          data: () => ({
            name: 'John Doe',
            category: 'Exhibitor',
            status: 'pending',
            eventId: 'test-event'
          })
        },
        {
          id: 'badge_2',
          data: () => ({
            name: 'Jane Smith',
            category: 'Visitor',
            status: 'printed',
            eventId: 'test-event'
          })
        }
      ];

      getDocs.mockResolvedValue({
        forEach: (callback: (doc: any, index: number, array: any[]) => void) => {
          mockBadges.forEach((badge, index) => {
            callback(badge, index, mockBadges);
          });
        }
      });

      const results = await searchBadges({
        category: 'Exhibitor',
        eventId: 'test-event'
      });

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Exhibitor');
    });
  });

  describe('QR Code Processing', () => {
    it('should process valid QR code scan for check-in', async () => {
      const qrData = generateQRCodeData('test-user-123', 'Visitor', 'test-event');

      // Mock successful check-in storage
      const { setDoc } = require('firebase/firestore');
      setDoc.mockResolvedValue(undefined);

      const result = await processQRCodeScan(
        qrData,
        'agent-user-456',
        'Agent',
        'checkin'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('checkin');
      expect(result.message).toContain('Checked in');
    });

    it('should handle invalid QR code data', async () => {
      const invalidQRData = 'invalid-json-data';

      const result = await processQRCodeScan(
        invalidQRData,
        'agent-user-456',
        'Agent'
      );

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should process lead capture for exhibitor scanning visitor', async () => {
      const visitorQRData = generateQRCodeData('visitor-123', 'Visitor', 'test-event');

      // Mock successful lead storage
      const { setDoc } = require('firebase/firestore');
      setDoc.mockResolvedValue(undefined);

      const result = await processQRCodeScan(
        visitorQRData,
        'exhibitor-456',
        'Exhibitor'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('lead_capture');
      expect(result.message).toContain('Captured lead');
    });
  });

  describe('Bulk Operations', () => {
    it('should update multiple badge statuses', async () => {
      const { setDoc, getDoc } = require('firebase/firestore');

      // Mock badge documents exist
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: 'user-123' })
      });

      setDoc.mockResolvedValue(undefined);

      const badgeIds = ['badge-1', 'badge-2', 'badge-3'];
      const result = await bulkUpdateBadgeStatus(badgeIds, 'printed', 'admin-user');

      expect(result).toBe(true);
      expect(setDoc).toHaveBeenCalledTimes(6); // 3 badges × 2 updates each (badge + user)
    });

    it('should handle bulk operation errors', async () => {
      const { setDoc } = require('firebase/firestore');
      setDoc.mockRejectedValue(new Error('Firestore error'));

      const badgeIds = ['badge-1', 'badge-2'];
      const result = await bulkUpdateBadgeStatus(badgeIds, 'printed', 'admin-user');

      expect(result).toBe(false);
    });
  });

  describe('Badge Generation', () => {
    it('should generate enhanced badge image', async () => {
      // Mock canvas and context
      const mockContext = {
        fillStyle: '',
        fillRect: jest.fn(),
        fillText: jest.fn(),
        font: '',
        textAlign: '',
        fill: jest.fn(),
        rect: jest.fn(),
        createLinearGradient: jest.fn(() => ({
          addColorStop: jest.fn()
        }))
      };

      const mockCanvas = {
        getContext: jest.fn(() => mockContext),
        width: 300,
        height: 400,
        toDataURL: jest.fn(() => 'data:image/png;base64,mock-data')
      };

      // Mock document.createElement
      global.document.createElement = jest.fn(() => mockCanvas as any);

      const badgeData = {
        id: 'badge_123',
        userId: 'test-user-123',
        name: 'John Doe',
        role: 'Software Engineer',
        company: 'Tech Corp',
        category: 'Exhibitor',
        qrCode: 'test-qr-data',
        badgeUrl: 'test-url',
        createdAt: new Date(),
        eventId: 'test-event'
      };

      const template = badgeTemplates[0];

      const result = await generateEnhancedBadge(badgeData, template);

      expect(typeof result).toBe('string');
      expect(result.startsWith('data:image/')).toBe(true);
    });

    it('should handle canvas context errors', async () => {
      // Mock document.createElement to return canvas with null context
      const mockCanvas = {
        getContext: jest.fn(() => null),
        width: 300,
        height: 400
      };

      global.document.createElement = jest.fn((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas as any;
        }
        return {} as any;
      });

      const badgeData = {
        id: 'badge_123',
        userId: 'test-user-123',
        name: 'John Doe',
        role: 'Software Engineer',
        company: 'Tech Corp',
        category: 'Exhibitor',
        qrCode: 'test-qr-data',
        badgeUrl: 'test-url',
        createdAt: new Date(),
        eventId: 'test-event'
      };

      await expect(generateEnhancedBadge(badgeData)).rejects.toThrow('Canvas context not available');
    });
  });

  describe('Badge Deletion', () => {
    it('should delete badge successfully', async () => {
      const { setDoc, getDoc, deleteDoc, doc } = require('firebase/firestore');

      // Mock badge exists
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ userId: 'test-user-123' })
      });

      setDoc.mockResolvedValue(undefined);
      deleteDoc.mockResolvedValue(undefined);

      const result = await deleteBadge('badge-123');

      expect(result).toBe(true);
      expect(setDoc).toHaveBeenCalledTimes(1); // User update to remove badge reference
      expect(deleteDoc).toHaveBeenCalledTimes(1); // Delete badge document
    });

    it('should handle deletion of non-existent badge', async () => {
      const { getDoc, setDoc, deleteDoc } = require('firebase/firestore');

      // Mock badge doesn't exist
      getDoc.mockResolvedValue({
        exists: () => false
      });

      setDoc.mockResolvedValue(undefined);
      deleteDoc.mockResolvedValue(undefined);

      const result = await deleteBadge('non-existent-badge');

      expect(result).toBe(false);
      expect(deleteDoc).not.toHaveBeenCalled(); // Should not delete if badge doesn't exist
    });
  });

  describe('Error Handling', () => {
    it('should handle Firestore errors gracefully', async () => {
      const { setDoc } = require('firebase/firestore');
      setDoc.mockRejectedValue(new Error('Network error'));

      const userData = {
        name: 'John Doe',
        role: 'Software Engineer',
        company: 'Tech Corp',
        category: 'Exhibitor'
      };

      const result = await createUserBadge('test-user-123', userData, 'test-event');

      expect(result).toBeNull();
    });

    it('should handle malformed QR data in processing', async () => {
      const malformedData = '{ invalid json }';

      const result = await processQRCodeScan(malformedData, 'agent-123', 'Agent');

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.error).toBeDefined();
    });
  });
});
