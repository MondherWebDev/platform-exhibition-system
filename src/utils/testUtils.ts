/**
 * Test Utilities for Event Platform
 * Additional helper functions for testing
 */

import { authService } from './authService';
import { createUserBadge, getUserBadge } from './badgeService';

/**
 * Generate mock user data for testing
 */
export const generateMockUser = (overrides: any = {}) => {
  const timestamp = Date.now();
  return {
    email: `testuser_${timestamp}_${Math.random().toString(36).substr(2, 9)}@example.com`,
    password: 'testPassword123!',
    fullName: 'Test User',
    position: 'Software Engineer',
    company: 'Test Company',
    category: 'Visitor',
    ...overrides
  };
};

/**
 * Create multiple test users
 */
export const createTestUsers = async (count: number, category?: string) => {
  const users = [];
  const categories = ['Visitor', 'Exhibitor', 'Organizer', 'Speaker', 'Media'];

  for (let i = 0; i < count; i++) {
    const userData = generateMockUser({
      category: category || categories[i % categories.length],
      fullName: `Test User ${i + 1}`,
      company: `Test Company ${i + 1}`
    });

    try {
      const result = await authService.signUp(
        userData.email,
        userData.password,
        userData,
        'test-passcode'
      );

      if (result.success) {
        // Get the current user after successful signup
        const currentUser = authService.getAuthState().user;
        if (currentUser) {
          // Create badge for user
          await createUserBadge(currentUser.uid, {
            name: userData.fullName,
            role: userData.position,
            company: userData.company,
            category: userData.category
          }, 'test-event-2025');

          users.push({ ...userData, uid: currentUser.uid });
        }
      }
    } catch (error) {
      console.error(`Error creating test user ${i + 1}:`, error);
    }
  }

  return users;
};

/**
 * Cleanup test users and badges
 */
export const cleanupTestUsers = async (userIds: string[]) => {
  for (const userId of userIds) {
    try {
      // This would typically delete the user and their badge
      console.log(`Cleaning up test user: ${userId}`);
    } catch (error) {
      console.error(`Error cleaning up user ${userId}:`, error);
    }
  }
};

/**
 * Wait for a specified time (useful for testing async operations)
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry an operation multiple times
 */
export const retry = async (fn: () => Promise<any>, maxAttempts: number = 3, delay: number = 1000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await wait(delay);
    }
  }
};

/**
 * Assert that a condition is true
 */
export const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
};

/**
 * Assert that two values are equal
 */
export const assertEqual = (actual: any, expected: any, message?: string) => {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, but got ${actual}`);
  }
};

/**
 * Performance measurement utility
 */
export const measurePerformance = async (fn: () => Promise<any>, label: string) => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`${label}: ${duration.toFixed(2)}ms`);
    return { result, duration };
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`${label} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};
