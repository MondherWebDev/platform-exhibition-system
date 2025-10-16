"use client";
import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../../../../firebaseConfig";
import { collection, getDocs, doc, updateDoc, setDoc, getDoc, query, where, orderBy, limit, increment, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { processQRCodeScan, QRScanResult } from "../../../../utils/badgeService";
import QRCodeScanner from "../../../../components/QRCodeScanner";
import ClientOnly from '../../../../components/ClientOnly';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQrcode,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faUsers,
  faSignInAlt,
  faSignOutAlt,
  faUserCheck,
  faUserTimes,
  faClock,
  faCalendar,
  faEye,
  faEyeSlash,
  faDownload,
  faRefresh,
  faInfoCircle,
  faExclamationTriangle,
  faTrophy,
  faCrown,
  faStar,
  faMedal,
  faAward,
  faHandshake,
  faLightbulb,
  faBrain,
  faFilter,
  faSearch,
  faSort,
  faSortUp,
  faSortDown,
  faArrowLeft,
  faArrowRight,
  faPlay,
  faStop,
  faPause,
  faForward,
  faBackward,
  faCog,
  faBars,
  faSignOutAlt as faSignOutAltIcon,
  faBell,
  faBell as faBellIcon,
  faInfoCircle as faInfoCircleIcon,
  faUser as faUserIcon,
  faBuilding as faBuildingIcon,
  faEnvelope as faEnvelopeIcon,
  faPhone as faPhoneIcon,
  faGlobe as faGlobeIcon,
  faMapMarkerAlt as faMapMarkerAltIcon,
  faIndustry as faIndustryIcon,
  faUsers as faUsersIcon,
  faCheckCircle as faCheckCircleIcon,
  faTimesCircle as faTimesCircleIcon,
  faSpinner as faSpinnerIcon,
  faCrown as faCrownIcon,
  faStar as faStarIcon,
  faLightbulb as faLightbulbIcon,
  faHandshake as faHandshakeIcon,
  faCalendar as faCalendarIcon,
  faClock as faClockIcon,
  faEye as faEyeIcon,
  faEyeSlash as faEyeSlashIcon,
  faLock as faLockIcon,
  faUnlock as faUnlockIcon,
  faExclamationTriangle as faExclamationTriangleIcon,
  faCheck as faCheckIcon,
  faCheck,
  faArrowRight as faArrowRightIcon,
  faArrowLeft as faArrowLeftIcon
} from '@fortawesome/free-solid-svg-icons';

interface CheckInRecord {
  id: string;
  userId: string;
  userName: string;
  type: 'checkin' | 'checkout';
  timestamp: string;
  agentId: string;
  eventId: string;
  category: string;
}

interface DailyStats {
  date: string;
  registrations: number;
  checkIns: number;
  checkOuts: number;
  leads: number;
  currentAttendees: number;
}

export default function RegistrationCounter() {
  const [currentView, setCurrentView] = useState<'scanner' | 'manual' | 'stats'>('scanner');
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [currentEventId, setCurrentEventId] = useState<string>('default');
  const [agentInfo, setAgentInfo] = useState<any>(null);

  // Stats state
  const [todayStats, setTodayStats] = useState<DailyStats>({
    date: new Date().toISOString().split('T')[0],
    registrations: 0,
    checkIns: 0,
    checkOuts: 0,
    leads: 0,
    currentAttendees: 0
  });
  const [checkInHistory, setCheckInHistory] = useState<CheckInRecord[]>([]);
  const [totalAttendees, setTotalAttendees] = useState(0);

  // Manual entry state
  const [manualBadgeId, setManualBadgeId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setIsClient(true);

    // Load global settings and agent info
    const loadInitialData = async () => {
      // Load global settings
      const sDoc = await getDoc(doc(db, 'AppSettings', 'global'));
      if (sDoc.exists()) {
        const s = sDoc.data() as any;
        if (s.eventId) {
          setCurrentEventId(s.eventId);
        }
      }

      // Load agent info
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'Users', currentUser.uid));
        if (userDoc.exists()) {
          setAgentInfo(userDoc.data());
        }
      }
    };

    loadInitialData();

    // Load today's stats
    loadTodayStats();

    // Load recent check-in history
    loadCheckInHistory();

    // Set up real-time listeners
    setupRealtimeListeners();
  }, []);

  const loadTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dailyStatsRef = doc(db, 'DailyEventStats', `${currentEventId}_${today}`);
      const dailyStatsDoc = await getDoc(dailyStatsRef);

      if (dailyStatsDoc.exists()) {
        const data = dailyStatsDoc.data() as any;
        setTodayStats({
          date: today,
          registrations: data.registrations || 0,
          checkIns: data.checkIns || 0,
          checkOuts: data.checkOuts || 0,
          leads: data.leads || 0,
          currentAttendees: (data.checkIns || 0) - (data.checkOuts || 0)
        });
      }

      // Load total attendees from event stats
      const eventStatsRef = doc(db, 'EventStats', currentEventId);
      const eventStatsDoc = await getDoc(eventStatsRef);
      if (eventStatsDoc.exists()) {
        const data = eventStatsDoc.data() as any;
        setTotalAttendees(data.totalRegistrations || 0);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadCheckInHistory = async () => {
    try {
      const checkInsQuery = query(
        collection(db, 'CheckIns'),
        where('eventId', '==', currentEventId),
        where('agentId', '==', auth.currentUser?.uid || ''),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const checkInsSnapshot = await getDocs(checkInsQuery);
      const history: CheckInRecord[] = [];

      checkInsSnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName || 'Unknown User',
          type: data.type,
          timestamp: data.timestamp,
          agentId: data.agentId,
          eventId: data.eventId,
          category: data.category || 'Visitor'
        });
      });

      setCheckInHistory(history);
    } catch (error) {
      console.error('Error loading check-in history:', error);
    }
  };

  const setupRealtimeListeners = () => {
    const today = new Date().toISOString().split('T')[0];

    // Listen for real-time stats updates
    const dailyStatsRef = doc(db, 'DailyEventStats', `${currentEventId}_${today}`);
    const unsubscribeStats = onSnapshot(dailyStatsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as any;
        setTodayStats({
          date: today,
          registrations: data.registrations || 0,
          checkIns: data.checkIns || 0,
          checkOuts: data.checkOuts || 0,
          leads: data.leads || 0,
          currentAttendees: (data.checkIns || 0) - (data.checkOuts || 0)
        });
      }
    });

    // Listen for real-time check-in updates
    const checkInsQuery = query(
      collection(db, 'CheckIns'),
      where('eventId', '==', currentEventId),
      where('agentId', '==', auth.currentUser?.uid || ''),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribeCheckIns = onSnapshot(checkInsQuery, (snapshot) => {
      const history: CheckInRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName || 'Unknown User',
          type: data.type,
          timestamp: data.timestamp,
          agentId: data.agentId,
          eventId: data.eventId,
          category: data.category || 'Visitor'
        });
      });
      setCheckInHistory(history);
    });

    return () => {
      unsubscribeStats();
      unsubscribeCheckIns();
    };
  };

  const handleQRCodeScan = async (qrData: string) => {
    if (!auth.currentUser) {
      setError('Agent not authenticated');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await processQRCodeScan(
        qrData,
        auth.currentUser.uid,
        'Agent',
        'checkin' // Default to check-in, will be determined by system
      );

      setScanResult(result);

      if (result.success) {
        setSuccess(result.message);

        // Update local stats immediately
        if (result.action === 'checkin') {
          setTodayStats(prev => ({
            ...prev,
            checkIns: prev.checkIns + 1,
            currentAttendees: prev.currentAttendees + 1
          }));
        } else if (result.action === 'checkout') {
          setTodayStats(prev => ({
            ...prev,
            checkOuts: prev.checkOuts + 1,
            currentAttendees: Math.max(0, prev.currentAttendees - 1)
          }));
        }

        // Reload stats to ensure accuracy
        setTimeout(() => loadTodayStats(), 1000);
      } else {
        setError(result.error || 'Scan failed');
      }
    } catch (error: any) {
      console.error('QR scan error:', error);
      setError(error.message || 'Failed to process QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckIn = async () => {
    if (!manualBadgeId.trim() || !auth.currentUser) {
      setError('Please enter a badge ID');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Find user by badge ID
      const badgesQuery = query(
        collection(db, 'Badges'),
        where('id', '==', manualBadgeId.trim())
      );

      const badgesSnapshot = await getDocs(badgesQuery);

      if (badgesSnapshot.empty) {
        setError('Badge not found');
        return;
      }

      const badgeDoc = badgesSnapshot.docs[0];
      const badgeData = badgeDoc.data();

      // Create manual QR data for processing
      const manualQRData = {
        uid: badgeData.userId,
        category: badgeData.category,
        type: 'event_badge',
        eventId: badgeData.eventId || currentEventId,
        timestamp: Date.now(),
        version: '2.0',
        checkIn: {
          userId: badgeData.userId,
          eventId: badgeData.eventId || currentEventId,
          category: badgeData.category,
          lastCheckIn: null,
          lastCheckOut: null,
          totalCheckIns: 0,
          status: 'active',
          checkInHistory: []
        },
        contact: {
          userId: badgeData.userId,
          fullName: badgeData.name,
          email: '',
          phone: '',
          company: badgeData.company,
          position: badgeData.role,
          category: badgeData.category,
          eventId: badgeData.eventId || currentEventId
        }
      };

      const result = await processQRCodeScan(
        JSON.stringify(manualQRData),
        auth.currentUser.uid,
        'Agent',
        'checkin'
      );

      setScanResult(result);

      if (result.success) {
        setSuccess(result.message);
        setManualBadgeId('');

        // Update local stats
        if (result.action === 'checkin') {
          setTodayStats(prev => ({
            ...prev,
            checkIns: prev.checkIns + 1,
            currentAttendees: prev.currentAttendees + 1
          }));
        } else if (result.action === 'checkout') {
          setTodayStats(prev => ({
            ...prev,
            checkOuts: prev.checkOuts + 1,
            currentAttendees: Math.max(0, prev.currentAttendees - 1)
          }));
        }
      } else {
        setError(result.error || 'Manual check-in failed');
      }
    } catch (error: any) {
      console.error('Manual check-in error:', error);
      setError(error.message || 'Failed to process manual check-in');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faQrcode} className="text-blue-400 text-2xl" />
            <div>
              <h1 className="text-xl font-bold text-white">Registration Counter</h1>
              <p className="text-blue-200 text-sm">Check-in/Check-out visitors with QR codes</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white font-medium">{agentInfo?.fullName || 'Agent'}</p>
              <p className="text-blue-200 text-sm">{agentInfo?.company || 'Event Staff'}</p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="text-blue-300 hover:text-white transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setCurrentView('scanner')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              currentView === 'scanner'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            QR Scanner
          </button>
          <button
            onClick={() => setCurrentView('manual')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              currentView === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setCurrentView('stats')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              currentView === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Live Stats
          </button>
        </div>

        {/* QR Scanner View */}
        {currentView === 'scanner' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scanner */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">QR Code Scanner</h2>
              <p className="text-gray-300 mb-6">
                Position visitor's QR code within the camera frame to check them in or out automatically.
              </p>

              <QRCodeScanner
                userId={auth.currentUser?.uid || ''}
                userCategory="Agent"
                onScanResult={(result) => {
                  if (result.success) {
                    setSuccess(result.message);
                  } else {
                    setError(result.error || 'Scan failed');
                  }
                }}
              />

              {loading && (
                <div className="mt-4 text-center">
                  <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-2" />
                  <p className="text-gray-300">Processing scan...</p>
                </div>
              )}

              {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-lg flex items-center gap-2">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mt-4 bg-green-500/10 border border-green-500/20 text-green-300 p-4 rounded-lg flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5" />
                  <span>{success}</span>
                </div>
              )}
            </div>

            {/* Live Stats */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Live Statistics</h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">{todayStats.checkIns}</div>
                  <div className="text-sm text-gray-300">Check-ins Today</div>
                </div>
                <div className="bg-green-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{todayStats.checkOuts}</div>
                  <div className="text-sm text-gray-300">Check-outs Today</div>
                </div>
                <div className="bg-purple-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{todayStats.currentAttendees}</div>
                  <div className="text-sm text-gray-300">Currently Inside</div>
                </div>
                <div className="bg-yellow-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{totalAttendees}</div>
                  <div className="text-sm text-gray-300">Total Registered</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Recent Activity</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {checkInHistory.slice(0, 10).map((record) => (
                    <div key={record.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon
                          icon={record.type === 'checkin' ? faSignInAlt : faSignOutAlt}
                          className={`w-4 h-4 ${record.type === 'checkin' ? 'text-green-400' : 'text-red-400'}`}
                        />
                        <div>
                          <div className="text-white font-medium">{record.userName}</div>
                          <div className="text-gray-400 text-sm">{record.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-300 text-sm">{formatTime(record.timestamp)}</div>
                        <div className="text-gray-400 text-xs">{formatDate(record.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry View */}
        {currentView === 'manual' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Manual Check-in/Check-out</h2>
            <p className="text-gray-300 mb-6">
              Enter a badge ID manually if QR scanning is not available.
            </p>

            <div className="flex gap-4 mb-6">
              <input
                type="text"
                value={manualBadgeId}
                onChange={(e) => setManualBadgeId(e.target.value)}
                placeholder="Enter Badge ID (e.g., badge_123456)"
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleManualCheckIn}
                disabled={loading || !manualBadgeId.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                    Check In/Out
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-lg flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-300 p-4 rounded-lg flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5" />
                <span>{success}</span>
              </div>
            )}

            {/* Manual Entry Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">How to Find Badge ID</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Ask the visitor to show their e-badge or registration confirmation</li>
                <li>• Badge IDs typically start with "badge_" followed by numbers</li>
                <li>• You can also search by visitor name in the visitor dashboard</li>
                <li>• For QR scanning issues, this manual method ensures no visitor is missed</li>
              </ul>
            </div>
          </div>
        )}

        {/* Stats View */}
        {currentView === 'stats' && (
          <div className="space-y-6">
            {/* Today's Summary */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Today's Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-500/20 rounded-lg p-4 text-center">
                  <FontAwesomeIcon icon={faUsers} className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-400">{todayStats.registrations}</div>
                  <div className="text-sm text-gray-300">Registrations</div>
                </div>
                <div className="bg-green-500/20 rounded-lg p-4 text-center">
                  <FontAwesomeIcon icon={faSignInAlt} className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-400">{todayStats.checkIns}</div>
                  <div className="text-sm text-gray-300">Check-ins</div>
                </div>
                <div className="bg-red-500/20 rounded-lg p-4 text-center">
                  <FontAwesomeIcon icon={faSignOutAlt} className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-400">{todayStats.checkOuts}</div>
                  <div className="text-sm text-gray-300">Check-outs</div>
                </div>
                <div className="bg-purple-500/20 rounded-lg p-4 text-center">
                  <FontAwesomeIcon icon={faUserCheck} className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-400">{todayStats.currentAttendees}</div>
                  <div className="text-sm text-gray-300">Currently Inside</div>
                </div>
              </div>
            </div>

            {/* Detailed Activity Log */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Recent Activity Log</h2>
                <button
                  onClick={loadCheckInHistory}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <FontAwesomeIcon icon={faRefresh} className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left text-gray-400 py-2">Time</th>
                      <th className="text-left text-gray-400 py-2">Visitor</th>
                      <th className="text-left text-gray-400 py-2">Company</th>
                      <th className="text-left text-gray-400 py-2">Action</th>
                      <th className="text-left text-gray-400 py-2">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkInHistory.map((record) => (
                      <tr key={record.id} className="border-b border-white/10">
                        <td className="py-3 text-gray-300">
                          {formatTime(record.timestamp)}
                        </td>
                        <td className="py-3 text-white font-medium">
                          {record.userName}
                        </td>
                        <td className="py-3 text-gray-300">
                          {/* Would need to fetch from user data */}
                          -
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.type === 'checkin'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {record.type === 'checkin' ? 'Check-in' : 'Check-out'}
                          </span>
                        </td>
                        <td className="py-3 text-gray-300">
                          {record.category}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {checkInHistory.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <FontAwesomeIcon icon={faClock} className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No activity recorded yet today</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
