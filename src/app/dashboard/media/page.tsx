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
  faCamera,
  faNewspaper,
  faBroadcastTower,
  faRss
} from '@fortawesome/free-solid-svg-icons';
import ProfileEditor from '../../../components/ProfileEditor';
import EnhancedBadgeGenerator from '../../../components/EnhancedBadgeGenerator';
import GlassCard from '../../../components/GlassCard';
import AuthSection from '../../AuthSection';

export default function MediaDashboard() {
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

  // Media-specific state
  const [showPressCenter, setShowPressCenter] = useState(false);
  const [showMediaKit, setShowMediaKit] = useState(false);
  const [showInterviewScheduler, setShowInterviewScheduler] = useState(false);
  const [showLiveFeed, setShowLiveFeed] = useState(false);
  const [pressReleases, setPressReleases] = useState<any[]>([]);
  const [mediaContacts, setMediaContacts] = useState<any[]>([]);
  const [interviewRequests, setInterviewRequests] = useState<any[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<any[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<any>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [interviewNotes, setInterviewNotes] = useState<string>('');

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
              Welcome, {profile.fullName || 'Media'}!
            </h1>
            <p className="text-white/70">Your media center and press dashboard</p>
          </div>

          {/* Quick Actions - Media Focused */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div
              className="cursor-pointer"
              onClick={() => setShowPressCenter(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faNewspaper} className="text-2xl text-blue-400 mb-2 group-hover:text-blue-300 transition-colors" />
                <h3 className="text-white font-semibold mb-1 group-hover:text-blue-300 transition-colors">Press Center</h3>
                <p className="text-white/70 text-sm">Press releases & news</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-blue-400">Click to access →</span>
                </div>
              </GlassCard>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => setShowInterviewScheduler(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faMicrophone} className="text-2xl text-green-400 mb-2 group-hover:text-green-300 transition-colors" />
                <h3 className="text-white font-semibold mb-1 group-hover:text-green-300 transition-colors">Interview Scheduler</h3>
                <p className="text-white/70 text-sm">Book speaker interviews</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-green-400">Click to schedule →</span>
                </div>
              </GlassCard>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => setShowMediaKit(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faDownload} className="text-2xl text-purple-400 mb-2 group-hover:text-purple-300 transition-colors" />
                <h3 className="text-white font-semibold mb-1 group-hover:text-purple-300 transition-colors">Media Kit</h3>
                <p className="text-white/70 text-sm">Download assets</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-purple-400">Click to download →</span>
                </div>
              </GlassCard>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => setShowLiveFeed(true)}
            >
              <GlassCard className="p-4 text-center hover:bg-white/5 transition-all duration-300 transform hover:scale-105 group">
                <FontAwesomeIcon icon={faBroadcastTower} className="text-2xl text-orange-400 mb-2 group-hover:text-orange-300 transition-colors" />
                <h3 className="text-white font-semibold mb-1 group-hover:text-orange-300 transition-colors">Live Feed</h3>
                <p className="text-white/70 text-sm">Real-time updates</p>
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-orange-400">Click to view →</span>
                </div>
              </GlassCard>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Profile */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-blue-400" />
                My Media Profile
              </h2>
              <ProfileEditor />
            </GlassCard>

            {/* My Badge */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faIdBadge} className="text-orange-400" />
                Media Badge
              </h2>
              <div className="flex justify-center">
                <EnhancedBadgeGenerator
                  attendee={{
                    id: user.uid,
                    fullName: profile.fullName || profile.email || 'User',
                    email: profile.email || '',
                    company: profile.company || '',
                    position: profile.position || 'Media',
                    category: profile.category || 'Media'
                  }}
                />
              </div>
            </GlassCard>
          </div>

          {/* Media Statistics */}
          <GlassCard className="p-6 mt-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faChartLine} className="text-green-400" />
              Media Statistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/20 rounded-lg p-4 border border-blue-400/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faNewspaper} className="text-blue-400 text-sm" />
                  </div>
                  <h4 className="text-white font-semibold">Press Releases</h4>
                </div>
                <p className="text-2xl font-bold text-white">{pressReleases.length}</p>
                <p className="text-white/70 text-sm">Available for download</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-500/20 rounded-lg p-4 border border-green-400/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faMicrophone} className="text-green-400 text-sm" />
                  </div>
                  <h4 className="text-white font-semibold">Interviews Scheduled</h4>
                </div>
                <p className="text-2xl font-bold text-white">{interviewRequests.length}</p>
                <p className="text-white/70 text-sm">Confirmed interviews</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/20 rounded-lg p-4 border border-purple-400/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faUsers} className="text-purple-400 text-sm" />
                  </div>
                  <h4 className="text-white font-semibold">Media Contacts</h4>
                </div>
                <p className="text-2xl font-bold text-white">{mediaContacts.length}</p>
                <p className="text-white/70 text-sm">In media directory</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/20 rounded-lg p-4 border border-orange-400/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faRss} className="text-orange-400 text-sm" />
                  </div>
                  <h4 className="text-white font-semibold">Live Updates</h4>
                </div>
                <p className="text-2xl font-bold text-white">{liveUpdates.length}</p>
                <p className="text-white/70 text-sm">Recent news items</p>
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
                  <h4 className="text-white font-semibold mb-2">Media Quick Links</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowPressCenter(true)}
                      className="block text-blue-400 hover:text-blue-300 text-sm"
                    >
                      📰 Access Press Center
                    </button>
                    <button
                      onClick={() => setShowInterviewScheduler(true)}
                      className="block text-blue-400 hover:text-blue-300 text-sm"
                    >
                      🎤 Schedule Interviews
                    </button>
                    <button
                      onClick={() => setShowMediaKit(true)}
                      className="block text-blue-400 hover:text-blue-300 text-sm"
                    >
                      📥 Download Media Kit
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </main>

      {/* Press Center Modal */}
      {showPressCenter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-4xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">📰 Press Center</h3>
                <p className="text-white/60 text-sm">Official press releases and media resources</p>
              </div>
              <button
                onClick={() => setShowPressCenter(false)}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Press Releases */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Latest Press Releases</h4>
                {pressReleases.length > 0 ? (
                  pressReleases.map((release: any, index: number) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="text-white font-bold text-lg">{release.title}</h5>
                          <p className="text-white/70 text-sm">{release.date}</p>
                        </div>
                        <button
                          onClick={() => alert(`📄 Press Release: ${release.title}\n\n${release.content}\n\n📅 Published: ${release.date}\n🏢 Source: ${release.source || 'Event Management'}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
                        >
                          Read More
                        </button>
                      </div>
                      <p className="text-white/80 text-sm line-clamp-2">{release.summary}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-white/70">
                    <FontAwesomeIcon icon={faNewspaper} className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h4 className="text-white font-semibold mb-2">No Press Releases Available</h4>
                    <p className="text-sm">Check back later for official announcements.</p>
                  </div>
                )}
              </div>

              {/* Media Resources */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Media Resources</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => alert('📸 High-Resolution Photos\n\n• Event logos and branding\n• Speaker headshots\n• Venue photos\n• Previous event highlights\n\nDownload pack includes 50+ professional images.')}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faCamera} className="w-5 h-5" />
                    Photo Gallery
                  </button>

                  <button
                    onClick={() => alert('🎥 Video Content\n\n• Event promotional videos\n• Speaker introduction clips\n• Previous event highlights\n• B-roll footage\n\nAvailable in multiple formats and resolutions.')}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faVideo} className="w-5 h-5" />
                    Video Library
                  </button>

                  <button
                    onClick={() => alert('📊 Event Statistics\n\n• Attendance figures\n• Speaker demographics\n• Industry breakdown\n• Geographic distribution\n\nComprehensive data for your coverage.')}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faChartLine} className="w-5 h-5" />
                    Event Statistics
                  </button>

                  <button
                    onClick={() => alert('🎙️ Speaker Interviews\n\n• Pre-recorded interviews\n• Sound bites\n• Expert commentary\n• Background information\n\nProfessional audio content for your stories.')}
                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faMicrophone} className="w-5 h-5" />
                    Audio Content
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
