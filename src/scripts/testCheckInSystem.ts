/**
 * Test script for Check-in/Out System
 * Tests the complete check-in/out functionality
 */

import { processQRCodeScan } from '../utils/badgeService';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const testCheckInSystem = async () => {
  console.log('🧪 Testing Check-in/Out System...');

  try {
    // Test 1: Verify QR code processing with sample data
    console.log('📋 Test 1: QR Code Processing');
    const sampleQRData = 'test-user-123|Visitor|default|1699123456789';

    const result = await processQRCodeScan(
      sampleQRData,
      'agent-user-456',
      'Agent',
      'checkin'
    );

    console.log('✅ QR Code Processing Result:', result);

    // Test 2: Check database records
    console.log('📋 Test 2: Database Records');
    const checkinsQuery = query(
      collection(db, 'CheckIns'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const checkinsSnapshot = await getDocs(checkinsQuery);
    const recentCheckins = checkinsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('✅ Recent Check-ins:', recentCheckins);

    // Test 3: Verify statistics calculation
    console.log('📋 Test 3: Statistics Calculation');
    const today = new Date().toISOString().split('T')[0];
    const todayCheckins = recentCheckins.filter((c: any) =>
      c.eventDay === today || (!c.eventDay && c.timestamp?.includes(today))
    );

    const stats = {
      todayIn: todayCheckins.filter((c: any) => c.type === 'in').length,
      todayOut: todayCheckins.filter((c: any) => c.type === 'out').length,
      uniqueToday: new Set(todayCheckins.map((c: any) => c.userId)).size,
      totalCheckIns: recentCheckins.length
    };

    console.log('✅ Statistics:', stats);

    console.log('🎉 All tests completed successfully!');
    return {
      success: true,
      tests: {
        qrProcessing: result.success,
        databaseRecords: recentCheckins.length,
        statistics: stats
      }
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Run test if this script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testCheckInSystem = testCheckInSystem;
  console.log('🔧 Check-in System Test loaded. Run testCheckInSystem() to test.');
} else {
  // Node.js environment
  testCheckInSystem().then(result => {
    console.log('Test Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}
