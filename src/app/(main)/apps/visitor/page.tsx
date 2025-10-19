"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode, faCalendar, faMapMarkerAlt, faUsers, faBell, faDownload } from '@fortawesome/free-solid-svg-icons';

interface UserProfile {
  uid: string;
  fullName: string;
  company: string;
  category: string;
  badgeId?: string;
  eventId?: string;
  checkInStatus?: boolean;
  interests?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
}

interface EventInfo {
  id: string;
  name: string;
  date: string;
  venue: string;
  description?: string;
}

interface CheckInRecord {
  id: string;
  uid: string;
  badgeId: string;
  at: any;
  location?: string;
}

export default function VisitorPortal() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'badge' | 'schedule' | 'networking'>('dashboard');
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [checkInHistory, setCheckInHistory] = useState<CheckInRecord[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Get user profile
        const userDoc = await getDoc(doc(db, 'Users', u.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          setUserProfile(profile);

          // Verify user is a visitor
          if (profile.category !== 'Visitor') {
            router.push('/apps');
            return;
          }

          // Load additional data
          await loadEventInfo(profile.eventId);
          await loadCheckInHistory(u.uid);
          await loadNotifications(u.uid);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const loadEventInfo = async (eventId?: string) => {
    if (!eventId) return;

    try {
      const eventDoc = await getDoc(doc(db, 'Events', eventId));
      if (eventDoc.exists()) {
        setEventInfo({
          id: eventDoc.id,
          ...eventDoc.data()
        } as EventInfo);
      }
    } catch (error) {
      console.error('Error loading event info:', error);
    }
  };

  const loadCheckInHistory = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'CheckIns'),
        where('uid', '==', uid),
        orderBy('at', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CheckInRecord[];

      setCheckInHistory(history);
    } catch (error) {
      console.error('Error loading check-in history:', error);
    }
  };

  const loadNotifications = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'Notifications'),
        where('recipientUid', '==', uid),
        orderBy('timestamp', 'desc'),
        limit(5)
      );

      const snapshot = await getDocs(q);
      const userNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!userProfile?.badgeId) {
      alert('Please generate your badge first');
      return;
    }

    try {
      // This would integrate with the check-in system
      alert('Check-in functionality would be implemented here');
    } catch (error) {
      console.error('Check-in error:', error);
    }
  };

  const downloadBadge = () => {
    if (!userProfile?.badgeId) return;

    // Generate badge as PDF or image
    const badgeUrl = `/api/badge/${userProfile.badgeId}`;
    window.open(badgeUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading visitor portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/?signin=true');
    return null;
  }

  if (!userProfile || userProfile.category !== 'Visitor') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">This portal is only for visitors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="text-2xl">🎫</div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Visitor Portal</h1>
                <p className="text-sm text-gray-500">Welcome, {userProfile.fullName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                ✅ Verified Visitor
              </span>
              <button
                onClick={() => auth.signOut()}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: faUsers },
              { id: 'badge', label: 'E-Badge', icon: faQrcode },
              { id: 'schedule', label: 'Schedule', icon: faCalendar },
              { id: 'networking', label: 'Networking', icon: faUsers },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Welcome Card */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Welcome to {eventInfo?.name || 'Qatar Tech Expo 2025'}!
                </h2>
                <p className="text-gray-600 mb-4">
                  {eventInfo?.description || 'Connect with industry leaders, discover innovative solutions, and expand your professional network.'}
                </p>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <FontAwesomeIcon icon={faCalendar} />
                    <span>{eventInfo?.date || 'March 15-17, 2025'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} />
                    <span>{eventInfo?.venue || 'Doha Exhibition Center'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setActiveTab('badge')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center space-y-2"
                  >
                    <FontAwesomeIcon icon={faQrcode} className="text-2xl text-blue-600" />
                    <span className="font-medium">View E-Badge</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center space-y-2"
                  >
                    <FontAwesomeIcon icon={faCalendar} className="text-2xl text-green-600" />
                    <span className="font-medium">Event Schedule</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('networking')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center space-y-2"
                  >
                    <FontAwesomeIcon icon={faUsers} className="text-2xl text-purple-600" />
                    <span className="font-medium">Find Contacts</span>
                  </button>

                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Check-in Status */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Check-in Status</h3>
                {checkInHistory.length > 0 ? (
                  <div className="text-center">
                    <div className="text-green-600 text-3xl mb-2">✅</div>
                    <p className="text-green-800 font-medium">Checked In</p>
                    <p className="text-sm text-gray-500">
                      Last check-in: {checkInHistory[0]?.at?.toDate ?
                        checkInHistory[0].at.toDate().toLocaleDateString() : 'Today'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Checked in by agent at gate
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-gray-400 text-3xl mb-2">⏳</div>
                    <p className="text-gray-600 font-medium">Not Checked In</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Please visit the registration desk to get checked in
                    </p>
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {checkInHistory.length > 0 ? (
                  <div className="space-y-3">
                    {checkInHistory.slice(0, 3).map((checkin) => (
                      <div key={checkin.id} className="flex items-center space-x-3 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="text-gray-900">Checked in</p>
                          <p className="text-gray-500">
                            {checkin.at?.toDate ? checkin.at.toDate().toLocaleDateString() : 'Today'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No recent activity</p>
                )}
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faBell} className="mr-2" />
                  Notifications
                </h3>
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.slice(0, 3).map((notification) => (
                      <div key={notification.id} className="text-sm">
                        <p className="text-gray-900">{notification.title}</p>
                        <p className="text-gray-500 text-xs">
                          {notification.timestamp?.toDate ?
                            notification.timestamp.toDate().toLocaleDateString() : 'Today'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No new notifications</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'badge' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your E-Badge</h2>

              {userProfile.badgeId ? (
                <div className="space-y-6">
                  {/* QR Code Display */}
                  <div className="bg-gray-50 p-8 rounded-lg inline-block">
                    <QRCodeSVG
                      value={`https://event-platform.com/verify/${userProfile.badgeId}`}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  {/* Badge Information */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{userProfile.fullName}</h3>
                    <p className="text-gray-600">{userProfile.company}</p>
                    <p className="text-sm text-gray-500">Badge ID: {userProfile.badgeId}</p>
                    <p className="text-sm text-gray-500">Visitor</p>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>How to use:</strong> Show this QR code to agents at the entrance for check-in,
                        or to exhibitors when visiting their booths.
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-4 justify-center">
                    <button
                      onClick={downloadBadge}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      <span>Download Badge</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Print Badge
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">🎫</div>
                  <p className="text-gray-600 mb-4">No badge generated yet</p>
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Generate E-Badge
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Schedule</h2>
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📅</div>
              <p className="text-gray-600">Schedule feature coming soon</p>
              <p className="text-sm text-gray-500 mt-2">Check back later for session schedules and agendas</p>
            </div>
          </div>
        )}

        {activeTab === 'networking' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Networking Hub</h2>
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">🤝</div>
              <p className="text-gray-600">Networking features coming soon</p>
              <p className="text-sm text-gray-500 mt-2">Connect with exhibitors and other attendees</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
