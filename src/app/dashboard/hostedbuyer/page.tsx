"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../firebaseConfig';
import { doc, getDoc, getDocs, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faCalendar,
  faMap,
  faUsers,
  faStar,
  faQrcode,
  faBell,
  faSignOutAlt,
  faCog,
  faIdBadge,
  faLightbulb,
  faBookmark,
  faClock,
  faBuilding,
  faMicrophone,
  faDownload,
  faShare,
  faHeart,
  faChevronRight,
  faFilter,
  faMapMarkedAlt,
  faComments,
  faCalendarPlus,
  faEye,
  faMessage,
  faHandshake,
  faTrophy,
  faChartLine,
  faGlobe
} from '@fortawesome/free-solid-svg-icons';
import ProfileEditor from '../../../components/ProfileEditor';
import EnhancedBadgeGenerator from '../../../components/EnhancedBadgeGenerator';
import GlassCard from '../../../components/GlassCard';
import AuthSection from '../../AuthSection';

export default function HostedBuyerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appName, setAppName] = useState<string>('EventPlatform');
  const [logoUrl, setLogoUrl] = useState<string>('/logo.svg');
  const [logoSize, setLogoSize] = useState<number>(32);
  const [currentEventId, setCurrentEventId] = useState<string>('default');
  const [eventData, setEventData] = useState<any>(null);
  const [exhibitors, setExhibitors] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [activeDay, setActiveDay] = useState<string>('');

  // Enhanced functionality state
  const [showFullAgenda, setShowFullAgenda] = useState(false);
  const [showFullExhibitors, setShowFullExhibitors] = useState(false);
  const [showSpeakers, setShowSpeakers] = useState(false);
  const [showAIMatches, setShowAIMatches] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showFloorplan, setShowFloorplan] = useState(false);
  const [bookmarkedSessions, setBookmarkedSessions] = useState<Set<string>>(new Set());
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [hostedBuyers, setHostedBuyers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');
  const [selectedExhibitor, setSelectedExhibitor] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [showChat, setShowChat] = useState(false);
  const [connectionRequests, setConnectionRequests] = useState<any[]>([]);
  const [floorplanView, setFloorplanView] = useState<string>('overview');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showBoothModal, setShowBoothModal] = useState(false);
  const [meetingRequests, setMeetingRequests] = useState<any[]>([]);
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [meetingNotes, setMeetingNotes] = useState<string>('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showConnectionRequests, setShowConnectionRequests] = useState(false);

  interface Session {
    id: string;
    title: string;
    day: string;
    start: string;
    end: string;
    room?: string;
    speakerIds?: string[];
    description?: string;
    category?: string;
  }
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, 'Users', u.uid));
        const data = snap.exists() ? snap.data() : null;
        setProfile(data);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Load global app settings
  useEffect(() => {
    async function loadBranding() {
      try {
        const sDoc = await getDoc(doc(db, 'AppSettings', 'global'));
        if (sDoc.exists()) {
          const s = sDoc.data() as any;
          if (s.appName) setAppName(s.appName);
          if (s.logoUrl) setLogoUrl(s.logoUrl);
          if (typeof s.logoSize === 'number') setLogoSize(s.logoSize);
          if (s.eventId) setCurrentEventId(s.eventId);
        }
      } catch (e) {
        console.warn('Failed to load global settings', e);
      }
    }
    loadBranding();
  }, []);

  // Load event data
  useEffect(() => {
    if (!currentEventId) return;

    const unsub = onSnapshot(doc(db, 'Events', currentEventId), (snap) => {
      if (snap.exists()) {
        setEventData(snap.data());
      }
    });

    return () => unsub();
  }, [currentEventId]);

  // Load exhibitors
  useEffect(() => {
    if (!currentEventId) return;

    const unsub = onSnapshot(
      collection(db, 'Events', currentEventId, 'Exhibitors'),
      (snap) => {
        setExhibitors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => unsub();
  }, [currentEventId]);

  // Load sessions
  useEffect(() => {
    if (!currentEventId) return;

    const unsub = onSnapshot(
      query(collection(db, 'Events', currentEventId, 'Sessions'), orderBy('day')),
      (snap) => {
        const sessionsData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Session[];

        // Sort by start time within each day
        const sortedSessions = sessionsData.sort((a, b) => {
          if (a.day !== b.day) {
            return a.day.localeCompare(b.day);
          }
          return a.start.localeCompare(b.start);
        });

        setSessions(sortedSessions);

        // Set active day
        const days = [...new Set(sortedSessions.map(s => s.day))].sort();
        if (days.length > 0 && !activeDay) {
          setActiveDay(days[0]);
        }
      }
    );

    return () => unsub();
  }, [currentEventId, activeDay]);

  // Load speakers
  useEffect(() => {
    if (!currentEventId) return;

    const unsub = onSnapshot(
      collection(db, 'Events', currentEventId, 'Speakers'),
      (snap) => {
        setSpeakers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => unsub();
  }, [currentEventId]);

  // Load connection requests for this hosted buyer
  useEffect(() => {
    if (!user) return;

    console.log('🔗 Setting up Firestore listener for connection requests...');

    const unsub = onSnapshot(
      query(
        collection(db, 'Connections'),
        where('toUserId', '==', user.uid),
        where('status', '==', 'pending')
      ),
      (snap) => {
        const requests = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        console.log('🔗 Connection requests loaded:', requests.length);
        setConnectionRequests(requests);
      }
    );

    return () => unsub();
  }, [user]);

  // Load notifications for this hosted buyer
  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up Firestore listener for notifications...');

    // Use simpler query without orderBy to avoid index requirement
    const unsub = onSnapshot(
      query(
        collection(db, 'Notifications'),
        where('userId', '==', user.uid),
        limit(50)
      ),
      (snap) => {
        const notifs = snap.docs.map(d => {
          const data = d.data();
          console.log('🔔 DEBUG: Raw notification from Firestore:', d.id, data);
          return { id: d.id, ...data };
        }) as any[];

        console.log('🔔 Notifications loaded:', notifs.length);

        // Debug: Show each notification's data structure
        notifs.forEach((notif, index) => {
          if (notif.type === 'connection_request') {
            console.log(`🔔 DEBUG: Connection request notification ${index + 1}:`, {
              id: notif.id,
              type: notif.type,
              data: notif.data,
              hasData: !!notif.data,
              dataKeys: notif.data ? Object.keys(notif.data) : 'no data field'
            });
          }
        });

        // Sort in memory instead of in query
        notifs.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        // Count unread notifications
        const unread = notifs.filter(n => !n.read).length;
        setUnreadNotifications(unread);
        setNotifications(notifs);
      }
    );

    return () => unsub();
  }, [user]);

  const sessionsByDay = React.useMemo(() => {
    const grouped: Record<string, any[]> = {};
    sessions.forEach(session => {
      if (!grouped[session.day]) grouped[session.day] = [];
      grouped[session.day].push(session);
    });
    return grouped;
  }, [sessions]);

  // Handle connection request responses (accept/decline)
  const handleConnectionResponse = async (notification: any, response: 'accepted' | 'declined') => {
    try {
      console.log('🚨 FUNCTION CALLED WITH NOTIFICATION:', notification);
      console.log('🚨 RESPONSE TYPE:', response);
      console.log('🚨 USER UID:', user?.uid);

      if (!user?.uid) {
        alert('❌ User not logged in. Please refresh and try again.');
        return;
      }

      // Extract data from notification - try multiple approaches
      let fromUserId = null;

      // Method 1: Try to get fromUserId from data field
      if (notification.data && notification.data.fromUserId) {
        fromUserId = notification.data.fromUserId;
        console.log('✅ Found fromUserId in notification.data:', fromUserId);
      }
      // Method 2: Try to get fromUserId directly from notification
      else if (notification.fromUserId) {
        fromUserId = notification.fromUserId;
        console.log('✅ Found fromUserId directly on notification:', fromUserId);
      }
      // Method 3: Try alternative field names
      else if (notification.senderId) {
        fromUserId = notification.senderId;
        console.log('✅ Found senderId as alternative:', fromUserId);
      }
      // Method 4: Try to extract from message or other fields
      else {
        console.log('❌ Could not find user ID in notification');
        console.log('Available fields:', Object.keys(notification));
        if (notification.data) {
          console.log('Data fields:', Object.keys(notification.data));
        }
        alert('❌ Could not process connection request. Missing sender information.');
        return;
      }

      if (!fromUserId) {
        alert('❌ Could not identify the sender. Please try again.');
        return;
      }

      console.log('🔍 Looking for connection with:', {
        fromUserId: fromUserId,
        toUserId: user.uid,
        status: 'pending'
      });

      // Find the connection document
      const connectionsRef = collection(db, 'Connections');
      const q = query(
        connectionsRef,
        where('fromUserId', '==', fromUserId),
        where('toUserId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(q);
      console.log('🔍 Query results:', querySnapshot.size, 'documents found');

      if (querySnapshot.empty) {
        console.log('❌ No pending connection found');
        alert('❌ Connection request not found or already processed.');
        return;
      }

      // Get the connection document
      const connectionDoc = querySnapshot.docs[0];
      const connectionId = connectionDoc.id;
      console.log('✅ Found connection document:', connectionId);

      // Update the connection status
      await updateDoc(doc(db, 'Connections', connectionId), {
        status: response,
        respondedAt: serverTimestamp()
      });
      console.log('✅ Updated connection status to:', response);

      // Send response notification to exhibitor
      await addDoc(collection(db, 'Notifications'), {
        userId: fromUserId,
        type: 'connection_response',
        title: 'Connection Request Response',
        message: `Your connection request to ${profile?.fullName || 'a hosted buyer'} has been ${response}.`,
        data: {
          response: response,
          hostedBuyerName: profile?.fullName || profile?.email,
          connectionId: connectionId
        },
        read: false,
        createdAt: serverTimestamp()
      });
      console.log('✅ Sent response notification to exhibitor');

      // Show success message
      alert(`✅ Connection request ${response}!\n\nThe exhibitor has been notified of your response.`);

      console.log(`✅ Connection request ${response} successfully`);

    } catch (error) {
      console.error('❌ Error processing connection response:', error);
      alert('❌ Failed to process connection response. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#181f2a] flex items-center justify-center">
        <div className="text-white/80">Loading your dashboard...</div>
      </div>
    );
  }

  if (!user || !profile) {
    // Show sign-in form when user is not authenticated
    return (
      <div className="min-h-screen w-full bg-[#0b1020] flex items-center justify-center">
        <div className="w-full max-w-md">
          <AuthSection />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#181f2a]">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#1c2331] to-[#232b3e] border-b border-[#0d6efd]/20 shadow-lg flex-shrink-0 h-14 sm:h-16">
        <div className="flex items-center gap-2 sm:gap-4">
          <img
            src={logoUrl}
            alt="Logo"
            className="object-contain flex-shrink-0 h-8 sm:h-10 w-auto"
            onError={(e) => {
              e.currentTarget.src = '/logo.svg';
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-white text-lg sm:text-xl font-bold tracking-tight">{appName}</span>
            <div className="w-1 h-4 sm:h-6 bg-[#0d6efd]/50 rounded-full hidden sm:block"></div>
            <span className="text-[#6c757d] text-xs sm:text-sm font-medium hidden lg:block">
              {profile?.fullName || user.email}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 text-[#6c757d] hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faBell} className="text-lg" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </button>
          <button
            onClick={async () => {
              await auth.signOut();
              window.location.href = 'http://localhost:3000/signin';
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center gap-1 sm:gap-2"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="text-xs" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-6 overflow-auto bg-[#0f1419]">
        <div className="w-full max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Welcome, {profile.fullName || 'Hosted Buyer'}!
            </h1>
            <p className="text-white/70">Your hosted buyer dashboard and connection management</p>
          </div>

          {/* Quick Actions - Hosted Buyer Focused */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div
              className="cursor-pointer"
              onClick={() => setShowConnectionRequests(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faHandshake} className="text-2xl text-blue-400 mb-2 group-hover:text-blue-300 transition-colors" />
                <h3 className="text-white font-semibold mb-1 group-hover:text-blue-300 transition-colors">Connection Requests</h3>
                <p className="text-white/70 text-sm">From exhibitors</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-blue-400">Click to manage →</span>
                </div>
              </GlassCard>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => setShowMeetingScheduler(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faCalendarPlus} className="text-2xl text-green-400 mb-2 group-hover:text-green-300 transition-colors" />
                <h3 className="text-white font-semibold mb-1 group-hover:text-green-300 transition-colors">Schedule Meetings</h3>
                <p className="text-white/70 text-sm">Book with exhibitors</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-green-400">Click to schedule →</span>
                </div>
              </GlassCard>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => setShowFullAgenda(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faCalendar} className="text-2xl text-purple-400 mb-2 group-hover:text-purple-300 transition-colors" />
                <h3 className="text-white font-semibold mb-1 group-hover:text-purple-300 transition-colors">Event Sessions</h3>
                <p className="text-white/70 text-sm">View all sessions</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-purple-400">Click to view →</span>
                </div>
              </GlassCard>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => setShowAIMatches(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faChartLine} className="text-2xl text-orange-400 mb-2 group-hover:text-orange-300 transition-colors" />
                <h3 className="text-white font-semibold mb-1 group-hover:text-orange-300 transition-colors">AI Matches</h3>
                <p className="text-white/70 text-sm">Smart connections</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-orange-400">Click to connect →</span>
                </div>
              </GlassCard>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Profile */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-blue-400" />
                My Profile
              </h2>
              <ProfileEditor />
            </GlassCard>

            {/* My Badge */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faIdBadge} className="text-orange-400" />
                My Badge
              </h2>
              <div className="flex justify-center">
                <EnhancedBadgeGenerator
                  attendee={{
                    id: user.uid,
                    fullName: profile.fullName || profile.email || 'User',
                    email: profile.email || '',
                    company: profile.company || '',
                    position: profile.position || 'Hosted Buyer',
                    category: profile.category || 'Hosted Buyer'
                  }}
                />
              </div>
            </GlassCard>
          </div>

          {/* VIP Benefits Section */}
          <GlassCard className="p-6 mt-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faTrophy} className="text-yellow-400" />
              VIP Benefits & Privileges
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-400/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faCalendar} className="text-yellow-400 text-sm" />
                  </div>
                  <h4 className="text-white font-semibold">Priority Scheduling</h4>
                </div>
                <p className="text-white/70 text-sm">Book meetings with top exhibitors first</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-400/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faUsers} className="text-blue-400 text-sm" />
                  </div>
                  <h4 className="text-white font-semibold">Exclusive Access</h4>
                </div>
                <p className="text-white/70 text-sm">VIP-only sessions and networking events</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-400/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faHandshake} className="text-green-400 text-sm" />
                  </div>
                  <h4 className="text-white font-semibold">Premium Support</h4>
                </div>
                <p className="text-white/70 text-sm">Dedicated concierge and priority assistance</p>
              </div>
            </div>
          </GlassCard>

          {/* Event Information */}
          {eventData && (
            <GlassCard className="p-6 mt-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faStar} className="text-yellow-400" />
                Event Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-white font-semibold mb-2">{eventData.name || 'Event'}</h3>
                  <p className="text-white/70 text-sm mb-2">
                    {eventData.startDate && eventData.startTime &&
                      `${eventData.startDate} at ${eventData.startTime}`
                    }
                    {eventData.location && ` • ${eventData.location}`}
                  </p>
                  {eventData.description && (
                    <p className="text-white/80 text-sm">{eventData.description}</p>
                  )}
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">VIP Quick Links</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowMeetingScheduler(true)}
                      className="block text-blue-400 hover:text-blue-300 text-sm"
                    >
                      📅 Schedule VIP Meetings
                    </button>
                    <button
                      onClick={() => setShowFullExhibitors(true)}
                      className="block text-blue-400 hover:text-blue-300 text-sm"
                    >
                      🏢 Browse Premium Exhibitors
                    </button>
                    <button
                      onClick={() => setShowFullAgenda(true)}
                      className="block text-blue-400 hover:text-blue-300 text-sm"
                    >
                      🎯 View VIP Sessions
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Meeting Requests */}
          <GlassCard className="p-6 mt-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faHandshake} className="text-blue-400" />
              Meeting Requests
            </h2>
            <div className="space-y-3">
              {meetingRequests.length > 0 ? (
                meetingRequests.slice(0, 3).map((request: any, index: number) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-semibold">{request.exhibitorName}</h4>
                        <p className="text-white/70 text-sm">{request.topic}</p>
                        <p className="text-white/60 text-xs">{request.requestedTime}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                          Accept
                        </button>
                        <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-white/70">
                  <FontAwesomeIcon icon={faHandshake} className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h4 className="text-white font-semibold mb-2">No Meeting Requests</h4>
                  <p className="text-sm">Exhibitors will send meeting requests here.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </main>

      {/* Meeting Scheduler Modal */}
      {showMeetingScheduler && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-4xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">📅 Schedule VIP Meetings</h3>
                <p className="text-white/60 text-sm">Book one-on-one meetings with premium exhibitors</p>
              </div>
              <button
                onClick={() => setShowMeetingScheduler(false)}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Available Exhibitors */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Available Exhibitors</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {exhibitors.map((exhibitor: any) => (
                    <div key={exhibitor.id} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        {exhibitor.logoUrl ? (
                          <img src={exhibitor.logoUrl} alt={exhibitor.name} className="w-10 h-10 object-contain rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                            <FontAwesomeIcon icon={faBuilding} className="text-white text-sm" />
                          </div>
                        )}
                        <div>
                          <h5 className="text-white font-semibold">{exhibitor.name}</h5>
                          <p className="text-white/70 text-sm">Booth {exhibitor.boothId || 'TBA'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedExhibitor(exhibitor);
                            setShowMeetingScheduler(false);
                            // Show time slot selection
                            alert(`📅 Schedule Meeting with ${exhibitor.name}\n\nAvailable time slots:\n• 10:00 AM - 10:30 AM\n• 11:00 AM - 11:30 AM\n• 2:00 PM - 2:30 PM\n• 3:00 PM - 3:30 PM\n• 4:00 PM - 4:30 PM\n\nPlease select your preferred time slot.`);
                          }}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105"
                        >
                          Schedule Meeting
                        </button>
                        <button
                          onClick={() => {
                            setSelectedExhibitor(exhibitor);
                            setShowChat(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                          title="Chat with exhibitor"
                        >
                          <FontAwesomeIcon icon={faComments} className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meeting Details */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Meeting Details</h4>

                {selectedExhibitor && (
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h5 className="text-white font-semibold mb-2">Selected Exhibitor</h5>
                    <div className="flex items-center gap-3">
                      {selectedExhibitor.logoUrl ? (
                        <img src={selectedExhibitor.logoUrl} alt={selectedExhibitor.name} className="w-12 h-12 object-contain rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                          <FontAwesomeIcon icon={faBuilding} className="text-white" />
                        </div>
                      )}
                      <div>
                        <p className="text-white font-semibold">{selectedExhibitor.name}</p>
                        <p className="text-white/70 text-sm">Booth {selectedExhibitor.boothId || 'TBA'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-white font-semibold mb-2">Available Time Slots</label>
                    <select
                      value={selectedTimeSlot}
                      onChange={(e) => setSelectedTimeSlot(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400 transition-colors"
                    >
                      <option value="">Select a time slot...</option>
                      <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                      <option value="11:00 AM - 11:30 AM">11:00 AM - 11:30 AM</option>
                      <option value="2:00 PM - 2:30 PM">2:00 PM - 2:30 PM</option>
                      <option value="3:00 PM - 3:30 PM">3:00 PM - 3:30 PM</option>
                      <option value="4:00 PM - 4:30 PM">4:00 PM - 4:30 PM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">Meeting Topic</label>
                    <input
                      type="text"
                      placeholder="What would you like to discuss?"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">Additional Notes</label>
                    <textarea
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      placeholder="Any specific requirements or questions..."
                      className="w-full h-24 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 transition-colors resize-none"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (selectedExhibitor && selectedTimeSlot) {
                        const newRequest = {
                          id: Date.now(),
                          exhibitorName: selectedExhibitor.name,
                          exhibitorId: selectedExhibitor.id,
                          topic: 'Meeting Request',
                          requestedTime: selectedTimeSlot,
                          notes: meetingNotes,
                          status: 'pending',
                          timestamp: new Date().toLocaleString()
                        };

                        setMeetingRequests(prev => [...prev, newRequest]);

                        alert(`✅ Meeting Request Sent!\n\n📅 Meeting with: ${selectedExhibitor.name}\n🕐 Time: ${selectedTimeSlot}\n📝 Notes: ${meetingNotes || 'No additional notes'}\n\nThe exhibitor will receive your request and confirm the meeting.`);

                        setShowMeetingScheduler(false);
                        setSelectedExhibitor(null);
                        setSelectedTimeSlot('');
                        setMeetingNotes('');
                      }
                    }}
                    disabled={!selectedExhibitor || !selectedTimeSlot}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Send Meeting Request
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-4xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">🔔 Notifications</h3>
                <p className="text-white/60 text-sm">Your connection requests and updates</p>
              </div>
              <button
                onClick={() => {
                  setShowNotifications(false);
                  // Mark all notifications as read
                  notifications.forEach(async (notification) => {
                    if (!notification.read) {
                      await updateDoc(doc(db, 'Notifications', notification.id), { read: true });
                    }
                  });
                }}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {notifications.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notifications.map((notification: any, index: number) => (
                    <div key={index} className={`bg-white/5 rounded-lg p-4 border transition-colors ${
                      notification.read ? 'border-white/10' : 'border-blue-400/30 bg-blue-500/5'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          notification.read ? 'bg-gray-500/20' : 'bg-blue-500/20'
                        }`}>
                          <FontAwesomeIcon icon={faBell} className={notification.read ? 'text-gray-400' : 'text-blue-400'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="text-white font-semibold">{notification.title}</h5>
                            {!notification.read && (
                              <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">New</span>
                            )}
                          </div>
                          <p className="text-white/80 text-sm mb-2">{notification.message}</p>
                          <div className="flex items-center gap-4 text-xs text-white/60">
                            <span>{notification.createdAt?.toDate?.()?.toLocaleString() || 'Unknown time'}</span>
                            {notification.type === 'connection_request' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleConnectionResponse(notification, 'accepted')}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleConnectionResponse(notification, 'declined')}
                                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-white/70">
                  <FontAwesomeIcon icon={faBell} className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h4 className="text-white font-semibold mb-2">No Notifications</h4>
                  <p className="text-sm">Connection requests and updates will appear here.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Connection Requests Modal */}
      {showConnectionRequests && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-4xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">🔗 Connection Requests</h3>
                <p className="text-white/60 text-sm">Manage your exhibitor connection requests</p>
              </div>
              <button
                onClick={() => setShowConnectionRequests(false)}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {connectionRequests.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {connectionRequests.map((request: any, index: number) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <FontAwesomeIcon icon={faHandshake} className="text-blue-400 text-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-white font-semibold mb-1">{request.fromUserName}</h5>
                          <p className="text-white/70 text-sm mb-2">{request.fromUserCompany}</p>
                          <p className="text-white/80 text-sm mb-3">{request.message}</p>
                          <div className="flex items-center gap-4 text-xs text-white/60 mb-3">
                            <span>{request.createdAt?.toDate?.()?.toLocaleString() || 'Unknown time'}</span>
                            <span className="bg-yellow-600 text-white px-2 py-1 rounded">Pending</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConnectionResponse(request, 'accepted')}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleConnectionResponse(request, 'declined')}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => {
                                // Start chat with exhibitor
                                setSelectedExhibitor({
                                  id: request.fromUserId,
                                  name: request.fromUserName,
                                  company: request.fromUserCompany
                                });
                                setShowConnectionRequests(false);
                                setShowChat(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                            >
                              Message
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-white/70">
                  <FontAwesomeIcon icon={faHandshake} className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h4 className="text-white font-semibold mb-2">No Connection Requests</h4>
                  <p className="text-sm">Exhibitors will send connection requests here.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
