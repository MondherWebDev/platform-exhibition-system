/**
 * Sentry Configuration for Exhibition B2B Platform
 * Provides comprehensive error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

// Sentry DSN from environment variables
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

// Initialize Sentry only if DSN is provided
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Error filtering
    beforeSend(event, hint) {
      // Filter out non-critical errors in production
      if (process.env.NODE_ENV === 'production') {
        // Don't report 4xx errors as they are client errors
        if (event.exception) {
          const error = hint?.originalException;
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as any).status;
            if (status >= 400 && status < 500) {
              return null;
            }
          }
        }
      }

      return event;
    },

    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA,

    // Enable debug mode in development
    debug: process.env.NODE_ENV === 'development',

    // Performance monitoring integrations
    integrations: [
      Sentry.httpContextIntegration(),
      Sentry.browserTracingIntegration(),
    ],

    // Transaction naming for better organization
    beforeSendTransaction(event) {
      // Customize transaction names based on route patterns
      if (event.transaction?.includes('/api/')) {
        event.tags = { ...event.tags, transactionType: 'api' };
      } else if (event.transaction?.includes('/dashboard/')) {
        event.tags = { ...event.tags, transactionType: 'dashboard' };
      } else if (event.transaction?.includes('/apps/')) {
        event.tags = { ...event.tags, transactionType: 'microapp' };
      }

      return event;
    },

    // Custom tags for better error categorization
    initialScope: {
      tags: {
        component: 'event-platform',
        version: process.env.npm_package_version || '1.0.0',
      },
    },
  });

  console.log('✅ Sentry monitoring initialized');
} else {
  console.warn('⚠️ Sentry DSN not provided - error monitoring disabled');
}

// Export Sentry for use in other parts of the application
export { Sentry };

// Utility functions for manual error reporting
export class SentryService {
  /**
   * Report user action errors with context
   */
  static reportUserError(error: Error, action: string, userId?: string, extraContext?: any) {
    if (!SENTRY_DSN) return;

    Sentry.withScope((scope) => {
      scope.setTag('errorType', 'user_action');
      scope.setTag('action', action);

      if (userId) {
        scope.setUser({ id: userId });
      }

      if (extraContext) {
        scope.setContext('extra', extraContext);
      }

      Sentry.captureException(error);
    });
  }

  /**
   * Report performance issues
   */
  static reportPerformanceIssue(
    name: string,
    duration: number,
    description?: string,
    extraData?: any
  ) {
    if (!SENTRY_DSN) return;

    Sentry.withScope((scope) => {
      scope.setTag('performance', 'slow_operation');
      scope.setContext('performance_data', {
        name,
        duration,
        description,
        ...extraData,
      });

      Sentry.captureMessage(`Slow operation: ${name}`, 'warning');
    });
  }

  /**
   * Report business logic errors
   */
  static reportBusinessError(
    message: string,
    context: string,
    severity: 'low' | 'medium' | 'high' = 'medium',
    extraData?: any
  ) {
    if (!SENTRY_DSN) return;

    Sentry.withScope((scope) => {
      scope.setTag('errorType', 'business_logic');
      scope.setTag('severity', severity);
      scope.setTag('context', context);

      if (extraData) {
        scope.setContext('business_data', extraData);
      }

      Sentry.captureMessage(message, severity === 'high' ? 'error' : 'warning');
    });
  }

  /**
   * Set user context for better error tracking
   */
  static setUserContext(user: { id: string; email?: string; role?: string }) {
    if (!SENTRY_DSN) return;

    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }

  /**
   * Clear user context (on logout)
   */
  static clearUserContext() {
    if (!SENTRY_DSN) return;

    Sentry.getGlobalScope().clear();
    Sentry.getGlobalScope().setTag('component', 'event-platform');
  }

  /**
   * Add breadcrumb for debugging
   */
  static addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: any) {
    if (!SENTRY_DSN) return;

    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Monitor API call performance
   */
  static async monitorApiCall<T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    method: string = 'GET'
  ): Promise<T> {
    const startTime = Date.now();

    try {
      SentryService.addBreadcrumb(`API call started: ${method} ${endpoint}`, 'http', 'info');

      const result = await apiCall();

      const duration = Date.now() - startTime;
      if (duration > 5000) { // Log slow API calls (>5s)
        SentryService.reportPerformanceIssue(
          `Slow API call: ${method} ${endpoint}`,
          duration,
          'API call exceeded 5 second threshold'
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      SentryService.reportUserError(
        error as Error,
        `API call failed: ${method} ${endpoint}`,
        undefined,
        {
          endpoint,
          method,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );

      throw error;
    }
  }

  /**
   * Monitor Firebase operations
   */
  static async monitorFirebaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    collection?: string
  ): Promise<T> {
    const startTime = Date.now();

    try {
      SentryService.addBreadcrumb(
        `Firebase operation started: ${operationName}`,
        'database',
        'info',
        { collection }
      );

      const result = await operation();

      const duration = Date.now() - startTime;
      if (duration > 3000) { // Log slow Firebase operations (>3s)
        SentryService.reportPerformanceIssue(
          `Slow Firebase operation: ${operationName}`,
          duration,
          'Firebase operation exceeded 3 second threshold',
          { collection }
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      SentryService.reportUserError(
        error as Error,
        `Firebase operation failed: ${operationName}`,
        undefined,
        {
          operation: operationName,
          collection,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );

      throw error;
    }
  }

  /**
   * Monitor Redis cache operations
   */
  static async monitorCacheOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    cacheKey?: string
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();

      const duration = Date.now() - startTime;
      if (duration > 1000) { // Log slow cache operations (>1s)
        SentryService.reportPerformanceIssue(
          `Slow cache operation: ${operationName}`,
          duration,
          'Cache operation exceeded 1 second threshold',
          { cacheKey }
        );
      }

      return result;
    } catch (error) {
      SentryService.reportUserError(
        error as Error,
        `Cache operation failed: ${operationName}`,
        undefined,
        {
          operation: operationName,
          cacheKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );

      throw error;
    }
  }
}

// Export Sentry configuration for Next.js
export const sentryConfig = {
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN,
};
