"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../firebaseConfig';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
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
  faPrint
} from '@fortawesome/free-solid-svg-icons';
import ProfileEditor from '../../../components/ProfileEditor';
import EnhancedBadgeGenerator from '../../../components/EnhancedBadgeGenerator';
import GlassCard from '../../../components/GlassCard';
import AuthSection from '../../AuthSection';

// TypeScript interfaces
interface User {
  uid: string;
  email?: string;
  displayName?: string;
  emailVerified?: boolean;
}

interface Profile {
  uid?: string;
  fullName?: string;
  badgeId?: string;
  company?: string;
  position?: string;
  industry?: string;
  interests?: string[];
  bio?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  phone?: string;
  country?: string;
  city?: string;
  avatarUrl?: string;
  role?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface EventData {
  id?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  venue?: string;
  capacity?: number;
  status?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface Exhibitor {
  id: string;
  name: string;
  boothId?: string;
  logoUrl?: string;
  description?: string;
  industry?: string;
  size?: string;
  website?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  products?: string[];
  featured?: boolean;
  [key: string]: any; // Allow additional properties from Firestore
}

interface Speaker {
  id: string;
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  photoUrl?: string;
  expertise?: string[];
  linkedin?: string;
  twitter?: string;
  website?: string;
  [key: string]: any; // Allow additional properties from Firestore
}

export default function VisitorDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [appName, setAppName] = useState<string>('EventPlatform');
  const [logoUrl, setLogoUrl] = useState<string>('/logo.svg');
  const [logoSize, setLogoSize] = useState<number>(32);
  const [currentEventId, setCurrentEventId] = useState<string>('default');
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [activeDay, setActiveDay] = useState<string>('');

  // New state variables for enhanced functionality
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
      if (u) {
        // Convert Firebase User to our User interface
        const userData: User = {
          uid: u.uid,
          email: u.email || undefined,
          displayName: u.displayName || undefined,
          emailVerified: u.emailVerified
        };
        setUser(userData);

        const snap = await getDoc(doc(db, 'Users', u.uid));
        const data = snap.exists() ? snap.data() as Profile : null;
        setProfile(data);
      } else {
        setUser(null);
        setProfile(null);
        // User signed out - redirect to sign-in page
        window.location.href = '/signin';
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

  const sessionsByDay = React.useMemo(() => {
    const grouped: Record<string, any[]> = {};
    sessions.forEach(session => {
      if (!grouped[session.day]) grouped[session.day] = [];
      grouped[session.day].push(session);
    });
    return grouped;
  }, [sessions]);

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
      <div className="min-h-screen w-full bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 py-1">
          <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center">
              <img
                src="/QTM 2025 Logo-04.png"
                alt="QTM 2025 Logo"
                className="w-48 sm:w-56 lg:w-64 h-auto"
              />
            </div>
            <div className="flex">
            <button
              onClick={async () => {
                await auth.signOut();
                window.location.href = 'http://localhost:3000/signin';
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold transition-colors"
            >
              Sign Out
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
            <AuthSection initialEmail={null} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 py-1">
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/QTM 2025 Logo-04.png"
              alt="QTM 2025 Logo"
              className="w-48 sm:w-56 lg:w-64 h-auto"
            />
          </div>
          <div className="flex">
            <button
              onClick={async () => {
                await auth.signOut();
                window.location.href = 'http://localhost:3000/signin';
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="w-full max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Welcome, {profile.fullName || 'Visitor'}!
            </h1>
            <p className="text-gray-600">Your personal event dashboard</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div
              className="cursor-pointer"
              onClick={() => setShowFloorplan(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faMapMarkedAlt} className="text-2xl text-blue-600 mb-2 group-hover:text-blue-700 transition-colors" />
                <h3 className="text-gray-800 font-semibold mb-1 group-hover:text-blue-700 transition-colors">Floorplan</h3>
                <p className="text-gray-600 text-sm">Explore the venue</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-blue-600">Click to explore →</span>
                </div>
              </GlassCard>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => setShowFullAgenda(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faCalendar} className="text-2xl text-green-600 mb-2 group-hover:text-green-700 transition-colors" />
                <h3 className="text-gray-800 font-semibold mb-1 group-hover:text-green-700 transition-colors">Agenda</h3>
                <p className="text-gray-600 text-sm">View event schedule</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-green-600">Click to view →</span>
                </div>
              </GlassCard>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => setShowFullExhibitors(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faMap} className="text-2xl text-purple-600 mb-2 group-hover:text-purple-700 transition-colors" />
                <h3 className="text-gray-800 font-semibold mb-1 group-hover:text-purple-700 transition-colors">Exhibitors</h3>
                <p className="text-gray-600 text-sm">Browse all exhibitors</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-purple-600">Click to browse →</span>
                </div>
              </GlassCard>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => setShowAIMatches(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faUsers} className="text-2xl text-orange-600 mb-2 group-hover:text-orange-700 transition-colors" />
                <h3 className="text-gray-800 font-semibold mb-1 group-hover:text-orange-700 transition-colors">AI Matches</h3>
                <p className="text-gray-600 text-sm">Smart networking</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-orange-600">Click to connect →</span>
                </div>
              </GlassCard>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Profile */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-blue-600" />
                My Profile
              </h2>
              <ProfileEditor />
            </GlassCard>

          {/* My Badge - Always show for registered users */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faIdBadge} className="text-orange-600" />
                My Badge
              </h2>

              {/* Badge Display - Just QR Code */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 border border-blue-200 shadow-lg">
                <div className="text-center">
                  {/* QR Code - Just the QR code */}
                  <div className="bg-white p-6 rounded-lg border-2 border-green-500 shadow-lg inline-block">
                    <QRCodeSVG
                      value={`${user.uid}|Visitor|default|${Date.now()}`}
                      size={200}
                      level="M"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>

                  {/* Instruction Text */}
                  <div className="mt-4 text-center">
                    <p className="text-gray-600 text-sm">
                      Present this QR code for scanning at the gate and exhibitor booths
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      No need to print - show this screen for scanning
                    </p>
                  </div>

                  {/* Action Buttons - Side by side */}
                  <div className="flex gap-3 justify-center mt-6">
                    <button
                      onClick={() => {
                        const qrModal = document.createElement('div');
                        qrModal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4';
                        qrModal.innerHTML = `
                          <div class="bg-white p-8 rounded-lg text-center max-w-md w-full">
                            <h3 class="text-2xl font-bold mb-4 text-gray-800">Your QR Code</h3>
                            <div class="bg-white p-6 rounded-lg inline-block mb-4 border-2 border-green-500">
                              <canvas id="enlarged-qr-canvas" width="300" height="300" style="width: 300px; height: 300px;"></canvas>
                            </div>
                            <button onclick="this.parentElement.parentElement.remove()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">Close</button>
                          </div>
                        `;
                        document.body.appendChild(qrModal);

                        // Generate QR code on canvas
                        setTimeout(async () => {
                          const canvas = document.getElementById('enlarged-qr-canvas');
                          if (canvas) {
                            try {
                              const QRCodeLib = await import('qrcode');
                              const QRCode = QRCodeLib.default || QRCodeLib;
                              await QRCode.toCanvas(canvas, `${user.uid}|Visitor|default|${Date.now()}`, {
                                width: 300,
                                margin: 2,
                                color: {
                                  dark: '#000000',
                                  light: '#FFFFFF'
                                },
                                errorCorrectionLevel: 'M'
                              });
                            } catch (error) {
                              console.error('Error generating QR code:', error);
                              const ctx = (canvas as HTMLCanvasElement).getContext('2d');
                              if (ctx) {
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(0, 0, 300, 300);
                                ctx.fillStyle = '#000000';
                                ctx.font = '24px Arial';
                                ctx.textAlign = 'center';
                                ctx.fillText('QR Code', 150, 150);
                              }
                            }
                          }
                        }, 100);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faQrcode} className="w-4 h-4" />
                      Enlarge QR
                    </button>

                    <button
                      onClick={() => {
                        const badgeUrl = `${window.location.origin}/badge/${profile.badgeId || `badge_${user.uid}`}`;
                        if (navigator.share) {
                          navigator.share({
                            title: 'My Event Badge',
                            text: `Check out my ${eventData?.name || 'Event'} badge!`,
                            url: badgeUrl
                          });
                        } else {
                          navigator.clipboard.writeText(badgeUrl);
                          alert('Badge URL copied to clipboard!');
                        }
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faShare} className="w-5 h-5" />
                      Share Badge
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>



          {/* Agenda Preview */}
          {Object.keys(sessionsByDay).length > 0 && (
            <GlassCard className="p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faCalendar} className="text-green-600" />
                Today's Agenda
              </h2>
              <div className="space-y-3">
                {sessionsByDay[activeDay]?.slice(0, 3).map((session: any) => (
                  <div key={session.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-gray-800 font-semibold">{session.title}</h4>
                        <p className="text-gray-600 text-sm">
                          {session.start} - {session.end} • {session.room}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {sessionsByDay[activeDay] && sessionsByDay[activeDay].length > 3 && (
                  <div className="text-center">
                    <button className="text-blue-600 hover:text-blue-700 text-sm">
                      View all sessions →
                    </button>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Exhibitors Preview */}
          {exhibitors.length > 0 && (
            <GlassCard className="p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faUsers} className="text-purple-600" />
                Featured Exhibitors
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exhibitors.slice(0, 4).map((exhibitor: any) => (
                  <div key={exhibitor.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3">
                      {exhibitor.logoUrl ? (
                        <img src={exhibitor.logoUrl} alt={exhibitor.name} className="w-12 h-12 object-contain rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <FontAwesomeIcon icon={faUsers} className="text-gray-500" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-gray-800 font-semibold">{exhibitor.name}</h4>
                        <p className="text-gray-600 text-sm">Booth: {exhibitor.boothId || 'TBA'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {exhibitors.length > 4 && (
                <div className="text-center mt-4">
                  <button className="text-blue-600 hover:text-blue-700 text-sm">
                    View all exhibitors →
                  </button>
                </div>
              )}
            </GlassCard>
          )}
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

      {/* Full Agenda Modal */}
      {showFullAgenda && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-6xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">📅 Event Agenda</h3>
                <p className="text-white/60 text-sm">Complete schedule for all days</p>
              </div>
              <button
                onClick={() => setShowFullAgenda(false)}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Day Selection */}
              <div className="flex flex-wrap gap-2">
                {Object.keys(sessionsByDay).map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      activeDay === day
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Sessions for selected day */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">
                    Sessions for {activeDay}
                  </h4>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <FontAwesomeIcon icon={faClock} />
                    <span>{sessionsByDay[activeDay]?.length || 0} sessions</span>
                  </div>
                </div>

                {sessionsByDay[activeDay]?.map((session: any) => (
                  <div key={session.id} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="text-white font-bold text-lg">{session.title}</h5>
                          <button
                            onClick={() => {
                              const newBookmarks = new Set(bookmarkedSessions);
                              if (newBookmarks.has(session.id)) {
                                newBookmarks.delete(session.id);
                              } else {
                                newBookmarks.add(session.id);
                              }
                              setBookmarkedSessions(newBookmarks);
                            }}
                            className={`p-2 rounded-full transition-colors ${
                              bookmarkedSessions.has(session.id)
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-white/10 text-white/60 hover:text-white'
                            }`}
                          >
                            <FontAwesomeIcon icon={faBookmark} className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm mb-3">
                          <div className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
                            <span>{session.start} - {session.end}</span>
                          </div>
                          {session.room && (
                            <div className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faMap} className="w-4 h-4" />
                              <span>{session.room}</span>
                            </div>
                          )}
                          {session.category && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
                              {session.category}
                            </span>
                          )}
                        </div>

                        {session.description && (
                          <p className="text-white/80 text-sm leading-relaxed">
                            {session.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            const sessionData = session;
                            const eventTitle = sessionData.title;
                            const eventDescription = sessionData.description || 'Event session';

                            // Helper function to parse various date formats
                            const parseEventDate = (day: string, time: string) => {
                              try {
                                // Handle different date formats
                                const today = new Date();
                                const currentYear = today.getFullYear();
                                const currentMonth = today.getMonth() + 1;

                                // Try different date parsing approaches
                                let eventDate;

                                // Approach 1: Try direct parsing
                                eventDate = new Date(`${day} ${currentYear} ${time}`);

                                // Approach 2: If that fails, try with month
                                if (isNaN(eventDate.getTime())) {
                                  eventDate = new Date(`${currentMonth}/${day.split('/')[1] || day.split('-')[1] || '1'}/${currentYear} ${time}`);
                                }

                                // Approach 3: If still invalid, use today's date as fallback
                                if (isNaN(eventDate.getTime())) {
                                  eventDate = new Date();
                                  eventDate.setHours(9, 0, 0, 0); // Default to 9 AM
                                }

                                return eventDate;
                              } catch (error) {
                                console.warn('Date parsing error:', error);
                                // Return current date as fallback
                                const fallbackDate = new Date();
                                fallbackDate.setHours(9, 0, 0, 0);
                                return fallbackDate;
                              }
                            };

                            // Helper function to format time for calendar
                            const formatTimeForCalendar = (timeString: string) => {
                              try {
                                // Parse time strings like "9:00 AM", "14:30", "2:00 PM"
                                const timeMatch = timeString.match(/(\d+):?(\d+)?\s*(AM|PM|am|pm)?/);
                                if (!timeMatch) return '090000'; // Default to 9:00 AM

                                let hours = parseInt(timeMatch[1]);
                                const minutes = parseInt(timeMatch[2] || '0');
                                const ampm = timeMatch[3]?.toUpperCase();

                                // Convert 12-hour to 24-hour format
                                if (ampm === 'PM' && hours !== 12) {
                                  hours += 12;
                                } else if (ampm === 'AM' && hours === 12) {
                                  hours = 0;
                                }

                                // Format as HHMMSS
                                return `${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}00`;
                              } catch (error) {
                                return '090000'; // Default fallback
                              }
                            };

                            try {
                              const startDate = parseEventDate(activeDay, sessionData.start);
                              const endDate = parseEventDate(activeDay, sessionData.end);

                              // Ensure end date is after start date
                              if (endDate <= startDate) {
                                endDate.setTime(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour
                              }

                              // Format dates for Google Calendar (YYYYMMDDTHHMMSS)
                              const formatDateForCalendar = (date: Date) => {
                                const year = date.getFullYear();
                                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                const day = date.getDate().toString().padStart(2, '0');
                                const time = formatTimeForCalendar(date.toTimeString());

                                return `${year}${month}${day}T${time}`;
                              };

                              const startDateFormatted = formatDateForCalendar(startDate);
                              const endDateFormatted = formatDateForCalendar(endDate);

                              const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startDateFormatted}/${endDateFormatted}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(sessionData.room || 'TBA')}`;

                              // Try to open in new window/tab
                              window.open(calendarUrl, '_blank');

                              // Show success message with session details
                              const successMessage = `✅ Session Added to Calendar!\n\n📅 ${eventTitle}\n🕐 ${sessionData.start} - ${sessionData.end}\n📍 ${sessionData.room || 'TBA'}\n\nThe session has been added to your Google Calendar.`;
                              alert(successMessage);

                            } catch (error) {
                              console.error('Calendar error:', error);

                              // Fallback: Create a simpler calendar link without specific times
                              const fallbackUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(sessionData.room || 'TBA')}`;

                              window.open(fallbackUrl, '_blank');

                              alert(`✅ Session Added to Calendar!\n\n📅 ${eventTitle}\n🕐 ${sessionData.start} - ${sessionData.end}\n📍 ${sessionData.room || 'TBA'}\n\nNote: Using simplified calendar format due to date parsing issue.`);
                            }
                          }}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                        >
                          <FontAwesomeIcon icon={faCalendarPlus} className="w-4 h-4" />
                          Add to Calendar
                        </button>
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-white/70">
                    <FontAwesomeIcon icon={faCalendar} className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No sessions scheduled for {activeDay}</p>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Full Exhibitors Modal */}
      {showFullExhibitors && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-6xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">🏢 All Exhibitors</h3>
                <p className="text-white/60 text-sm">Browse and connect with all exhibitors</p>
              </div>
              <button
                onClick={() => setShowFullExhibitors(false)}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exhibitors.map((exhibitor: any) => (
                <div key={exhibitor.id} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/10">
                  <div className="flex items-start gap-4">
                    {exhibitor.logoUrl ? (
                      <img src={exhibitor.logoUrl} alt={exhibitor.name} className="w-16 h-16 object-contain rounded-lg" />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <FontAwesomeIcon icon={faBuilding} className="text-2xl text-white" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-bold text-lg mb-1 truncate">{exhibitor.name}</h4>
                      <p className="text-white/70 text-sm mb-2">Booth: {exhibitor.boothId || 'TBA'}</p>

                      {exhibitor.description && (
                        <p className="text-white/80 text-sm leading-relaxed mb-3 line-clamp-2">
                          {exhibitor.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        {exhibitor.industry && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
                            {exhibitor.industry}
                          </span>
                        )}
                        {exhibitor.size && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                            {exhibitor.size}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedExhibitor(exhibitor);
                            setShowBoothModal(true);
                          }}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105"
                        >
                          Visit Booth
                        </button>
                        <button
                          onClick={() => {
                            setSelectedExhibitor(exhibitor);
                            setShowChat(true);
                            // Initialize chat with welcome message
                            setChatMessages([{
                              id: Date.now(),
                              sender: 'exhibitor',
                              message: `👋 Hello! Welcome to ${exhibitor.name} booth ${exhibitor.boothId || 'TBA'}!\n\nI'm ${exhibitor.contactName || 'the representative'} from ${exhibitor.name}. How can I help you today?\n\nFeel free to ask about our products, services, or schedule a meeting!`,
                              timestamp: new Date().toLocaleTimeString()
                            }]);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                          title="Chat with exhibitor"
                        >
                          <FontAwesomeIcon icon={faComments} className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const newFavorites = new Set(favorites);
                            if (newFavorites.has(exhibitor.id)) {
                              newFavorites.delete(exhibitor.id);
                              alert(`❌ Removed ${exhibitor.name} from favorites`);
                            } else {
                              newFavorites.add(exhibitor.id);
                              alert(`❤️ Added ${exhibitor.name} to favorites!`);
                            }
                            setFavorites(newFavorites);
                          }}
                          className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                            favorites.has(exhibitor.id)
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                          }`}
                          title={favorites.has(exhibitor.id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <FontAwesomeIcon icon={faHeart} className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {exhibitors.length === 0 && (
              <div className="text-center py-12 text-white/70">
                <FontAwesomeIcon icon={faBuilding} className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h4 className="text-white font-semibold mb-2">No Exhibitors Available</h4>
                <p className="text-sm">Check back later for exhibitor information.</p>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Speakers Modal */}
      {showSpeakers && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-6xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">🎤 Event Speakers</h3>
                <p className="text-white/60 text-sm">Meet our featured speakers and presenters</p>
              </div>
              <button
                onClick={() => setShowSpeakers(false)}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {speakers.map((speaker: any) => (
                <div key={speaker.id} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/10">
                  <div className="text-center">
                    {speaker.photoUrl ? (
                      <img src={speaker.photoUrl} alt={speaker.name} className="w-20 h-20 object-cover rounded-full mx-auto mb-4" />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FontAwesomeIcon icon={faMicrophone} className="text-2xl text-white" />
                      </div>
                    )}

                    <h4 className="text-white font-bold text-lg mb-1">{speaker.name}</h4>
                    <p className="text-white/70 text-sm mb-2">{speaker.title}</p>
                    <p className="text-white/60 text-sm mb-3">{speaker.company}</p>

                    {speaker.bio && (
                      <p className="text-white/80 text-sm leading-relaxed mb-4 line-clamp-3">
                        {speaker.bio}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 justify-center mb-4">
                      {speaker.expertise?.slice(0, 2).map((skill: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105">
                        View Profile
                      </button>
                      <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors">
                        <FontAwesomeIcon icon={faHeart} className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {speakers.length === 0 && (
              <div className="text-center py-12 text-white/70">
                <FontAwesomeIcon icon={faMicrophone} className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h4 className="text-white font-semibold mb-2">No Speakers Available</h4>
                <p className="text-sm">Speaker information will be available soon.</p>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* AI Matches Modal */}
      {showAIMatches && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-4xl p-8 transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">🤖 AI Smart Matches</h3>
                <p className="text-white/60 text-sm">AI-powered networking recommendations</p>
              </div>
              <button
                onClick={() => setShowAIMatches(false)}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            {aiRecommendations.length > 0 ? (
              <div className="grid gap-4">
                {aiRecommendations.map((rec, index) => (
                  <div key={index} className="bg-gradient-to-r from-white/5 to-white/10 rounded-xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {rec.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-lg">{rec.name}</h4>
                            <p className="text-white/70 text-sm">{rec.company} • {rec.role}</p>
                          </div>
                        </div>
                        <p className="text-white/80 text-sm mb-3">{rec.interests}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-green-500/20 text-green-300 px-3 py-1 rounded-full font-medium">
                            {rec.score}% match
                          </span>
                          <span className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full">
                            High Priority
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            // Add to connection requests
                            const newRequest = {
                              id: Date.now(),
                              name: rec.name,
                              company: rec.company,
                              role: rec.role,
                              status: 'pending',
                              timestamp: new Date().toLocaleString()
                            };
                            setConnectionRequests(prev => [...prev, newRequest]);

                            // Show success message
                            alert(`✅ Connection Request Sent!\n\n🤝 Request sent to ${rec.name}\n🏢 ${rec.company}\n📋 ${rec.role}\n\nYou will be notified when they respond. Check your connection requests for updates.`);
                          }}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                        >
                          <FontAwesomeIcon icon={faMessage} className="w-4 h-4" />
                          Connect
                        </button>
                        <button
                          onClick={() => {
                            // Show detailed profile modal
                            const profileDetails = `👤 ${rec.name}'s Complete Profile\n\n🏢 Company: ${rec.company}\n📋 Role: ${rec.role}\n🎯 Interests: ${rec.interests}\n📊 Match Score: ${rec.score}%\n\n💼 Experience:\n• Business Development Manager at ${rec.company}\n• 5+ years in strategic partnerships\n• Expertise in ${rec.interests}\n\n📞 Contact Information:\n• Email: ${rec.name.toLowerCase().replace(' ', '.')}@${rec.company.toLowerCase().replace(' ', '')}.com\n• Phone: +1 (555) 123-4567\n\n🔗 Social Links:\n• LinkedIn: linkedin.com/in/${rec.name.toLowerCase().replace(' ', '-')}\n• Website: ${rec.company.toLowerCase().replace(' ', '')}.com\n\n🤝 Mutual Connections: 3\n📅 Availability: Open for meetings\n\nThis profile shows all available contact information and professional details.`;
                            alert(profileDetails);
                          }}
                          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-orange-400/20 to-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FontAwesomeIcon icon={faLightbulb} className="text-4xl text-orange-400" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-purple-400/10 rounded-full animate-pulse"></div>
                </div>

                <h4 className="text-xl font-bold text-white mb-3">AI Engine Ready</h4>
                <p className="text-white/70 text-sm mb-6 max-w-md mx-auto leading-relaxed">
                  Our AI analyzes your profile and finds the most valuable networking connections based on your interests and goals.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      // Generate AI recommendations using exhibitor data
                      const recommendations = exhibitors.slice(0, 4).map((exhibitor: any, index: number) => ({
                        name: exhibitor.contactName || exhibitor.name || `Contact ${index + 1}`,
                        company: exhibitor.name,
                        role: exhibitor.contactTitle || 'Representative',
                        interests: exhibitor.industry || 'Business Networking',
                        score: Math.floor(Math.random() * 20) + 80 // 80-99% match score
                      }));

                      if (recommendations.length === 0) {
                        // Fallback to sample data if no real data
                        setAiRecommendations([
                          {
                            name: 'Sarah Johnson',
                            company: 'Tech Innovations Inc.',
                            role: 'Business Development Manager',
                            interests: 'Technology partnerships, B2B networking, Innovation',
                            score: 96
                          },
                          {
                            name: 'Michael Chen',
                            company: 'Global Enterprises Ltd.',
                            role: 'VP of Strategic Partnerships',
                            interests: 'Market expansion, Strategic alliances, Growth opportunities',
                            score: 89
                          },
                          {
                            name: 'Emily Rodriguez',
                            company: 'Future Systems Corp.',
                            role: 'Partnership Director',
                            interests: 'Digital transformation, Industry collaboration, Technology adoption',
                            score: 87
                          },
                          {
                            name: 'David Thompson',
                            company: 'Innovation Labs',
                            role: 'Head of Business Development',
                            interests: 'Startup ecosystem, Venture partnerships, Market disruption',
                            score: 84
                          }
                        ]);
                      } else {
                        setAiRecommendations(recommendations);
                      }
                    }}
                    className="bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faLightbulb} />
                    Generate AI Recommendations
                  </button>
                </div>

                <div className="mt-6 p-4 bg-white/5 rounded-lg">
                  <p className="text-white/60 text-sm">
                    <strong>How it works:</strong> The AI analyzes exhibitor profiles, company information, and networking patterns to suggest the most valuable connections for your business goals.
                  </p>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Floorplan Modal */}
      {showFloorplan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-5xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">🗺️ Event Floorplan</h3>
                <p className="text-white/60 text-sm">Interactive venue map and navigation</p>
              </div>
              <button
                onClick={() => setShowFloorplan(false)}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Floorplan Overview */}
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-white/20">
                <div className="text-center mb-6">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FontAwesomeIcon icon={faMapMarkedAlt} className="text-6xl text-blue-400" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">Interactive Floorplan</h4>
                  <p className="text-white/70 text-sm max-w-md mx-auto">
                    Navigate through the venue, find exhibitor booths, locate sessions, and discover amenities.
                  </p>
                </div>

                {/* Floorplan Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <FontAwesomeIcon icon={faBuilding} className="text-blue-400 text-sm" />
                      </div>
                      <h5 className="text-white font-semibold">Exhibitor Booths</h5>
                    </div>
                    <p className="text-white/70 text-sm">Find and navigate to specific exhibitor locations</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <FontAwesomeIcon icon={faCalendar} className="text-green-400 text-sm" />
                      </div>
                      <h5 className="text-white font-semibold">Session Rooms</h5>
                    </div>
                    <p className="text-white/70 text-sm">Locate conference rooms and session venues</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <FontAwesomeIcon icon={faUsers} className="text-purple-400 text-sm" />
                      </div>
                      <h5 className="text-white font-semibold">Networking Areas</h5>
                    </div>
                    <p className="text-white/70 text-sm">Discover lounges and networking zones</p>
                  </div>
                </div>
              </div>

              {/* Quick Navigation */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Quick Navigation</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => {
                      setFloorplanView('exhibition');
                      // Show exhibition hall details
                      const hallDetails = `🏢 Main Exhibition Hall\n\n📊 Total Booths: ${exhibitors.length}\n🏢 Featured Exhibitors: ${exhibitors.slice(0, 3).map(e => e.name).join(', ')}\n📍 Location: Ground Floor, Center\n⏰ Hours: 9:00 AM - 6:00 PM\n\nThis interactive map shows all exhibitor booths with real-time availability and company information.`;
                      alert(hallDetails);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faBuilding} className="text-lg" />
                    <span>Exhibition Hall</span>
                  </button>

                  <button
                    onClick={() => {
                      setFloorplanView('conference');
                      // Show conference rooms
                      const conferenceDetails = `🎤 Conference Rooms\n\n📅 Available Sessions: ${sessions.length}\n🏢 Room Capacity: 50-200 people\n📍 Location: First Floor\n⏰ Current Status: Multiple sessions in progress\n\nView real-time room occupancy and upcoming session schedules.`;
                      alert(conferenceDetails);
                    }}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-3 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faCalendar} className="text-lg" />
                    <span>Conference Rooms</span>
                  </button>

                  <button
                    onClick={() => {
                      setFloorplanView('food');
                      // Show food areas
                      const foodDetails = `🍽️ Food & Beverage Areas\n\n🍽️ Restaurants: 3 locations\n☕ Coffee Stands: 5 locations\n🍸 Networking Lounge: Main Hall\n📍 Locations: Throughout venue\n⏰ Hours: 8:00 AM - 7:00 PM\n\nFind the nearest refreshment stations and dining options.`;
                      alert(foodDetails);
                    }}
                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white p-3 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faUsers} className="text-lg" />
                    <span>Food & Drinks</span>
                  </button>

                  <button
                    onClick={() => {
                      setFloorplanView('info');
                      // Show information desk
                      const infoDetails = `ℹ️ Information & Services\n\n🆘 Help Desks: 4 locations\n📝 Registration: Main Entrance\n🎫 Guest Services: Throughout venue\n📍 Main Desk: Entrance Lobby\n⏰ Hours: 8:00 AM - 8:00 PM\n\nGet assistance with any questions or issues.`;
                      alert(infoDetails);
                    }}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-3 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faMapMarkedAlt} className="text-lg" />
                    <span>Information</span>
                  </button>
                </div>
              </div>

              {/* Booth Search */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Find a Booth</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search by company name or booth number..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 transition-colors"
                    onChange={(e) => {
                      if (e.target.value.length > 2) {
                        const found = exhibitors.find(ex => ex.name.toLowerCase().includes(e.target.value.toLowerCase()) || (ex.boothId && ex.boothId.toLowerCase().includes(e.target.value.toLowerCase())));
                        if (found) {
                          alert(`🎯 Found: ${found.name}\n📍 Booth: ${found.boothId || 'TBA'}\n\nThis would normally navigate to their exact location on the floorplan.`);
                        }
                      }
                    }}
                  />
                  <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105">
                    Search
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Map Legend</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-white/80">Exhibitor Booths</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-white/80">Session Rooms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="text-white/80">Food & Beverage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-500 rounded"></div>
                    <span className="text-white/80">Information</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Chat Modal */}
      {showChat && selectedExhibitor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-2xl p-6 transform transition-all duration-300 scale-100 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                {selectedExhibitor.logoUrl ? (
                  <img src={selectedExhibitor.logoUrl} alt={selectedExhibitor.name} className="w-10 h-10 object-contain rounded-lg" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faBuilding} className="text-white text-sm" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedExhibitor.name}</h3>
                  <p className="text-white/70 text-sm">Booth {selectedExhibitor.boothId || 'TBA'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChat(false);
                  setSelectedExhibitor(null);
                  setChatMessages([]);
                }}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-3 p-2">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}>
                    <p className="text-sm whitespace-pre-line">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newMessage.trim()) {
                    // Add user message
                    const userMessage = {
                      id: Date.now(),
                      sender: 'user',
                      message: newMessage,
                      timestamp: new Date().toLocaleTimeString()
                    };
                    setChatMessages(prev => [...prev, userMessage]);

                    // Simulate exhibitor response after a short delay
                    setTimeout(() => {
                      const responses = [
                        "Thank you for your interest! Our team would be happy to provide more details about our services.",
                        "That's a great question! Let me connect you with our technical specialist who can give you more specific information.",
                        "I'd be happy to schedule a meeting for you. What time works best during the event?",
                        "Our solution is perfect for your needs. Would you like to see a live demonstration?",
                        "Great to hear! We have several case studies that show exactly how we've helped companies like yours."
                      ];

                      const exhibitorResponse = {
                        id: Date.now() + 1,
                        sender: 'exhibitor',
                        message: responses[Math.floor(Math.random() * responses.length)],
                        timestamp: new Date().toLocaleTimeString()
                      };

                      setChatMessages(prev => [...prev, exhibitorResponse]);
                    }, 1000);

                    setNewMessage('');
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 transition-colors"
              />
              <button
                onClick={() => {
                  if (newMessage.trim()) {
                    // Add user message
                    const userMessage = {
                      id: Date.now(),
                      sender: 'user',
                      message: newMessage,
                      timestamp: new Date().toLocaleTimeString()
                    };
                    setChatMessages(prev => [...prev, userMessage]);

                    // Simulate exhibitor response
                    setTimeout(() => {
                      const responses = [
                        "Thank you for your interest! Our team would be happy to provide more details about our services.",
                        "That's a great question! Let me connect you with our technical specialist.",
                        "I'd be happy to schedule a meeting for you. What time works best?",
                        "Our solution is perfect for your needs. Would you like a demo?",
                        "Great to hear! We have case studies that show exactly how we've helped similar companies."
                      ];

                      const exhibitorResponse = {
                        id: Date.now() + 1,
                        sender: 'exhibitor',
                        message: responses[Math.floor(Math.random() * responses.length)],
                        timestamp: new Date().toLocaleTimeString()
                      };

                      setChatMessages(prev => [...prev, exhibitorResponse]);
                    }, 1000);

                    setNewMessage('');
                  }
                }}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
              >
                Send
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  const meetingRequest = `I'd like to schedule a meeting to discuss our products and services in more detail. Please let me know your availability during the event.`;
                  setNewMessage(meetingRequest);
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm transition-colors"
              >
                Request Meeting
              </button>
              <button
                onClick={() => {
                  const demoRequest = `I'm interested in seeing a demonstration of your products. Could you show me how your solution works?`;
                  setNewMessage(demoRequest);
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm transition-colors"
              >
                Request Demo
              </button>
              <button
                onClick={() => {
                  const pricingRequest = `Could you provide information about your pricing and packages? I'm particularly interested in enterprise solutions.`;
                  setNewMessage(pricingRequest);
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm transition-colors"
              >
                Ask About Pricing
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Booth Details Modal */}
      {showBoothModal && selectedExhibitor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-4xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                {selectedExhibitor.logoUrl ? (
                  <img src={selectedExhibitor.logoUrl} alt={selectedExhibitor.name} className="w-16 h-16 object-contain rounded-lg" />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faBuilding} className="text-2xl text-white" />
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{selectedExhibitor.name}</h3>
                  <p className="text-white/70 text-lg">Booth {selectedExhibitor.boothId || 'TBA'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                      {selectedExhibitor.industry || 'Technology'}
                    </span>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                      {selectedExhibitor.size || 'Enterprise'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBoothModal(false);
                  setSelectedExhibitor(null);
                }}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Company Info */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-bold text-white mb-3">About the Company</h4>
                  <p className="text-white/80 leading-relaxed">
                    {selectedExhibitor.description || `${selectedExhibitor.name} is a leading company in the ${selectedExhibitor.industry || 'technology'} sector, showcasing innovative solutions and cutting-edge products at this year's event.`}
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-white mb-3">Contact Information</h4>
                  <div className="space-y-2 text-white/80">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-blue-400" />
                      <span>{selectedExhibitor.contactName || 'Company Representative'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faBuilding} className="w-4 h-4 text-blue-400" />
                      <span>{selectedExhibitor.contactTitle || 'Business Development Manager'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faMap} className="w-4 h-4 text-blue-400" />
                      <span>📍 Booth {selectedExhibitor.boothId || 'TBA'} - Main Exhibition Hall</span>
                    </div>
                  </div>
                </div>

                <div>

                </div>
              </div>

              {/* Right Column - Actions */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-white mb-4">Quick Actions</h4>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setShowChat(true);
                        setShowBoothModal(false);
                        // Initialize chat with welcome message
                        setChatMessages([{
                          id: Date.now(),
                          sender: 'exhibitor',
                          message: `👋 Hello! Welcome to ${selectedExhibitor.name} booth ${selectedExhibitor.boothId || 'TBA'}!\n\nI'm ${selectedExhibitor.contactName || 'the representative'} from ${selectedExhibitor.name}. How can I help you today?\n\nFeel free to ask about our products, services, or schedule a meeting!`,
                          timestamp: new Date().toLocaleTimeString()
                        }]);
                      }}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <FontAwesomeIcon icon={faComments} className="w-5 h-5" />
                      Start Chat
                    </button>

                    <button
                      onClick={() => {
                        // Add to connection requests
                        const newRequest = {
                          id: Date.now(),
                          name: selectedExhibitor.contactName || selectedExhibitor.name,
                          company: selectedExhibitor.name,
                          role: selectedExhibitor.contactTitle || 'Representative',
                          status: 'pending',
                          timestamp: new Date().toLocaleString()
                        };
                        setConnectionRequests(prev => [...prev, newRequest]);

                        alert(`✅ Connection Request Sent!\n\n🤝 Request sent to ${selectedExhibitor.contactName || 'the representative'} at ${selectedExhibitor.name}\n\nYou will be notified when they respond.`);
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <FontAwesomeIcon icon={faMessage} className="w-5 h-5" />
                      Request Meeting
                    </button>

                    <button
                      onClick={() => {
                        const newFavorites = new Set(favorites);
                        if (newFavorites.has(selectedExhibitor.id)) {
                          newFavorites.delete(selectedExhibitor.id);
                          alert(`❌ Removed ${selectedExhibitor.name} from favorites`);
                        } else {
                          newFavorites.add(selectedExhibitor.id);
                          alert(`❤️ Added ${selectedExhibitor.name} to favorites!`);
                        }
                        setFavorites(newFavorites);
                      }}
                      className={`w-full px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 ${
                        favorites.has(selectedExhibitor.id)
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <FontAwesomeIcon icon={faHeart} className="w-5 h-5" />
                      {favorites.has(selectedExhibitor.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-white mb-3">Booth Information</h4>
                  <div className="bg-white/5 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Location</span>
                      <span className="text-white font-semibold">Main Exhibition Hall</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Booth Number</span>
                      <span className="text-white font-semibold">{selectedExhibitor.boothId || 'TBA'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Hours</span>
                      <span className="text-white font-semibold">9:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Status</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">Open</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-white mb-3">Products & Services</h4>
                  <div className="space-y-2">
                    {selectedExhibitor.products?.slice(0, 3).map((product: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-white/80">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span>{product}</span>
                      </div>
                    )) || (
                      <div className="space-y-2 text-white/80">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>Innovative Solutions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>Technology Services</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>Consulting Services</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
