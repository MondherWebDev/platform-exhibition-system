"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../../firebaseConfig';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCalendar,
  faClock,
  faMapMarkerAlt,
  faUsers,
  faFilter,
  faSearch,
  faStar,
  faEye
} from '@fortawesome/free-solid-svg-icons';
import GlassCard from '../../../../components/GlassCard';

interface Session {
  id: string;
  title: string;
  day: string;
  start: string;
  end: string;
  room?: string;
  speakerIds?: string[];
  description?: string;
  capacity?: number;
  registered?: number;
}

export default function ExhibitorSessionsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('day');
  const [selectedDay, setSelectedDay] = useState<string>('');

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        router.replace('/');
        return;
      }
      setUser(u);

      const snap = await getDoc(doc(db, 'Users', u.uid));
      const data = snap.exists() ? snap.data() : null;

      if (!data || (data as any).category !== 'Exhibitor') {
        router.replace('/dashboard');
        return;
      }

      setProfile(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Load sessions
  useEffect(() => {
    if (!user) return;

    // Get current event ID from app settings
    const loadSessions = async () => {
      const appSettingsSnap = await getDoc(doc(db, 'AppSettings', 'global'));
      if (appSettingsSnap.exists()) {
        const appData = appSettingsSnap.data();
        const currentEventId = appData.eventId || 'default';

        const unsub = onSnapshot(
          query(collection(db, 'Events', currentEventId, 'Sessions'), orderBy('day'), orderBy('start')),
          (snap) => {
            const sessionsData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Session[];
            setSessions(sessionsData);
            setFilteredSessions(sessionsData);

            // Set selected day to first available day
            const days = [...new Set(sessionsData.map(s => s.day))].sort();
            if (days.length > 0 && !selectedDay) {
              setSelectedDay(days[0]);
            }
          }
        );

        return () => unsub();
      }
    };

    loadSessions();
  }, [user, selectedDay]);

  // Filter and search sessions
  useEffect(() => {
    let filtered = sessions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(session =>
        session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.room?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Day filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(session => session.day === filterBy);
    }

    // Sort
    if (sortBy === 'day') {
      filtered.sort((a, b) => {
        if (a.day !== b.day) return a.day.localeCompare(b.day);
        return a.start.localeCompare(b.start);
      });
    } else if (sortBy === 'time') {
      filtered.sort((a, b) => a.start.localeCompare(b.start));
    } else if (sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    setFilteredSessions(filtered);
  }, [sessions, searchTerm, filterBy, sortBy]);

  const getDays = () => {
    return [...new Set(sessions.map(s => s.day))].sort();
  };

  const getSessionsByDay = (day: string) => {
    return sessions.filter(s => s.day === day);
  };

  const formatTime = (time: string) => {
    // Assuming time is in 24h format like "09:00" or "14:30"
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#181f2a] flex items-center justify-center">
        <div className="text-white/80">Loading sessions...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-[#181f2a] flex items-center justify-center">
        <div className="text-white/80">Please sign in to continue.</div>
      </div>
    );
  }

  const days = getDays();

  return (
    <div className="min-h-screen bg-[#181f2a]">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#1c2331] to-[#232b3e] border-b border-[#0d6efd]/20 shadow-lg flex-shrink-0 h-14 sm:h-16">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => router.push('/dashboard/exhibitor')}
            className="text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-white text-lg sm:text-xl font-bold tracking-tight">Event Sessions</span>
            <div className="w-1 h-4 sm:h-6 bg-[#0d6efd]/50 rounded-full hidden sm:block"></div>
            <span className="text-[#6c757d] text-xs sm:text-sm font-medium hidden lg:block">
              {profile?.fullName || user.email}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center gap-2 text-[#6c757d] text-sm">
            <FontAwesomeIcon icon={faCalendar} className="text-lg" />
            <span>{sessions.length} Total Sessions</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-6 overflow-auto bg-[#0f1419]">
        <div className="w-full max-w-7xl mx-auto">
          {/* Stats Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <GlassCard className="p-4 text-center">
              <FontAwesomeIcon icon={faCalendar} className="text-2xl text-blue-400 mb-2" />
              <h3 className="text-white font-semibold mb-1">Total Sessions</h3>
              <p className="text-2xl font-bold text-white">{sessions.length}</p>
              <p className="text-white/70 text-sm">All days</p>
            </GlassCard>

            <GlassCard className="p-4 text-center">
              <FontAwesomeIcon icon={faClock} className="text-2xl text-green-400 mb-2" />
              <h3 className="text-white font-semibold mb-1">Days</h3>
              <p className="text-2xl font-bold text-white">{days.length}</p>
              <p className="text-white/70 text-sm">Event days</p>
            </GlassCard>

            <GlassCard className="p-4 text-center">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-2xl text-purple-400 mb-2" />
              <h3 className="text-white font-semibold mb-1">Rooms</h3>
              <p className="text-2xl font-bold text-white">
                {[...new Set(sessions.map(s => s.room).filter(Boolean))].length}
              </p>
              <p className="text-white/70 text-sm">Unique venues</p>
            </GlassCard>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search sessions by title, room, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-colors"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-colors"
              >
                <option value="all">All Days</option>
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-colors"
              >
                <option value="day">Sort by Day</option>
                <option value="time">Sort by Time</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
          </div>

          {/* Day Tabs */}
          {days.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    selectedDay === day
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}

          {/* Sessions List */}
          <GlassCard className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FontAwesomeIcon icon={faCalendar} className="text-blue-400" />
                {selectedDay ? `${selectedDay} Sessions` : 'All Sessions'} ({filteredSessions.length})
              </h2>
            </div>

            {filteredSessions.length > 0 ? (
              <div className="space-y-4">
                {filteredSessions.map((session) => (
                  <div key={session.id} className="bg-white/5 rounded-lg p-6 border border-white/10 hover:border-white/20 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <FontAwesomeIcon icon={faCalendar} className="text-white text-lg" />
                          </div>
                          <div>
                            <h3 className="text-white font-bold text-lg">{session.title}</h3>
                            <div className="flex items-center gap-4 text-white/70 text-sm mt-1">
                              <span className="flex items-center gap-1">
                                <FontAwesomeIcon icon={faClock} className="text-green-400" />
                                {formatTime(session.start)} - {formatTime(session.end)}
                              </span>
                              {session.room && (
                                <span className="flex items-center gap-1">
                                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-purple-400" />
                                  {session.room}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {session.description && (
                          <p className="text-white/80 text-sm mb-4 leading-relaxed">
                            {session.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-white/60 text-sm">
                          <span className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faUsers} className="text-blue-400" />
                            Day: {session.day}
                          </span>
                          {session.capacity && (
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faUsers} className="text-green-400" />
                              Capacity: {session.capacity}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2">
                          <FontAwesomeIcon icon={faEye} />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faCalendar} className="text-6xl text-white/20 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Sessions Found</h3>
                <p className="text-white/70 mb-4">
                  {searchTerm || filterBy !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'No sessions available for the selected day.'}
                </p>
                {!searchTerm && filterBy === 'all' && (
                  <button
                    onClick={() => router.push('/dashboard/exhibitor')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
                  >
                    Back to Dashboard
                  </button>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
