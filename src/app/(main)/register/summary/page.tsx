"use client";
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faPrint, faArrowRight, faCheckCircle, faIdBadge } from '@fortawesome/free-solid-svg-icons';

import EnhancedBadgeGenerator from '../../../../components/EnhancedBadgeGenerator';
import { authService, UserProfile } from '../../../../utils/authService';
import { BadgeData, BadgeCategory, BadgeStatus } from '../../../../types/badge';

export default function RegistrationSummary() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const category = searchParams.get('category');

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [badge, setBadge] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setError('Email parameter is required');
      setLoading(false);
      return;
    }

    const initializeSummary = async () => {
      try {
        // Wait for auth state to be ready
        const checkAuthState = () => {
          const authState = authService.getAuthState();

          if (authState.profile && !authState.loading) {
            setUserProfile(authState.profile);

            // Find badge for this user
            // In a real implementation, you'd fetch the badge from the badge service
            // For now, we'll create a mock badge based on the profile
            if (authState.profile.badgeId) {
              // Fetch actual badge data
              // const badgeData = await enhancedBadgeService.getBadge(authState.profile.badgeId);
              // setBadge(badgeData);

              // Mock badge data for demonstration
              const mockBadge: BadgeData = {
                id: authState.profile.badgeId,
                userId: authState.profile.uid,
                eventId: 'default',
                name: authState.profile.fullName,
                role: authState.profile.position,
                company: authState.profile.company,
                category: authState.profile.category as BadgeCategory,
                email: authState.profile.email,
                qrCode: `https://event-platform.com/badge/${authState.profile.badgeId}`,
                template: 'modern',
                status: 'pending' as BadgeStatus,
                createdAt: new Date(),
                updatedAt: new Date(),
                photoUrl: authState.profile.logoUrl,
                createdBy: 'system'
              };
              setBadge(mockBadge);
            }

            setLoading(false);
          } else if (!authState.loading) {
            setError('User profile not found. Please try registering again.');
            setLoading(false);
          } else {
            // Still loading, check again
            setTimeout(checkAuthState, 100);
          }
        };

        checkAuthState();
      } catch (err) {
        console.error('Error initializing summary:', err);
        setError('Failed to load registration summary');
        setLoading(false);
      }
    };

    initializeSummary();
  }, [email]);

  const handleContinueToDashboard = () => {
    if (userProfile) {
      const targetPath = authService.getRedirectPath(userProfile.category);
      router.push(targetPath);
    }
  };

  const handlePrintBadge = () => {
    if (badge) {
      window.print();
    }
  };

  const handleDownloadBadge = () => {
    if (badge) {
      // In a real implementation, you'd generate and download the badge PDF
      alert('Badge download functionality would be implemented here');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your badge...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button
            onClick={() => router.push('/register')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            hello
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 py-4">
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/QTM 2025 Logo-04.png"
              alt="QTM 2025 Logo"
              className="w-48 sm:w-56 lg:w-64 h-auto"
            />
          </div>
          <div className="text-white text-sm">
            Registration Complete
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Success Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faCheckCircle} className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Registration Successful!
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Welcome to Qatar Travel Mart 2025
            </p>
            <p className="text-gray-500">
              Your account has been created and your event badge is ready.
            </p>
          </motion.div>

          {/* Badge Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-6">
                <FontAwesomeIcon icon={faIdBadge} className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Your Event Badge</h2>
              </div>

              {badge && userProfile ? (
                <EnhancedBadgeGenerator
                  badge={badge}
                  attendee={{
                    id: userProfile.uid,
                    fullName: userProfile.fullName,
                    email: userProfile.email,
                    company: userProfile.company,
                    position: userProfile.position,
                    category: userProfile.category as BadgeCategory,
                    photoUrl: userProfile.logoUrl
                  }}
                  className="mx-auto"
                />
              ) : (
                <div className="text-center py-12">
                  <FontAwesomeIcon icon={faIdBadge} className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Badge data not available</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* User Information Summary */}
          {userProfile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-lg shadow-lg p-6 mb-8"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium">{userProfile.fullName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium">{userProfile.email}</span>
                </div>
                <div>
                  <span className="text-gray-600">Category:</span>
                  <span className="ml-2 font-medium">{userProfile.category}</span>
                </div>
                <div>
                  <span className="text-gray-600">Position:</span>
                  <span className="ml-2 font-medium">{userProfile.position}</span>
                </div>
                <div>
                  <span className="text-gray-600">Company:</span>
                  <span className="ml-2 font-medium">{userProfile.company || 'Not specified'}</span>
                </div>
                {badge && (
                  <div>
                    <span className="text-gray-600">Badge ID:</span>
                    <span className="ml-2 font-mono text-gray-900">{badge.id.substring(0, 16)}...</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            {badge && (
              <>
                <button
                  onClick={handlePrintBadge}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faPrint} className="w-5 h-5" />
                  Print Badge
                </button>

                <button
                  onClick={handleDownloadBadge}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faDownload} className="w-5 h-5" />
                  Download Badge
                </button>
              </>
            )}

            <button
              onClick={handleContinueToDashboard}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              Continue to Dashboard
              <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5" />
            </button>
          </motion.div>

          {/* Important Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6"
          >
            <h4 className="font-semibold text-blue-900 mb-2">Important Information</h4>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Please save or print your badge before proceeding to the dashboard</li>
              <li>• Your badge will be required for event check-in and access</li>
              <li>• Keep your login credentials safe for future access</li>
              <li>• You can always regenerate your badge from the dashboard if needed</li>
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 py-4 mt-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-white text-sm opacity-90">
            © 2025 Qatar Travel Mart. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
