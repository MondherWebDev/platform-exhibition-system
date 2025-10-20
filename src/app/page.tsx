"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { SentryService } from "../utils/sentryConfig";

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Load current event and redirect if exists
  useEffect(() => {
    const loadCurrentEvent = async () => {
      try {
        SentryService.addBreadcrumb('Loading current event from home page', 'navigation', 'info');

        const globalSettings = await getDoc(doc(db, 'AppSettings', 'global'));
        if (globalSettings.exists()) {
          const data = globalSettings.data();
          if (data.eventId && data.eventId !== 'default') {
            SentryService.addBreadcrumb(`Redirecting to event: ${data.eventId}`, 'navigation', 'info');
            router.push(`/e/${data.eventId}`);
          } else {
            // If no active event, redirect to signin for admin access
            SentryService.addBreadcrumb('No active event found, redirecting to signin', 'navigation', 'info');
            router.push('/signin');
          }
        } else {
          // If no global settings, redirect to signin for admin access
          SentryService.addBreadcrumb('No global settings found, redirecting to signin', 'navigation', 'info');
          router.push('/signin');
        }
      } catch (error) {
        console.error('Error loading current event:', error);
        SentryService.reportUserError(
          error as Error,
          'Failed to load current event from home page',
          undefined,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
        setError('Failed to load application. Please try refreshing the page.');
      }
    };
    loadCurrentEvent();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <div className="text-white mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <div className="text-white">Loading...</div>
      </div>
    </div>
  );
}
