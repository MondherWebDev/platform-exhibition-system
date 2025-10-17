"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth } from "../../firebaseConfig";
import AuthSection from "../AuthSection";

export default function SignIn() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (isMounted) {
        setUser(u);
        // Don't auto-redirect from signin page - let users manually sign in
        // But allow programmatic redirects for administrators
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []); // Remove dependencies to prevent infinite re-renders

  // Show form regardless of auth state - let users manually sign in

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 py-1">
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/QTM 2025 Logo-04.png"
              alt="QTM 2025 Logo"
              className="w-32 sm:w-40 lg:w-48 h-auto"
            />
          </div>
          <div className="flex space-x-2 sm:space-x-3">
            <button
              onClick={() => router.push('/register')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded font-semibold transition-colors text-sm sm:text-base"
            >
              Register
            </button>
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded font-semibold transition-colors text-sm sm:text-base">
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Sign In Required</h1>
            <p className="text-gray-600 text-sm sm:text-base">Please sign in to access your dashboard</p>
          </div>
          <AuthSection initialEmail={email} />
        </div>
      </div>
    </div>
  );
}
