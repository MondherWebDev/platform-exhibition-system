"use client";
import React, { useState, useEffect } from "react";
import { db, auth } from "../../../../firebaseConfig";
import { collection, getDocs, doc, updateDoc, setDoc, getDoc, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import QRCodeScanner from "../../../../components/QRCodeScanner";
import ClientOnly from '../../../../components/ClientOnly';

// Simple Icon component using text symbols
const Icon = ({ name, className = "w-4 h-4" }: { name: string; className?: string }) => {
  const iconMap: { [key: string]: string } = {
    handshake: "🤝",
    spinner: "⟳",
    exclamationTriangle: "⚠️",
    checkCircle: "✅",
    users: "👥",
    camera: "📷",
    edit: "✏️",
    save: "💾",
    user: "👤",
    building: "🏢",
    phone: "📞",
    globe: "🌐",
    mapPin: "📍",
    image: "🖼️",
    star: "⭐",
    trophy: "🏆",
    crown: "👑",
    timesCircle: "❌",
    eye: "👁️",
    refresh: "🔄",
    calendar: "📅",
    bell: "🔔",
    download: "⬇️",
    print: "🖨️",
    qrcode: "📱"
  };

  const icon = iconMap[name] || "•";
  return <span className={className}>{icon}</span>;
};

interface VisitorProfile {
  uid: string;
  fullName: string;
  company: string;
  category: string;
  badgeId?: string;
  eventId?: string;
  checkInStatus?: boolean;
  interests?: string | string[];
  linkedin?: string;
  twitter?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  position?: string;
  industry?: string;
  companySize?: string;
  bio?: string;
  logoUrl?: string;
  address?: string;
}

interface EventInfo {
  id: string;
  title: string;
  description?: string;
  startAt?: any;
  endAt?: any;
  venue?: string;
  address?: string;
  city?: string;
  country?: string;
}

interface CheckInRecord {
  id: string;
  uid: string;
  badgeId: string;
  timestamp: any;
  location?: string;
}

interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: any;
}

export default function VisitorPortal() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'badge' | 'schedule' | 'networking' | 'profile'>('dashboard');
  const [isClient, setIsClient] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState<VisitorProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentEventId, setCurrentEventId] = useState<string>('default');

  // Dashboard state
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [checkInHistory, setCheckInHistory] = useState<CheckInRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // Badge state
  const [badgeData, setBadgeData] = useState<any>(null);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    position: '',
    company: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    address: '',
    industry: '',
    companySize: '',
    bio: '',
    linkedin: '',
    twitter: '',
    interests: ''
  });

  useEffect(() => {
    setIsClient(true);

    // Load global settings and visitor info
    const loadInitialData = async () => {
      // Load global settings
      const sDoc = await getDoc(doc(db, 'AppSettings', 'global'));
      if (sDoc.exists()) {
        const s = sDoc.data() as any;
        if (s.eventId) {
          setCurrentEventId(s.eventId);
        }
      }

      // Load visitor info
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'Users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as VisitorProfile;
          setVisitorInfo(data);

          // Verify user is a visitor
          if (data.category !== 'Visitor') {
            window.location.href = '/apps';
            return;
          }

          // Initialize profile form with current data
          setProfileForm({
            fullName: data.fullName || '',
            position: data.position || '',
            company: data.company || '',
            contactEmail: data.contactEmail || '',
            contactPhone: data.contactPhone || '',
            website: data.website || '',
            address: data.address || '',
            industry: data.industry || '',
            companySize: data.companySize || '',
            bio: data.bio || '',
            linkedin: data.linkedin || '',
            twitter: data.twitter || '',
            interests: Array.isArray(data.interests) ? data.interests.join(', ') : ''
          });

          // Load additional data
          await loadEventInfo(data.eventId);
          await loadCheckInHistory(currentUser.uid);
          await loadNotifications(currentUser.uid);
          await loadBadgeData(data.badgeId);
          await checkCheckInStatus(currentUser.uid);
        }
      }
    };

    loadInitialData();
  }, []);

  const loadEventInfo = async (eventId?: string) => {
    if (!eventId || eventId === 'default') return;

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
        orderBy('timestamp', 'desc'),
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
        where('userId', '==', uid),
        orderBy('timestamp', 'desc'),
        limit(5)
      );

      const snapshot = await getDocs(q);
      const userNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationRecord[];

      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadBadgeData = async (badgeId?: string) => {
    if (!badgeId) return;

    try {
      const badgeDoc = await getDoc(doc(db, 'Badges', badgeId));
      if (badgeDoc.exists()) {
        setBadgeData(badgeDoc.data());
      }
    } catch (error) {
      console.error('Error loading badge data:', error);
    }
  };

  const checkCheckInStatus = async (uid: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const q = query(
        collection(db, 'CheckIns'),
        where('uid', '==', uid),
        where('timestamp', '>=', `${today}T00:00:00.000Z`),
        where('timestamp', '<=', `${today}T23:59:59.999Z`),
        limit(1)
      );

      const snapshot = await getDocs(q);
      setIsCheckedIn(!snapshot.empty);
    } catch (error) {
      console.error('Error checking check-in status:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!visitorInfo?.badgeId) {
      setError('Please generate your badge first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create check-in record
      await setDoc(doc(collection(db, 'CheckIns')), {
        uid: auth.currentUser?.uid,
        badgeId: visitorInfo.badgeId,
        timestamp: new Date().toISOString(),
        type: 'in',
        location: 'Main Entrance'
      });

      setSuccess('Successfully checked in!');
      setIsCheckedIn(true);

      // Reload check-in history
      if (auth.currentUser) {
        await loadCheckInHistory(auth.currentUser.uid);
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      setError(error.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadBadge = () => {
    if (!visitorInfo?.badgeId) return;

    // Generate badge as PDF or image
    const badgeUrl = `/api/badge/${visitorInfo.badgeId}`;
    window.open(badgeUrl, '_blank');
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) {
      setError('User not authenticated');
      return;
    }

    setProfileLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update user document in Firestore
      await updateDoc(doc(db, 'Users', auth.currentUser.uid), {
        ...profileForm,
        interests: profileForm.interests.split(',').map(i => i.trim()).filter(i => i),
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setVisitorInfo((prev: VisitorProfile | null) => prev ? { ...prev, ...profileForm } : null);
      setIsEditingProfile(false);
      setSuccess('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/signin';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (!visitorInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading visitor portal...</p>
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
                <p className="text-sm text-gray-500">Welcome, {visitorInfo.fullName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                ✅ Verified Visitor
              </span>
              <button
                onClick={handleLogout}
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
              { id: 'dashboard', label: 'Dashboard', icon: 'users' },
              { id: 'badge', label: 'E-Badge', icon: 'qrcode' },
              { id: 'schedule', label: 'Schedule', icon: 'calendar' },
              { id: 'networking', label: 'Networking', icon: 'users' },
              { id: 'profile', label: 'Profile', icon: 'user' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  currentView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon name={tab.icon} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Welcome Card */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Welcome to {eventInfo?.title || 'Qatar Travel Mart 2025'}!
                </h2>
                <p className="text-gray-600 mb-4">
                  {eventInfo?.description || 'Connect with industry leaders, discover innovative solutions, and expand your professional network.'}
                </p>
                {eventInfo && (
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Icon name="calendar" />
                      <span>
                        {eventInfo.startAt ?
                          formatDate(eventInfo.startAt) + ' - ' + formatDate(eventInfo.endAt) :
                          'Event dates TBA'
                        }
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Icon name="mapPin" />
                      <span>{eventInfo.venue || 'Venue TBA'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setCurrentView('badge')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center space-y-2"
                  >
                    <Icon name="qrcode" className="text-2xl text-blue-600" />
                    <span className="font-medium">View E-Badge</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('schedule')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center space-y-2"
                  >
                    <Icon name="calendar" className="text-2xl text-green-600" />
                    <span className="font-medium">Event Schedule</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('networking')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center space-y-2"
                  >
                    <Icon name="users" className="text-2xl text-purple-600" />
                    <span className="font-medium">Find Contacts</span>
                  </button>
                  <button
                    onClick={handleCheckIn}
                    disabled={isCheckedIn || loading}
                    className={`p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center space-y-2 ${
                      isCheckedIn ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Icon name="mapPin" className="text-2xl text-orange-600" />
                    <span className="font-medium">
                      {loading ? 'Checking In...' : isCheckedIn ? 'Checked In' : 'Check In'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Check-in Status */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Check-in Status</h3>
                {isCheckedIn ? (
                  <div className="text-center">
                    <div className="text-green-600 text-3xl mb-2">✅</div>
                    <p className="text-green-800 font-medium">Checked In</p>
                    <p className="text-sm text-gray-500">Today at {formatTime(new Date())}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-gray-400 text-3xl mb-2">⏳</div>
                    <p className="text-gray-600 font-medium">Not Checked In</p>
                    <button
                      onClick={handleCheckIn}
                      disabled={loading}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Checking In...' : 'Check In Now'}
                    </button>
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
                            {formatDate(checkin.timestamp)}
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
                  <Icon name="bell" />
                  <span className="ml-2">Notifications</span>
                </h3>
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.slice(0, 3).map((notification) => (
                      <div key={notification.id} className="text-sm">
                        <p className="text-gray-900">{notification.title}</p>
                        <p className="text-gray-500 text-xs">
                          {formatDate(notification.timestamp)}
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

        {currentView === 'badge' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your E-Badge</h2>

              {visitorInfo.badgeId ? (
                <div className="space-y-6">
                  {/* QR Code Display */}
                  <div className="bg-gray-50 p-8 rounded-lg inline-block">
                    <div className="w-48 h-48 bg-white border-2 border-gray-300 flex items-center justify-center">
                      <span className="text-gray-500">QR Code Placeholder</span>
                    </div>
                  </div>

                  {/* Badge Information */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{visitorInfo.fullName}</h3>
                    <p className="text-gray-600">{visitorInfo.company}</p>
                    <p className="text-sm text-gray-500">Badge ID: {visitorInfo.badgeId}</p>
                    <p className="text-sm text-gray-500">Visitor</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-4 justify-center">
                    <button
                      onClick={downloadBadge}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <Icon name="download" />
                      <span>Download Badge</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Icon name="print" />
                      <span>Print Badge</span>
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

        {currentView === 'schedule' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Schedule</h2>
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📅</div>
              <p className="text-gray-600">Schedule feature coming soon</p>
              <p className="text-sm text-gray-500 mt-2">Check back later for session schedules and agendas</p>
            </div>
          </div>
        )}

        {currentView === 'networking' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Networking Hub</h2>
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">🤝</div>
              <p className="text-gray-600">Networking features coming soon</p>
              <p className="text-sm text-gray-500 mt-2">Connect with exhibitors and other attendees</p>
            </div>
          </div>
        )}

        {currentView === 'profile' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Visitor Profile</h2>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isEditingProfile
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Icon name={isEditingProfile ? 'save' : 'edit'} className="w-4 h-4 mr-2" />
                {isEditingProfile ? 'Save Profile' : 'Edit Profile'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {visitorInfo.logoUrl ? (
                      <img
                        src={visitorInfo.logoUrl}
                        alt="Profile"
                        className="w-20 h-20 object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                        <Icon name="user" className="w-10 h-10 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800">
                      {visitorInfo.fullName}
                    </h3>
                    <p className="text-gray-600">{visitorInfo.company}</p>
                    <p className="text-gray-600">{visitorInfo.position}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Full Name</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-800">{visitorInfo.fullName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Position</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileForm.position}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, position: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-800">{visitorInfo.position || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Company</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileForm.company}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, company: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800">{visitorInfo.company || 'Not provided'}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Email</label>
                    {isEditingProfile ? (
                      <input
                        type="email"
                        value={profileForm.contactEmail}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-800">{visitorInfo.contactEmail || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Phone</label>
                    {isEditingProfile ? (
                      <input
                        type="tel"
                        value={profileForm.contactPhone}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-800">{visitorInfo.contactPhone || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Website</label>
                  {isEditingProfile ? (
                    <input
                      type="url"
                      value={profileForm.website}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800">{visitorInfo.website ? (
                      <a href={visitorInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        {visitorInfo.website}
                      </a>
                    ) : 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Industry</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileForm.industry}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800">{visitorInfo.industry || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Company Size</label>
                  {isEditingProfile ? (
                    <select
                      value={profileForm.companySize}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, companySize: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  ) : (
                    <p className="text-gray-800">{visitorInfo.companySize || 'Not provided'}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-gray-700 font-medium mb-2">Bio</label>
                {isEditingProfile ? (
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                ) : (
                  <p className="text-gray-800">{visitorInfo.bio || 'No bio provided'}</p>
                )}
              </div>

              <div className="mt-6">
                <label className="block text-gray-700 font-medium mb-2">Interests</label>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={profileForm.interests}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, interests: e.target.value }))}
                    placeholder="e.g. Technology, Travel, Business"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-800">
                    {Array.isArray(visitorInfo.interests) && visitorInfo.interests.length > 0
                      ? visitorInfo.interests.join(', ')
                      : 'No interests specified'
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Save/Cancel buttons for editing */}
            {isEditingProfile && (
              <div className="mt-6 pt-6 border-t flex gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={profileLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="save" className="w-5 h-5" />
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingProfile(false);
                    // Reset form to current visitor info
                    if (visitorInfo) {
                      setProfileForm({
                        fullName: visitorInfo.fullName || '',
                        position: visitorInfo.position || '',
                        company: visitorInfo.company || '',
                        contactEmail: visitorInfo.contactEmail || '',
                        contactPhone: visitorInfo.contactPhone || '',
                        website: visitorInfo.website || '',
                        address: visitorInfo.address || '',
                        industry: visitorInfo.industry || '',
                        companySize: visitorInfo.companySize || '',
                        bio: visitorInfo.bio || '',
                        linkedin: visitorInfo.linkedin || '',
                        twitter: visitorInfo.twitter || '',
                        interests: Array.isArray(visitorInfo.interests) ? visitorInfo.interests.join(', ') : ''
                      });
                    }
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Success/Error Messages */}
            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-lg flex items-center gap-2">
                <Icon name="exclamationTriangle" className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mt-4 bg-green-500/10 border border-green-500/20 text-green-600 p-4 rounded-lg flex items-center gap-2">
                <Icon name="checkCircle" className="w-5 h-5" />
                <span>{success}</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
