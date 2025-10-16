"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../firebaseConfig';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
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
  faGlobe,
  faVideo,
  faPodcast,
  faAward
} from '@fortawesome/free-solid-svg-icons';
import ProfileEditor from '../../../components/ProfileEditor';
import EnhancedBadgeGenerator from '../../../components/EnhancedBadgeGenerator';
import GlassCard from '../../../components/GlassCard';
import AuthSection from '../../AuthSection';

export default function SpeakerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appName, setAppName] = useState<string>('EventPlatform');
  const [logoUrl, setLogoUrl] = useState<string>('/logo.svg');
  const [logoSize, setLogoSize] = useState<number>(32);
  const [currentEventId, setCurrentEventId] = useState<string>('default');
  const [eventData, setEventData] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [activeDay, setActiveDay] = useState<string>('');

  // Speaker-specific state
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [showSpeakerProfile, setShowSpeakerProfile] = useState(false);
  const [showAudienceAnalytics, setShowAudienceAnalytics] = useState(false);
  const [showRecordingStudio, setShowRecordingStudio] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState<any[]>([]);
  const [audienceQuestions, setAudienceQuestions] = useState<any[]>([]);
  const [recordingStatus, setRecordingStatus] = useState<string>('offline');
  const [liveStreamUrl, setLiveStreamUrl] = useState<string>('');
  const [presentationFiles, setPresentationFiles] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionAttendees, setSessionAttendees] = useState<any[]>([]);
  const [speakerStats, setSpeakerStats] = useState<any>({
    totalSessions: 0,
    totalAttendees: 0,
    averageRating: 0,
    totalFeedback: 0
  });

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

  // Load sessions for this speaker
  useEffect(() => {
    if (!currentEventId || !user) return;

    const unsub = onSnapshot(
      query(
        collection(db, 'Events', currentEventId, 'Sessions'),
        where('speakerIds', 'array-contains', user.uid)
      ),
      (snap) => {
        const sessionsData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Session[];
        setSessions(sessionsData);

        // Set active day
        const days = [...new Set(sessionsData.map(s => s.day))].sort();
        if (days.length > 0 && !activeDay) {
          setActiveDay(days[0]);
        }
      }
    );

    return () => unsub();
  }, [currentEventId, user, activeDay]);

  // Load all speakers
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
          <div className="hidden lg:flex items-center gap-2 text-[#6c757d] text-sm">
            <FontAwesomeIcon icon={faBell} className="text-lg" />
            <span>Notifications</span>
          </div>
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
              Welcome, {profile.fullName || 'Speaker'}!
            </h1>
            <p className="text-white/70">Your speaker dashboard and session management</p>
          </div>

          {/* Quick Actions - Speaker Focused */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div
              className="cursor-pointer"
              onClick={() => setShowSessionManager(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faMicrophone} className="text-2xl text-blue-400 mb-2 group-hover:text-blue-300 transition-colors" />
                <h3 className="text-white font-semibold mb-1 group-hover:text-blue-300 transition-colors">Session Manager</h3>
                <p className="text-white/70 text-sm">Manage your sessions</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-blue-400">Click to manage →</span>
                </div>
              </GlassCard>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => setShowAudienceAnalytics(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faChartLine} className="text-2xl text-green-400 mb-2 group-hover:text-green-300 transition-colors" />
                <h3 className="text-white font-semibold mb-1 group-hover:text-green-300 transition-colors">Audience Analytics</h3>
                <p className="text-white/70 text-sm">View session data</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-green-400">Click to view →</span>
                </div>
              </GlassCard>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => setShowRecordingStudio(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faVideo} className="text-2xl text-purple-400 mb-2 group-hover:text-purple-300 transition-colors" />
                <h3 className="text-white font-semibold mb-1 group-hover:text-purple-300 transition-colors">Recording Studio</h3>
                <p className="text-white/70 text-sm">Live stream & record</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-purple-400">Click to access →</span>
                </div>
              </GlassCard>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => setShowSpeakerProfile(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faAward} className="text-2xl text-orange-400 mb-2 group-hover:text-orange-300 transition-colors" />
                <h3 className="text-white font-semibold mb-1 group-hover:text-orange-300 transition-colors">Speaker Profile</h3>
                <p className="text-white/70 text-sm">Update your profile</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-orange-400">Click to edit →</span>
                </div>
              </GlassCard>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Profile */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-blue-400" />
                My Speaker Profile
              </h2>
              <ProfileEditor />
            </GlassCard>

            {/* My Badge */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faIdBadge} className="text-orange-400" />
                Speaker Badge
              </h2>
              <div className="flex justify-center">
                <EnhancedBadgeGenerator
                  attendee={{
                    id: user.uid,
                    fullName: profile.fullName || profile.email || 'User',
                    email: profile.email || '',
                    company: profile.company || '',
                    position: profile.position || 'Speaker',
                    category: profile.category || 'Speaker'
                  }}
                />
              </div>
            </GlassCard>
          </div>

          {/* Speaker Statistics */}
          <GlassCard className="p-6 mt-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faChartLine} className="text-green-400" />
              Speaker Statistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/20 rounded-lg p-4 border border-blue-400/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faMicrophone} className="text-blue-400 text-sm" />
                  </div>
                  <h4 className="text-white font-semibold">Total Sessions</h4>
                </div>
                <p className="text-2xl font-bold text-white">{speakerStats.totalSessions}</p>
                <p className="text-white/70 text-sm">Scheduled sessions</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-500/20 rounded-lg p-4 border border-green-400/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faUsers} className="text-green-400 text-sm" />
                  </div>
                  <h4 className="text-white font-semibold">Total Attendees</h4>
                </div>
                <p className="text-2xl font-bold text-white">{speakerStats.totalAttendees}</p>
                <p className="text-white/70 text-sm">Across all sessions</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/20 rounded-lg p-4 border border-yellow-400/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faStar} className="text-yellow-400 text-sm" />
                  </div>
                  <h4 className="text-white font-semibold">Average Rating</h4>
                </div>
                <p className="text-2xl font-bold text-white">{speakerStats.averageRating.toFixed(1)}★</p>
                <p className="text-white/70 text-sm">Session feedback</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/20 rounded-lg p-4 border border-purple-400/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faComments} className="text-purple-400 text-sm" />
                  </div>
                  <h4 className="text-white font-semibold">Feedback Count</h4>
                </div>
                <p className="text-2xl font-bold text-white">{speakerStats.totalFeedback}</p>
                <p className="text-white/70 text-sm">Total reviews</p>
              </div>
            </div>
          </GlassCard>

          {/* Upcoming Sessions */}
          {sessions.length > 0 && (
            <GlassCard className="p-6 mt-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faCalendar} className="text-blue-400" />
                Upcoming Sessions
              </h2>
              <div className="space-y-3">
                {sessions.slice(0, 3).map((session: any) => (
                  <div key={session.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-semibold">{session.title}</h4>
                        <p className="text-white/70 text-sm">
                          {session.start} - {session.end} • {session.room}
                        </p>
                        <p className="text-white/60 text-xs">{session.day}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSession(session);
                          setShowSessionManager(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

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
                  <h4 className="text-white font-semibold mb-2">Speaker Quick Links</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowSessionManager(true)}
                      className="block text-blue-400 hover:text-blue-300 text-sm"
                    >
                      🎤 Manage My Sessions
                    </button>
                    <button
                      onClick={() => setShowAudienceAnalytics(true)}
                      className="block text-blue-400 hover:text-blue-300 text-sm"
                    >
                      📊 View Analytics
                    </button>
                    <button
                      onClick={() => setShowRecordingStudio(true)}
                      className="block text-blue-400 hover:text-blue-300 text-sm"
                    >
                      🎥 Access Recording Studio
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </main>

      {/* Session Manager Modal */}
      {showSessionManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-4xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">🎤 Session Manager</h3>
                <p className="text-white/60 text-sm">Manage your speaking sessions and materials</p>
              </div>
              <button
                onClick={() => setShowSessionManager(false)}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Session List */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Your Sessions</h4>
                {sessions.map((session: any) => (
                  <div key={session.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h5 className="text-white font-bold text-lg">{session.title}</h5>
                        <p className="text-white/70 text-sm">{session.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-white/60 text-sm">
                          <span>📅 {session.day}</span>
                          <span>🕐 {session.start} - {session.end}</span>
                          <span>📍 {session.room}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedSession(session)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
                        >
                          Manage
                        </button>
                      </div>
                    </div>

                    {/* Session Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <button
                        onClick={() => {
                          alert(`📊 Session Analytics for "${session.title}"\n\n👥 Expected Attendees: 150\n⭐ Average Rating: 4.8/5\n💬 Questions Asked: 12\n⏱️ Average Duration: 45 minutes\n\nDetailed analytics would show real-time attendance, engagement metrics, and feedback data.`);
                        }}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faChartLine} className="w-4 h-4" />
                        View Analytics
                      </button>

                      <button
                        onClick={() => {
                          alert(`📋 Session Materials for "${session.title}"\n\n📄 Presentation Slides: Available\n🎥 Recording: Not started\n📝 Speaker Notes: Available\n📊 Handouts: Available\n\nYou can upload additional materials or update existing ones.`);
                        }}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                        Materials
                      </button>

                      <button
                        onClick={() => {
                          alert(`🎥 Recording Studio for "${session.title}"\n\nStatus: Ready to record\nDuration: 45 minutes scheduled\nQuality: HD 1080p\nStorage: Cloud backup enabled\n\nYou can start recording, live stream, or upload pre-recorded content.`);
                        }}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faVideo} className="w-4 h-4" />
                        Recording
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Session Preparation Tools */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Session Preparation Tools</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <button
                      onClick={() => alert('📝 Speaker Notes\n\n• Introduction: Welcome attendees and introduce yourself\n• Main Content: Cover key topics systematically\n• Q&A: Allocate time for questions\n• Conclusion: Summarize key takeaways\n• Contact: Share your contact information\n\nNotes saved successfully!')}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <FontAwesomeIcon icon={faMicrophone} className="w-5 h-5" />
                      Speaker Notes
                    </button>

                    <button
                      onClick={() => alert('⏱️ Session Timer\n\n• Total Duration: 45 minutes\n• Introduction: 5 minutes\n• Main Content: 30 minutes\n• Q&A: 10 minutes\n• Buffer Time: 5 minutes\n\nTimer set! You will receive notifications at key intervals.')}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <FontAwesomeIcon icon={faClock} className="w-5 h-5" />
                      Session Timer
                    </button>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => alert('📊 Audience Engagement\n\n• Live Polls: Ready to launch\n• Q&A System: Active\n• Feedback Forms: Prepared\n• Social Media: Connected\n• Analytics Dashboard: Live\n\nAll engagement tools are ready for your session!')}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <FontAwesomeIcon icon={faUsers} className="w-5 h-5" />
                      Engagement Tools
                    </button>

                    <button
                      onClick={() => alert('🎥 Technical Setup\n\n• Microphone: ✅ Connected\n• Camera: ✅ Ready\n• Screen Sharing: ✅ Available\n• Internet: ✅ Stable\n• Backup: ✅ Prepared\n\nAll technical systems are operational!')}
                      className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <FontAwesomeIcon icon={faVideo} className="w-5 h-5" />
                      Technical Check
                    </button>
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
