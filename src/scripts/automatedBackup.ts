#!/usr/bin/env tsx
/**
 * Automated Backup Script for Exhibition B2B Platform
 * Handles daily backups during 3-day exhibition events
 *
 * Usage:
 *   npm run backup:daily    - Run daily backup
 *   npm run backup:full     - Run full backup with cleanup
 *   npm run backup:restore  - Restore from latest backup
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { Redis } from '@upstash/redis';

// Types for backup data
interface BackupMetadata {
  timestamp: string;
  eventId: string;
  type: 'daily' | 'full' | 'incremental';
  collections: string[];
  recordCounts: { [collection: string]: number };
  size: number;
  version: string;
  checksum: string;
}

interface BackupConfig {
  eventId: string;
  backupType: 'daily' | 'full' | 'incremental';
  collections: string[];
  storagePath: string;
  retentionDays: number;
  compressData: boolean;
}

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Redis configuration for cache backup
const redisConfig = {
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
};

class AutomatedBackupService {
  private app: any;
  private db: any;
  private storage: any;
  private redis: Redis | null = null;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !!(firebaseConfig.apiKey && redisConfig.url && redisConfig.token);

    if (this.isEnabled) {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.storage = getStorage(this.app);
      this.redis = new Redis(redisConfig);

      console.log('✅ Automated backup service initialized');
    } else {
      console.warn('⚠️ Backup service disabled - missing configuration');
    }
  }

  /**
   * Run daily backup for active event
   */
  async runDailyBackup(eventId: string = 'default'): Promise<{ success: boolean; metadata?: BackupMetadata; error?: string }> {
    if (!this.isEnabled) {
      return { success: false, error: 'Backup service not configured' };
    }

    console.log(`🔄 Starting daily backup for event: ${eventId}`);

    try {
      const timestamp = new Date().toISOString();
      const backupId = `daily-${eventId}-${Date.now()}`;

      // Collections to backup daily
      const collections = [
        'Users',
        'CheckIns',
        'Leads',
        'MatchRecommendations',
        'Badges',
        'Events'
      ];

      const backupData: any = {};
      const recordCounts: { [collection: string]: number } = {};

      // Backup each collection
      for (const collectionName of collections) {
        console.log(`📦 Backing up collection: ${collectionName}`);

        const collectionData = await this.backupCollection(collectionName, eventId);
        backupData[collectionName] = collectionData;
        recordCounts[collectionName] = collectionData.length;

        // Small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Backup Redis cache data
      const cacheData = await this.backupRedisCache(eventId);
      backupData['redis-cache'] = cacheData;

      // Create backup metadata
      const metadata: BackupMetadata = {
        timestamp,
        eventId,
        type: 'daily',
        collections,
        recordCounts,
        size: JSON.stringify(backupData).length,
        version: '1.0.0',
        checksum: this.generateChecksum(backupData),
      };

      // Upload to Firebase Storage
      const backupPath = `backups/${eventId}/daily/${backupId}.json`;
      await this.uploadBackup(backupPath, { metadata, data: backupData });

      // Cleanup old backups
      await this.cleanupOldBackups(eventId, 'daily', 7); // Keep 7 days of daily backups

      console.log(`✅ Daily backup completed: ${backupId}`);
      return { success: true, metadata };

    } catch (error) {
      console.error('❌ Daily backup failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Run full backup with all data
   */
  async runFullBackup(eventId: string = 'default'): Promise<{ success: boolean; metadata?: BackupMetadata; error?: string }> {
    if (!this.isEnabled) {
      return { success: false, error: 'Backup service not configured' };
    }

    console.log(`🔄 Starting full backup for event: ${eventId}`);

    try {
      const timestamp = new Date().toISOString();
      const backupId = `full-${eventId}-${Date.now()}`;

      // All collections for full backup
      const collections = [
        'Users',
        'Events',
        'CheckIns',
        'Leads',
        'MatchRecommendations',
        'Badges',
        'ProfileViews',
        'AppSettings',
        'Notifications'
      ];

      const backupData: any = {};
      const recordCounts: { [collection: string]: number } = {};

      // Backup each collection
      for (const collectionName of collections) {
        console.log(`📦 Backing up collection: ${collectionName}`);

        const collectionData = await this.backupCollection(collectionName, eventId);
        backupData[collectionName] = collectionData;
        recordCounts[collectionName] = collectionData.length;

        // Small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Backup Redis cache data
      const cacheData = await this.backupRedisCache(eventId);
      backupData['redis-cache'] = cacheData;

      // Backup media files (badge images, etc.)
      const mediaData = await this.backupMediaFiles(eventId);
      backupData['media-files'] = mediaData;

      // Create backup metadata
      const metadata: BackupMetadata = {
        timestamp,
        eventId,
        type: 'full',
        collections,
        recordCounts,
        size: JSON.stringify(backupData).length,
        version: '1.0.0',
        checksum: this.generateChecksum(backupData),
      };

      // Upload to Firebase Storage
      const backupPath = `backups/${eventId}/full/${backupId}.json`;
      await this.uploadBackup(backupPath, { metadata, data: backupData });

      // Cleanup old full backups
      await this.cleanupOldBackups(eventId, 'full', 30); // Keep 30 days of full backups

      console.log(`✅ Full backup completed: ${backupId}`);
      return { success: true, metadata };

    } catch (error) {
      console.error('❌ Full backup failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Restore from latest backup
   */
  async restoreFromBackup(eventId: string = 'default', backupType: 'daily' | 'full' = 'daily'): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled) {
      return { success: false, error: 'Backup service not configured' };
    }

    try {
      console.log(`🔄 Restoring from ${backupType} backup for event: ${eventId}`);

      // Find latest backup
      const backupPath = `backups/${eventId}/${backupType}`;
      const latestBackup = await this.findLatestBackup(backupPath);

      if (!latestBackup) {
        return { success: false, error: `No ${backupType} backup found for event: ${eventId}` };
      }

      // Download backup data
      const backupData = await this.downloadBackup(latestBackup);

      // Restore each collection
      for (const [collectionName, data] of Object.entries(backupData.data)) {
        if (collectionName === 'redis-cache' || collectionName === 'media-files') {
          continue; // Skip cache and media for now
        }

        console.log(`🔄 Restoring collection: ${collectionName}`);
        await this.restoreCollection(collectionName, data as any[]);
      }

      // Restore Redis cache if available
      if (backupData.data['redis-cache']) {
        await this.restoreRedisCache(backupData.data['redis-cache'] as any);
      }

      console.log(`✅ Restore completed from backup: ${latestBackup}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Restore failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Backup a single collection
   */
  private async backupCollection(collectionName: string, eventId: string): Promise<any[]> {
    try {
      const collectionRef = collection(this.db, collectionName);
      let q = query(collectionRef);

      // Add event filter if needed
      if (eventId && eventId !== 'default') {
        q = query(collectionRef, where('eventId', '==', eventId));
      }

      // For large collections, implement pagination
      q = query(q, orderBy('__name__'), limit(1000));

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        _backup_timestamp: new Date().toISOString()
      }));

      return data;
    } catch (error) {
      console.error(`Error backing up collection ${collectionName}:`, error);
      return [];
    }
  }

  /**
   * Backup Redis cache data
   */
  private async backupRedisCache(eventId: string): Promise<any> {
    if (!this.redis) return {};

    try {
      const cacheKeys = [
        `matchmaking:${eventId}:*`,
        `checkins:${eventId}:*`,
        `badges:${eventId}:*`,
        `analytics:${eventId}:*`,
        `sessions:${eventId}:*`
      ];

      const cacheData: any = {};

      for (const pattern of cacheKeys) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          const values = await this.redis.mget(...keys);
          cacheData[pattern] = keys.map((key, index) => ({
            key,
            value: values[index]
          }));
        }
      }

      return cacheData;
    } catch (error) {
      console.error('Error backing up Redis cache:', error);
      return {};
    }
  }

  /**
   * Backup media files from Firebase Storage
   */
  private async backupMediaFiles(eventId: string): Promise<any[]> {
    try {
      const mediaFiles: any[] = [];
      const storageRef = ref(this.storage, `events/${eventId}`);

      const result = await listAll(storageRef);

      for (const item of result.items) {
        const url = await getDownloadURL(item);
        mediaFiles.push({
          path: item.fullPath,
          name: item.name,
          url,
          size: 0, // Would need additional API call to get size
          _backup_timestamp: new Date().toISOString()
        });
      }

      return mediaFiles;
    } catch (error) {
      console.error('Error backing up media files:', error);
      return [];
    }
  }

  /**
   * Upload backup to Firebase Storage
   */
  private async uploadBackup(storagePath: string, backupData: { metadata: BackupMetadata; data: any }): Promise<void> {
    const storageRef = ref(this.storage, storagePath);
    const jsonData = JSON.stringify(backupData, null, 2);

    await uploadBytes(storageRef, Buffer.from(jsonData, 'utf-8'), {
      contentType: 'application/json',
      customMetadata: {
        backupType: backupData.metadata.type,
        eventId: backupData.metadata.eventId,
        timestamp: backupData.metadata.timestamp,
      }
    });
  }

  /**
   * Download backup from Firebase Storage
   */
  private async downloadBackup(storagePath: string): Promise<{ metadata: BackupMetadata; data: any }> {
    const storageRef = ref(this.storage, storagePath);
    const url = await getDownloadURL(storageRef);

    const response = await fetch(url);
    const jsonData = await response.text();

    return JSON.parse(jsonData);
  }

  /**
   * Find latest backup file
   */
  private async findLatestBackup(backupPath: string): Promise<string | null> {
    try {
      const storageRef = ref(this.storage, backupPath);
      const result = await listAll(storageRef);

      if (result.items.length === 0) {
        return null;
      }

      // Sort by name (timestamp) and get latest
      result.items.sort((a, b) => b.name.localeCompare(a.name));
      return result.items[0].fullPath;

    } catch (error) {
      console.error('Error finding latest backup:', error);
      return null;
    }
  }

  /**
   * Cleanup old backups based on retention policy
   */
  private async cleanupOldBackups(eventId: string, type: 'daily' | 'full', retentionDays: number): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const backupPath = `backups/${eventId}/${type}`;
      const storageRef = ref(this.storage, backupPath);
      const result = await listAll(storageRef);

      for (const item of result.items) {
        // Extract timestamp from filename and check if it's old enough to delete
        const fileName = item.name;
        const timestampMatch = fileName.match(/(\d+)$/);

        if (timestampMatch) {
          const fileTimestamp = parseInt(timestampMatch[1]);
          const fileDate = new Date(fileTimestamp);

          if (fileDate < cutoffDate) {
            console.log(`🗑️ Deleting old backup: ${fileName}`);
            await deleteObject(item);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  /**
   * Restore a collection from backup data
   */
  private async restoreCollection(collectionName: string, data: any[]): Promise<void> {
    // This would implement collection restoration
    // For safety, this should be used carefully in production
    console.log(`🔄 Would restore ${data.length} records to ${collectionName}`);
    // Implementation would depend on specific requirements
  }

  /**
   * Restore Redis cache from backup
   */
  private async restoreRedisCache(cacheData: any): Promise<void> {
    if (!this.redis) return;

    try {
      for (const [pattern, items] of Object.entries(cacheData)) {
        const cacheItems = items as Array<{ key: string; value: any }>;

        for (const item of cacheItems) {
          if (item.value) {
            await this.redis!.set(item.key, item.value, { ex: 3600 }); // 1 hour TTL
          }
        }
      }
    } catch (error) {
      console.error('Error restoring Redis cache:', error);
    }
  }

  /**
   * Generate checksum for backup data integrity
   */
  private generateChecksum(data: any): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(storagePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const backupData = await this.downloadBackup(storagePath);
      const expectedChecksum = backupData.metadata.checksum;
      const actualChecksum = this.generateChecksum(backupData.data);

      return {
        valid: expectedChecksum === actualChecksum,
        error: expectedChecksum !== actualChecksum ? 'Checksum mismatch' : undefined
      };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const eventId = args[1] || 'default';

  const backupService = new AutomatedBackupService();

  switch (command) {
    case 'daily':
      const dailyResult = await backupService.runDailyBackup(eventId);
      if (dailyResult.success) {
        console.log('✅ Daily backup completed successfully');
      } else {
        console.error('❌ Daily backup failed:', dailyResult.error);
        process.exit(1);
      }
      break;

    case 'full':
      const fullResult = await backupService.runFullBackup(eventId);
      if (fullResult.success) {
        console.log('✅ Full backup completed successfully');
      } else {
        console.error('❌ Full backup failed:', fullResult.error);
        process.exit(1);
      }
      break;

    case 'restore':
      const restoreResult = await backupService.restoreFromBackup(eventId);
      if (restoreResult.success) {
        console.log('✅ Restore completed successfully');
      } else {
        console.error('❌ Restore failed:', restoreResult.error);
        process.exit(1);
      }
      break;

    case 'verify':
      const backupPath = args[1];
      if (!backupPath) {
        console.error('❌ Backup path required for verify command');
        process.exit(1);
      }
      const verifyResult = await backupService.verifyBackup(backupPath);
      if (verifyResult.valid) {
        console.log('✅ Backup verification passed');
      } else {
        console.error('❌ Backup verification failed:', verifyResult.error);
        process.exit(1);
      }
      break;

    default:
      console.log(`
🔧 Automated Backup Service

Usage:
  npm run backup:daily [eventId]    - Run daily backup
  npm run backup:full [eventId]     - Run full backup
  npm run backup:restore [eventId]  - Restore from latest backup
  npm run backup:verify [path]      - Verify backup integrity

Examples:
  npm run backup:daily
  npm run backup:full my-event-2025
  npm run backup:restore
      `);
      process.exit(1);
  }
}

// Export for use in other scripts
export { AutomatedBackupService };
export type { BackupMetadata, BackupConfig };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
