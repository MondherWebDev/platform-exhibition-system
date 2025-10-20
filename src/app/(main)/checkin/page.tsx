"use client";
import React, { useState, useEffect } from "react";
import { db, auth } from "../../../firebaseConfig";
import AuthForm from "../../../components/AuthForm";
import QRCodeScanner from "../../../components/QRCodeScanner";
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc, setDoc, query, where, orderBy, limit, onSnapshot, addDoc, deleteDoc, increment } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { authService, UserProfile } from "../../../utils/authService";
import ClientOnly from '../../../components/ClientOnly';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQrcode,
  faCamera,
  faPlay,
  faStop,
  faUsers,
  faUserCheck,
  faUserTimes,
  faClock,
  faCalendar,
  faMapMarkerAlt,
  faChartBar,
  faFilter,
  faSearch,
  faDownload,
  faCog,
  faBars,
  faSignOutAlt,
  faBell,
  faInfoCircle,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faEye,
  faRefresh,
  faMobile,
  faTablet,
  faDesktop,
  faLightbulb,
  faCrown,
  faStar,
  faTrophy,
  faMedal,
  faAward,
  faHandshake,
  faBuilding,
  faPhone,
  faEnvelope,
  faGlobe,
  faIdBadge,
  faMagic,
  faBrain,
  faArrowRight,
  faArrowLeft,
  faPlus,
  faEdit,
  faTrash,
  faSort,
  faSortUp,
  faSortDown,
  faFilter as faFilterIcon,
  faSearch as faSearchIcon,
  faDownload as faDownloadIcon,
  faCog as faCogIcon,
  faBars as faBarsIcon,
  faSignOutAlt as faSignOutAltIcon,
  faBell as faBellIcon,
  faInfoCircle as faInfoCircleIcon,
  faQrcode as faQrcodeIcon,
  faCamera as faCameraIcon,
  faPlay as faPlayIcon,
  faStop as faStopIcon,
  faUsers as faUsersIcon,
  faUserCheck as faUserCheckIcon,
  faUserTimes as faUserTimesIcon,
  faClock as faClockIcon,
  faCalendar as faCalendarIcon,
  faMapMarkerAlt as faMapMarkerAltIcon,
  faChartBar as faChartBarIcon,
  faFilter as faFilterIconIcon,
  faSearch as faSearchIconIcon,
  faDownload as faDownloadIconIcon,
  faCog as faCogIconIcon,
  faBars as faBarsIconIcon,
  faSignOutAlt as faSignOutAltIconIcon,
  faBell as faBellIconIcon,
  faInfoCircle as faInfoCircleIconIcon,
  faCheckCircle as faCheckCircleIcon,
  faTimesCircle as faTimesCircleIcon,
  faSpinner as faSpinnerIcon,
  faEye as faEyeIcon,
  faRefresh as faRefreshIcon,
  faMobile as faMobileIcon,
  faTablet as faTabletIcon,
  faDesktop as faDesktopIcon,
  faLightbulb as faLightbulbIcon,
  faCrown as faCrownIcon,
  faStar as faStarIcon,
  faTrophy as faTrophyIcon,
  faMedal as faMedalIcon,
  faAward as faAwardIcon,
  faHandshake as faHandshakeIcon,
  faBuilding as faBuildingIcon,
  faPhone as faPhoneIcon,
  faEnvelope as faEnvelopeIcon,
  faGlobe as faGlobeIcon,
  faIdBadge as faIdBadgeIcon,
  faMagic as faMagicIcon,
  faBrain as faBrainIcon,
  faArrowRight as faArrowRightIcon,
  faArrowLeft as faArrowLeftIcon,
  faPlus as faPlusIcon,
  faEdit as faEditIcon,
  faTrash as faTrashIcon,
  faSort as faSortIcon,
  faSortUp as faSortUpIcon,
  faSortDown as faSortDownIcon
} from '@fortawesome/free-solid-svg-icons';

interface CheckInRecord {
  id: string;
  uid: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeeCategory: string;
  type: 'in' | 'out';
  timestamp: any;
  eventDay: string;
  eventId: string;
}

export default function AgentCheckinSystem() {
  const [user, setUser] = React.useState<any>(null);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [attendees, setAttendees] = React.useState<any[]>([]);
  const [recentCheckIns, setRecentCheckIns] = React.useState<any[]>([]);
  const [currentEventId, setCurrentEventId] = React.useState<string>('default');
  const [isClient, setIsClient] = React.useState(false);

  // Scanner state
  const [scannerResult, setScannerResult] = React.useState('');
  const [showScanner, setShowScanner] = React.useState(false);

  // Filter and search state
  const [checkinFilter, setCheckinFilter] = React.useState<{
    search: string;
    type: string;
    category: string;
    timeRange: string;
  }>({
    search: '',
    type: 'All',
    category: 'All',
    timeRange: 'today'
  });

  // Statistics
  const [eventStats, setEventStats] = React.useState({
    todayIn: 0,
    todayOut: 0,
    uniqueToday: 0,
    totalCheckIns: 0,
    averageSession: 0
  });

  // Manual refresh function
  const refreshCheckInData = React.useCallback(async () => {
    if (!currentEventId) return;

    try {
      console.log('🔄 Manual refresh triggered for event:', currentEventId);

      // Force refresh attendees data
      const attendeesSnap = await getDocs(collection(db, 'Users'));
      const attendeesData = attendeesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAttendees(attendeesData);

      // Force refresh check-ins data
      const checkinsSnap = await getDocs(query(collection(db, 'CheckIns'), limit(200)));
      const checkinData = checkinsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Filter for current event and sort by timestamp
      const eventCheckins = checkinData
        .filter((checkin: any) => checkin.eventId === currentEventId)
        .sort((a: any, b: any) => {
          const aTime = new Date(a.createdAt || a.timestamp || 0).getTime();
          const bTime = new Date(b.createdAt || b.timestamp || 0).getTime();
          return bTime - aTime;
        });

      console.log('✅ Manual refresh completed:', {
        attendees: attendeesData.length,
        checkins: checkinData.length,
        eventCheckins: eventCheckins.length
      });

      setRecentCheckIns(eventCheckins);
    } catch (error) {
      console.error('❌ Error during manual refresh:', error);
    }
  }, [currentEventId]);

  // Authentication check
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'Users', u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          // Allow agents and organizers to access check-in system
          if (data.category === 'Agent' || data.category === 'Organizer' || data.category === 'Admin') {
            setUserProfile(data);
          }
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load data
  React.useEffect(() => {
    if (!currentEventId) return;

    // Load all attendees for lookup
    const attendeesUnsub = onSnapshot(
      collection(db, 'Users'),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAttendees(data);
      }
    );

    return () => {
      attendeesUnsub();
    };
  }, [currentEventId]);

  // Load check-in data and statistics with enhanced real-time updates
  React.useEffect(() => {
    console.log('🔄 Setting up real-time check-in listener');

    // Load recent check-ins - using client-side sorting to avoid index issues
    const checkinsUnsub = onSnapshot(
      query(
        collection(db, 'CheckIns'),
        limit(200) // Increased limit for better real-time tracking
      ),
      (snap) => {
        console.log('📊 Received check-in snapshot with', snap.docs.length, 'records');

        // Process check-in data with enhanced error handling
        const checkinData = snap.docs.map((d) => {
          try {
            const rec = d.data() as any;

            // Enhanced timestamp handling with multiple fallbacks
            let timestamp = new Date().toLocaleString();
            let eventDay = new Date().toISOString().split('T')[0];

            try {
              if (rec.timestamp) {
                if (typeof rec.timestamp === 'string') {
                  timestamp = new Date(rec.timestamp).toLocaleString();
                  eventDay = new Date(rec.timestamp).toISOString().split('T')[0];
                } else if (rec.timestamp.toDate && typeof rec.timestamp.toDate === 'function') {
                  timestamp = rec.timestamp.toDate().toLocaleString();
                  eventDay = rec.timestamp.toDate().toISOString().split('T')[0];
                }
              } else if (rec.at && rec.at.toDate && typeof rec.at.toDate === 'function') {
                timestamp = rec.at.toDate().toLocaleString();
                eventDay = rec.at.toDate().toISOString().split('T')[0];
              } else if (rec.createdAt) {
                if (typeof rec.createdAt === 'string') {
                  timestamp = new Date(rec.createdAt).toLocaleString();
                  eventDay = new Date(rec.createdAt).toISOString().split('T')[0];
                } else if (rec.createdAt.toDate && typeof rec.createdAt.toDate === 'function') {
                  timestamp = rec.createdAt.toDate().toLocaleString();
                  eventDay = rec.createdAt.toDate().toISOString().split('T')[0];
                }
              }
            } catch (timestampError) {
              console.warn('⚠️ Error parsing timestamp for record:', d.id, timestampError);
              // Keep default timestamp values
            }

            return {
              id: d.id,
              uid: rec.userId || rec.uid || 'unknown',
              attendeeName: rec.userName || 'Unknown User',
              attendeeEmail: rec.userEmail || '',
              attendeeCategory: rec.userCategory || 'Visitor',
              type: rec.type || 'unknown',
              timestamp: timestamp,
              eventDay: rec.eventDay || eventDay,
              eventId: rec.eventId || 'default',
              createdAt: rec.createdAt || rec.timestamp || new Date().toISOString()
            };
          } catch (error) {
            console.error('❌ Error processing check-in record:', d.id, error);
            // Return a safe fallback record
            return {
              id: d.id,
              uid: 'error',
              attendeeName: 'Error loading record',
              attendeeEmail: '',
              attendeeCategory: 'Unknown',
              type: 'unknown',
              timestamp: new Date().toLocaleString(),
              eventDay: new Date().toISOString().split('T')[0],
              eventId: 'default',
              createdAt: new Date().toISOString()
            };
          }
        });

        // Sort by timestamp (newest first) and take all records for now
        const allCheckins = checkinData
          .sort((a, b) => {
            const aTime = new Date(a.createdAt || a.timestamp || 0).getTime();
            const bTime = new Date(b.createdAt || b.timestamp || 0).getTime();
            return bTime - aTime;
          });

        console.log('✅ Processed check-in data:', {
          total: checkinData.length,
          allCheckins: allCheckins.length,
          sampleRecords: allCheckins.slice(0, 5).map(c => ({
            id: c.id,
            name: c.attendeeName,
            type: c.type,
            eventId: c.eventId,
            eventDay: c.eventDay,
            timestamp: c.timestamp
          }))
        });

        // Update state - this will trigger statistics recalculation
        setRecentCheckIns(allCheckins);
      },
      (error) => {
        console.error('❌ Error in check-in snapshot listener:', error);
      }
    );

    return () => {
      console.log('🔄 Unsubscribing from check-in listener');
      checkinsUnsub();
    };
  }, []); // Removed dependencies to make it run only once

  // Load global settings
  React.useEffect(() => {
    async function loadGlobalSettings() {
      try {
        const sDoc = await getDoc(doc(db, 'AppSettings', 'global'));
        if (sDoc.exists()) {
          const s = sDoc.data() as any;
          if (s.eventId) {
            console.log('📅 Setting current event ID from settings:', s.eventId);
            setCurrentEventId(s.eventId);
          } else {
            console.log('📅 No eventId found in settings, using default');
            setCurrentEventId('default');
          }
        } else {
          console.log('📅 No global settings found, using default event ID');
          setCurrentEventId('default');
        }
      } catch (error) {
        console.error('❌ Error loading global settings:', error);
        setCurrentEventId('default');
      }
    }
    loadGlobalSettings();
  }, []);

  // Debug current event ID and check-in data
  React.useEffect(() => {
    console.log('🔍 Debug info:', {
      currentEventId,
      recentCheckInsCount: recentCheckIns.length,
      eventStats,
      sampleCheckins: recentCheckIns.slice(0, 3).map(c => ({
        id: c.id,
        attendeeName: c.attendeeName,
        type: c.type,
        eventId: c.eventId,
        eventDay: c.eventDay,
        timestamp: c.timestamp
      }))
    });
  }, [currentEventId, recentCheckIns, eventStats]);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Calculate event statistics with enhanced debugging
  React.useEffect(() => {
    console.log('🔢 Recalculating statistics for', recentCheckIns.length, 'check-ins');

    const today = new Date().toISOString().split('T')[0];
    const todayCheckins = recentCheckIns.filter(c => {
      const isToday = c.eventDay === today;
      if (!isToday) {
        console.log('📅 Check-in not for today:', {
          eventDay: c.eventDay,
          today: today,
          attendee: c.attendeeName,
          type: c.type
        });
      }
      return isToday;
    });

    const todayIn = todayCheckins.filter(c => c.type === 'in').length;
    const todayOut = todayCheckins.filter(c => c.type === 'out').length;
    const uniqueToday = new Set(todayCheckins.map(c => c.uid)).size;
    const totalCheckIns = recentCheckIns.length;

    const newStats = {
      todayIn,
      todayOut,
      uniqueToday,
      totalCheckIns,
      averageSession: todayIn > 0 ? Math.round((todayOut / todayIn) * 100) / 100 : 0
    };

    console.log('📊 New statistics calculated:', newStats);
    console.log('📋 Today check-ins:', todayCheckins.map(c => ({
      name: c.attendeeName,
      type: c.type,
      time: c.timestamp,
      eventDay: c.eventDay
    })));

    setEventStats(newStats);
  }, [recentCheckIns]);

  // Filter check-ins
  const filteredCheckIns = React.useMemo(() => {
    return recentCheckIns.filter((checkin) => {
      const matchesSearch = !checkinFilter.search ||
        checkin.attendeeName.toLowerCase().includes(checkinFilter.search.toLowerCase()) ||
        checkin.attendeeEmail.toLowerCase().includes(checkinFilter.search.toLowerCase());

      const matchesType = checkinFilter.type === 'All' || checkin.type === checkinFilter.type;
      const matchesCategory = checkinFilter.category === 'All' || checkin.attendeeCategory === checkinFilter.category;

      // Time range filter
      let matchesTimeRange = true;
      if (checkinFilter.timeRange !== 'all') {
        const checkinDate = new Date(checkin.timestamp);
        const now = new Date();

        switch (checkinFilter.timeRange) {
          case 'today':
            matchesTimeRange = checkinDate.toDateString() === now.toDateString();
            break;
          case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            matchesTimeRange = checkinDate.toDateString() === yesterday.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            matchesTimeRange = checkinDate >= weekAgo;
            break;
        }
      }

      return matchesSearch && matchesType && matchesCategory && matchesTimeRange;
    });
  }, [recentCheckIns, checkinFilter]);



  // Export check-in data
  const exportCheckinData = () => {
    const csvData = filteredCheckIns.map(checkin => ({
      'Attendee Name': checkin.attendeeName,
      'Attendee Email': checkin.attendeeEmail,
      'Category': checkin.attendeeCategory,
      'Type': checkin.type,
      'Timestamp': checkin.timestamp,
      'Event Day': checkin.eventDay,
      'Event ID': checkin.eventId
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkins_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white">Loading Check-in System...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <AuthForm />
      </div>
    );
  }

  if (!userProfile || (userProfile.category !== 'Agent' && userProfile.category !== 'Organizer' && userProfile.category !== 'Admin')) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-white max-w-md mx-auto">
          <FontAwesomeIcon icon={faTimesCircle} className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="mb-6 text-gray-300">Only agents and organizers can access the check-in system.</p>

          {user ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Current role: <span className="capitalize text-white">{userProfile?.category || 'Unknown'}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={() => auth.signOut()}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Please sign in with an agent or organizer account</p>
              <button
                onClick={() => window.location.href = '/signin'}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faUserCheck} className="w-4 h-4" />
                Sign In to Continue
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-green-600 to-blue-700 py-2 sm:py-1">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/QTM 2025 Logo-04.png"
              alt="QTM 2025 Logo"
              className="w-32 sm:w-40 lg:w-48 h-auto"
            />
          </div>
          <div className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-orange-500 hover:bg-orange-600 text-white px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded text-xs sm:text-sm font-semibold transition-colors"
            >
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">←</span>
            </button>
            <button
              onClick={() => {
                auth.signOut();
                window.location.href = '/signin';
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded text-xs sm:text-sm font-semibold transition-colors"
            >
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">↗</span>
            </button>
          </div>
        </div>
      </header>

      <div className="p-3 sm:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-green-50 rounded-xl p-3 sm:p-4 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-xs sm:text-sm font-medium">Check-ins</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{eventStats.todayIn}</p>
              </div>
              <FontAwesomeIcon icon={faUserCheck} className="text-green-600 text-lg sm:text-2xl" />
            </div>
          </div>

          <div className="bg-red-50 rounded-xl p-3 sm:p-4 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-700 text-xs sm:text-sm font-medium">Check-outs</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{eventStats.todayOut}</p>
              </div>
              <FontAwesomeIcon icon={faUserTimes} className="text-red-600 text-lg sm:text-2xl" />
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-xs sm:text-sm font-medium">Unique Today</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{eventStats.uniqueToday}</p>
              </div>
              <FontAwesomeIcon icon={faUsers} className="text-blue-600 text-lg sm:text-2xl" />
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-3 sm:p-4 border border-purple-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-700 text-xs sm:text-sm font-medium">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{eventStats.totalCheckIns}</p>
              </div>
              <FontAwesomeIcon icon={faChartBar} className="text-purple-600 text-lg sm:text-2xl" />
            </div>
          </div>

          <div className="bg-yellow-50 rounded-xl p-3 sm:p-4 border border-yellow-200 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-700 text-xs sm:text-sm font-medium">Avg Session</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{eventStats.averageSession}h</p>
              </div>
              <FontAwesomeIcon icon={faClock} className="text-yellow-600 text-lg sm:text-2xl" />
            </div>
          </div>
        </div>

        {/* Scanner Section */}
        <div className="bg-white rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">QR Code Scanner</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-600">
                Ready
              </span>
            </div>
          </div>

          {/* Scanner Controls */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center mb-3 sm:mb-4">
            <button
              onClick={() => setShowScanner(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-3 sm:py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <FontAwesomeIcon icon={faQrcode} className="w-4 h-4" />
              <span className="hidden sm:inline">Open Scanner</span>
              <span className="sm:hidden">Scan</span>
            </button>

            <button
              onClick={() => {
                setScannerResult('');
                setShowScanner(false);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 sm:px-6 py-3 sm:py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <FontAwesomeIcon icon={faRefresh} className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>

          {/* Scanner Result */}
          {scannerResult && (
            <div className={`p-3 sm:p-4 rounded-lg border mb-3 sm:mb-4 ${scannerResult.includes('✅') ? 'bg-green-500/10 border-green-500/20 text-green-800' : scannerResult.includes('❌') ? 'bg-red-500/10 border-red-500/20 text-red-800' : 'bg-blue-500/10 border-blue-500/20 text-blue-800'}`}>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={scannerResult.includes('✅') ? faCheckCircle : scannerResult.includes('❌') ? faTimesCircle : faInfoCircle} className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base font-medium">{scannerResult}</span>
              </div>
            </div>
          )}

          {/* QR Code Scanner Modal */}
          {showScanner && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden relative">
                {/* Close button */}
                <button
                  onClick={() => setShowScanner(false)}
                  className="absolute top-4 right-4 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <QRCodeScanner
                  userId={user?.uid || ''}
                  userCategory={userProfile?.category || 'Agent'}
                  mode="checkin"
                  onScanResult={(result) => {
                    if (result.success && result.data) {
                      // Process the scan result for check-in
                      if (result.data.userName) {
                        setScannerResult(`✅ Checked in: ${result.data.userName}`);
                        setTimeout(() => setScannerResult(''), 3000);
                      }
                    }
                    // Close scanner after successful scan
                    if (result.success) {
                      setTimeout(() => setShowScanner(false), 2000);
                    }
                  }}
                  onClose={() => setShowScanner(false)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Recent Check-ins */}
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Recent Check-in Activity</h3>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={refreshCheckInData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 sm:py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-none"
              >
                <FontAwesomeIcon icon={faRefresh} className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </button>
              <button
                onClick={exportCheckinData}
                className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 sm:py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-none"
              >
                <FontAwesomeIcon icon={faDownload} className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Export Data</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center mb-4 sm:mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search attendees..."
                value={checkinFilter.search}
                onChange={(e) => setCheckinFilter({...checkinFilter, search: e.target.value})}
                className="w-full px-3 sm:px-4 py-3 sm:py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <select
                value={checkinFilter.type}
                onChange={(e) => setCheckinFilter({...checkinFilter, type: e.target.value})}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
              >
                <option value="All">All Types</option>
                <option value="in">Check-ins</option>
                <option value="out">Check-outs</option>
              </select>
              <select
                value={checkinFilter.category}
                onChange={(e) => setCheckinFilter({...checkinFilter, category: e.target.value})}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
              >
                <option value="All">All Categories</option>
                <option value="Visitor">Visitor</option>
                <option value="Exhibitor">Exhibitor</option>
                <option value="Organizer">Organizer</option>
                <option value="Speaker">Speaker</option>
                <option value="Media">Media</option>
                <option value="Hosted Buyer">Hosted Buyer</option>
                <option value="VIP">VIP</option>
                <option value="Agent">Agent</option>
              </select>
              <select
                value={checkinFilter.timeRange}
                onChange={(e) => setCheckinFilter({...checkinFilter, timeRange: e.target.value})}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 Days</option>
              </select>
            </div>
          </div>

          {/* Check-in Records */}
          <div className="space-y-2 sm:space-y-3 max-h-96 sm:max-h-[500px] overflow-y-auto">
            {filteredCheckIns.length > 0 ? (
              filteredCheckIns.map((checkin, index) => (
                <div key={checkin.id || index} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0 ${
                      checkin.type === 'in' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                      checkin.attendeeCategory === 'Organizer' ? 'bg-orange-500' :
                      checkin.attendeeCategory === 'VIP' ? 'bg-purple-500' :
                      checkin.attendeeCategory === 'Speaker' ? 'bg-green-500' :
                      checkin.attendeeCategory === 'Exhibitor' ? 'bg-blue-500' :
                      checkin.attendeeCategory === 'Hosted Buyer' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium text-sm sm:text-base truncate">{checkin.attendeeName}</p>
                      <p className="text-gray-600 text-xs sm:text-sm capitalize">{checkin.attendeeCategory}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      checkin.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {checkin.type === 'in' ? 'IN' : 'OUT'}
                    </span>
                    <p className="text-gray-600 text-xs mt-1 hidden sm:block">{checkin.timestamp}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 sm:py-12">
                <FontAwesomeIcon icon={faUserCheck} className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Check-in Activity</h3>
                <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base px-4">
                  {recentCheckIns.length === 0
                    ? 'Start scanning attendee badges to record check-ins'
                    : 'No check-ins match your current filters'
                  }
                </p>

              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
            <FontAwesomeIcon icon={faMobile} className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mobile Optimized</h3>
            <p className="text-gray-600 text-sm mb-4">
              Designed for mobile devices and tablets for easy scanning at venue entrances.
            </p>
            <div className="text-xs text-gray-500">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FontAwesomeIcon icon={faCamera} className="w-3 h-3" />
                <span>Camera Access</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faQrcode} className="w-3 h-3" />
                <span>QR Code Scanning</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
            <FontAwesomeIcon icon={faChartBar} className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Analytics</h3>
            <p className="text-gray-600 text-sm mb-4">
              Live attendance tracking with instant statistics and reporting capabilities.
            </p>
            <div className="text-xs text-gray-500">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FontAwesomeIcon icon={faUsers} className="w-3 h-3" />
                <span>Live Updates</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                <span>Session Tracking</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
            <FontAwesomeIcon icon={faDownload} className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Export</h3>
            <p className="text-gray-600 text-sm mb-4">
              Export check-in data for further analysis or integration with other systems.
            </p>
            <div className="text-xs text-gray-500">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
                <span>CSV Export</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faChartBar} className="w-3 h-3" />
                <span>Analytics Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
