"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function Home() {
  const router = useRouter();

  // Load current event and redirect if exists
  useEffect(() => {
    const loadCurrentEvent = async () => {
      try {
        const globalSettings = await getDoc(doc(db, 'AppSettings', 'global'));
        if (globalSettings.exists()) {
          const data = globalSettings.data();
          if (data.eventId && data.eventId !== 'default') {
            router.push(`/e/${data.eventId}`);
          } else {
            // If no active event, redirect to signin for admin access
            router.push('/signin');
          }
        } else {
          // If no global settings, redirect to signin for admin access
          router.push('/signin');
        }
      } catch (error) {
        console.error('Error loading current event:', error);
        router.push('/signin');
      }
    };
    loadCurrentEvent();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <div className="text-white">Loading...</div>
      </div>
    </div>
  );
}
