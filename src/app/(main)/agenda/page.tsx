"use client";
import React, { useState, useEffect, useMemo } from "react";
import { db, auth } from "../../../firebaseConfig";
import AuthForm from "../../../components/AuthForm";
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc, setDoc, query, where, orderBy, limit, onSnapshot, addDoc, deleteDoc, increment } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendar,
  faPlus,
  faEdit,
  faTrash,
  faClock,
  faMapMarkerAlt,
  faUser,
  faUsers,
  faSave,
  faTimes,
  faEye,
  faDownload,
  faUpload,
  faCog,
  faBars,
  faSignOutAlt,
  faBell,
  faInfoCircle,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faArrowRight,
  faArrowLeft,
  faSearch,
  faFilter,
  faSort,
  faSortUp,
  faSortDown,
  faPlay,
  faPause,
  faStop,
  faRefresh,
  faLightbulb,
  faMicrophone,
  faPresentation,
  faVideo,
  faCoffee,
  faUtensils,
  faGlassCheers,
  faHandshake,
  faAward,
  faTrophy,
  faStar,
  faHeart,
  faThumbsUp,
  faComments,
  faQuestion,
  faExclamationTriangle,
  faCheck,
  faBan,
  faFlag,
  faWarning,
  faInfo,
  faBug,
  faWrench,
  faTools,
  faHammer,
  faScrewdriver
} from '@fortawesome/free-solid-svg-icons';

interface AgendaSession {
  id: string;
  title: string;
  description: string;
  speakerId: string;
  speakerName: string;
  speakerTitle: string;
  speakerCompany: string;
  startTime: string;
  endTime: string;
  date: string;
  room: string;
  sessionType: 'keynote' | 'panel' | 'workshop' | 'networking' | 'break' | 'meal' | 'presentation' | 'qanda';
  capacity: number;
  registeredCount: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  tags: string[];
  materials?: string[];
  recordingUrl?: string;
  streamUrl?: string;
  isVirtual: boolean;
  allowRecording: boolean;
  requireRegistration: boolean;
  createdAt: any;
  updatedAt: any;
}

interface Speaker {
  id: string;
  userId: string;
  eventId: string;
  fullName: string;
  title: string;
  company: string;
  bio: string;
  photoUrl?: string;
  expertise: string[];
  linkedin?: string;
  twitter?: string;
  website?: string;
  sessionIds: string[];
  status: 'confirmed' | 'pending' | 'declined';
  createdAt: any;
}

interface AgendaDay {
  date: string;
  sessions: AgendaSession[];
  totalSessions: number;
  startTime: string;
  endTime: string;
}

export default function AgendaManager() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentEventId, setCurrentEventId] = useState<string>('default');
  const [isClient, setIsClient] = useState(false);

  // Agenda data
  const [sessions, setSessions] = useState<AgendaSession[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'sessions' | 'speakers' | 'calendar' | 'settings'>('sessions');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [editingSession, setEditingSession] = useState<AgendaSession | null>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [sessionForm, setSessionForm] = useState({
    title: '',
    description: '',
    speakerId: '',
    startTime: '',
    endTime: '',
    date: '',
    room: '',
    sessionType: 'presentation' as AgendaSession['sessionType'],
    capacity: 100,
    tags: '',
    isVirtual: false,
    allowRecording: true,
    requireRegistration: false
  });

  const [speakerForm, setSpeakerForm] = useState({
    userId: '',
    fullName: '',
    title: '',
    company: '',
    bio: '',
    expertise: '',
    linkedin: '',
    twitter: '',
    website: ''
  });

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'Users', u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.category === 'Organizer' || data.category === 'Administrator' || data.category === 'Admin') {
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
  useEffect(() => {
    if (!currentEventId) return;

    // Load sessions
    const sessionsUnsub = onSnapshot(
      query(collection(db, 'Sessions'), orderBy('date', 'asc'), orderBy('startTime', 'asc')),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AgendaSession));
        setSessions(data);
      }
    );

    // Load speakers
    const speakersUnsub = onSnapshot(
      query(collection(db, 'Speakers'), orderBy('createdAt', 'desc')),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Speaker));
        setSpeakers(data);
      }
    );

    // Load users for speaker assignment
    const usersUnsub = onSnapshot(collection(db, 'Users'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(data);
    });

    return () => {
      sessionsUnsub();
      speakersUnsub();
      usersUnsub();
    };
  }, [currentEventId]);

  // Load global settings
  useEffect(() => {
    async function loadGlobalSettings() {
      const sDoc = await getDoc(doc(db, 'AppSettings', 'global'));
      if (sDoc.exists()) {
        const s = sDoc.data() as any;
        if (s.eventId) {
          setCurrentEventId(s.eventId);
        }
      }
    }
    loadGlobalSettings();
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const matchesSearch = !searchQuery ||
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.speakerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDate = !filterDate || session.date === filterDate;
      const matchesRoom = !filterRoom || session.room === filterRoom;
      const matchesType = !filterType || session.sessionType === filterType;

      return matchesSearch && matchesDate && matchesRoom && matchesType;
    });
  }, [sessions, searchQuery, filterDate, filterRoom, filterType]);

  // Group sessions by day
  const sessionsByDay = useMemo(() => {
    const grouped: { [key: string]: AgendaSession[] } = {};
    filteredSessions.forEach(session => {
      if (!grouped[session.date]) {
        grouped[session.date] = [];
      }
      grouped[session.date].push(session);
    });

    // Sort sessions within each day by start time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return grouped;
  }, [filteredSessions]);

  // Get unique rooms and dates for filters
  const uniqueRooms = useMemo(() => {
    return [...new Set(sessions.map(s => s.room).filter(Boolean))].sort();
  }, [sessions]);

  const uniqueDates = useMemo(() => {
    return [...new Set(sessions.map(s => s.date).filter(Boolean))].sort();
  }, [sessions]);

  // Handle session form submission
  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sessionData = {
        ...sessionForm,
        tags: sessionForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        registeredCount: 0,
        status: 'scheduled' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (editingSession) {
        await updateDoc(doc(db, 'Sessions', editingSession.id), sessionData);
      } else {
        await addDoc(collection(db, 'Sessions'), sessionData);
      }

      setShowSessionModal(false);
      resetSessionForm();
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Error saving session. Please try again.');
    }
  };

  // Handle speaker form submission
  const handleSpeakerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const speakerData = {
        ...speakerForm,
        eventId: currentEventId,
        expertise: speakerForm.expertise.split(',').map(exp => exp.trim()).filter(Boolean),
        sessionIds: [],
        status: 'pending' as const,
        createdAt: serverTimestamp()
      };

      if (editingSpeaker) {
        await updateDoc(doc(db, 'Speakers', editingSpeaker.id), speakerData);
      } else {
        await addDoc(collection(db, 'Speakers'), speakerData);
      }

      setShowSpeakerModal(false);
      resetSpeakerForm();
    } catch (error) {
      console.error('Error saving speaker:', error);
      alert('Error saving speaker. Please try again.');
    }
  };

  // Reset forms
  const resetSessionForm = () => {
    setSessionForm({
      title: '',
      description: '',
      speakerId: '',
      startTime: '',
      endTime: '',
      date: '',
      room: '',
      sessionType: 'presentation',
      capacity: 100,
      tags: '',
      isVirtual: false,
      allowRecording: true,
      requireRegistration: false
    });
    setEditingSession(null);
  };

  const resetSpeakerForm = () => {
    setSpeakerForm({
      userId: '',
      fullName: '',
      title: '',
      company: '',
      bio: '',
      expertise: '',
      linkedin: '',
      twitter: '',
      website: ''
    });
    setEditingSpeaker(null);
  };

  // Edit session
  const editSession = (session: AgendaSession) => {
    setEditingSession(session);
    setSessionForm({
      title: session.title,
      description: session.description,
      speakerId: session.speakerId,
      startTime: session.startTime,
      endTime: session.endTime,
      date: session.date,
      room: session.room,
      sessionType: session.sessionType,
      capacity: session.capacity,
      tags: session.tags.join(', '),
      isVirtual: session.isVirtual,
      allowRecording: session.allowRecording,
      requireRegistration: session.requireRegistration
    });
    setShowSessionModal(true);
  };

  // Edit speaker
  const editSpeaker = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
    setSpeakerForm({
      userId: speaker.userId,
      fullName: speaker.fullName,
      title: speaker.title,
      company: speaker.company,
      bio: speaker.bio,
      expertise: speaker.expertise.join(', '),
      linkedin: speaker.linkedin || '',
      twitter: speaker.twitter || '',
      website: speaker.website || ''
    });
    setShowSpeakerModal(true);
  };

  // Delete session
  const deleteSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteDoc(doc(db, 'Sessions', sessionId));
      } catch (error) {
        console.error('Error deleting session:', error);
        alert('Error deleting session. Please try again.');
      }
    }
  };

  // Delete speaker
  const deleteSpeaker = async (speakerId: string) => {
    if (confirm('Are you sure you want to delete this speaker?')) {
      try {
        await deleteDoc(doc(db, 'Speakers', speakerId));
      } catch (error) {
        console.error('Error deleting speaker:', error);
        alert('Error deleting speaker. Please try again.');
      }
    }
  };

  // Get session type icon
  const getSessionTypeIcon = (type: AgendaSession['sessionType']) => {
    switch (type) {
      case 'keynote': return faMicrophone;
      case 'panel': return faUsers;
      case 'workshop': return faLightbulb;
      case 'networking': return faHandshake;
      case 'break': return faCoffee;
      case 'meal': return faUtensils;
      case 'presentation': return faPresentation;
      case 'qanda': return faQuestion;
      default: return faCalendar;
    }
  };

  // Get session type color
  const getSessionTypeColor = (type: AgendaSession['sessionType']) => {
    switch (type) {
      case 'keynote': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'panel': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'workshop': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'networking': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'break': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'meal': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'presentation': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'qanda': return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white">Loading Agenda Manager...</div>
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

  if (!userProfile || (userProfile.category !== 'Organizer' && userProfile.category !== 'Administrator' && userProfile.category !== 'Admin')) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <FontAwesomeIcon icon={faTimesCircle} className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>Only organizers and administrators can access the agenda manager.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCalendar} className="text-slate-400 text-3xl" />
            <div>
              <h1 className="text-xl font-bold text-white">Agenda Manager</h1>
              <p className="text-slate-200 text-sm">Create and manage conference agenda and speaker assignments</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => auth.signOut()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-600/20 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm">Total Sessions</p>
                <p className="text-2xl font-bold text-white">{sessions.length}</p>
              </div>
              <FontAwesomeIcon icon={faCalendar} className="text-blue-400 text-2xl" />
            </div>
          </div>

          <div className="bg-green-600/20 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm">Speakers</p>
                <p className="text-2xl font-bold text-white">{speakers.length}</p>
              </div>
              <FontAwesomeIcon icon={faUser} className="text-green-400 text-2xl" />
            </div>
          </div>

          <div className="bg-purple-600/20 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm">Live Sessions</p>
                <p className="text-2xl font-bold text-white">
                  {sessions.filter(s => s.status === 'live').length}
                </p>
              </div>
              <FontAwesomeIcon icon={faPlay} className="text-purple-400 text-2xl" />
            </div>
          </div>

          <div className="bg-yellow-600/20 rounded-xl p-4 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-300 text-sm">Rooms</p>
                <p className="text-2xl font-bold text-white">{uniqueRooms.length}</p>
              </div>
              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-yellow-400 text-2xl" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/5 rounded-xl p-2 mb-6 border border-white/10">
          <div className="flex gap-2">
            {[
              { id: 'sessions', label: 'Sessions', icon: faCalendar },
              { id: 'speakers', label: 'Speakers', icon: faUser },
              { id: 'calendar', label: 'Calendar View', icon: faClock },
              { id: 'settings', label: 'Settings', icon: faCog }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Search sessions and speakers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Rooms</option>
                {uniqueRooms.map(room => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="keynote">Keynote</option>
                <option value="panel">Panel</option>
                <option value="workshop">Workshop</option>
                <option value="presentation">Presentation</option>
                <option value="networking">Networking</option>
                <option value="break">Break</option>
                <option value="meal">Meal</option>
                <option value="qanda">Q&A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            {/* Sessions Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Conference Sessions</h3>
              <button
                onClick={() => setShowSessionModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                Add Session
              </button>
            </div>

            {/* Sessions List */}
            <div className="space-y-4">
              {Object.entries(sessionsByDay).map(([date, daySessions]) => (
                <div key={date} className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faCalendar} className="w-4 h-4" />
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {daySessions.map((session) => (
                      <div key={session.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h5 className="text-white font-semibold truncate">{session.title}</h5>
                            <p className="text-gray-400 text-sm truncate">{session.speakerName}</p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => editSession(session)}
                              className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                              title="Edit session"
                            >
                              <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteSession(session.id)}
                              className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                              title="Delete session"
                            >
                              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faClock} className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-300 text-sm">
                              {session.startTime} - {session.endTime}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-300 text-sm">{session.room}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-1 rounded-full text-xs border ${getSessionTypeColor(session.sessionType)}`}>
                              {session.sessionType}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              session.status === 'live' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                              session.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                              session.status === 'cancelled' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                              'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                            }`}>
                              {session.status}
                            </span>
                          </div>

                          {session.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {session.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full">
                                  {tag}
                                </span>
                              ))}
                              {session.tags.length > 3 && (
                                <span className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full">
                                  +{session.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(sessionsByDay).length === 0 && (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faCalendar} className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Sessions Found</h3>
                <p className="text-gray-400">Create your first conference session to get started.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'speakers' && (
          <div className="space-y-6">
            {/* Speakers Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Conference Speakers</h3>
              <button
                onClick={() => setShowSpeakerModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                Add Speaker
              </button>
            </div>

            {/* Speakers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {speakers.map((speaker) => (
                <div key={speaker.id} className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                      {speaker.photoUrl ? (
                        <img
                          src={speaker.photoUrl}
                          alt={speaker.fullName}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <FontAwesomeIcon icon={faUser} className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold truncate">{speaker.fullName}</h4>
                      <p className="text-blue-300 text-sm truncate">{speaker.title}</p>
                      <p className="text-gray-400 text-sm truncate">{speaker.company}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editSpeaker(speaker)}
                        className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                        title="Edit speaker"
                      >
                        <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteSpeaker(speaker.id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                        title="Delete speaker"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">{speaker.bio}</p>

                  {speaker.expertise.length > 0 && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-xs mb-2">Expertise:</p>
                      <div className="flex flex-wrap gap-1">
                        {speaker.expertise.slice(0, 3).map((exp, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                            {exp}
                          </span>
                        ))}
                        {speaker.expertise.length > 3 && (
                          <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded-full">
                            +{speaker.expertise.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      speaker.status === 'confirmed' ? 'bg-green-500/20 text-green-300' :
                      speaker.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {speaker.status}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {speaker.sessionIds?.length || 0} sessions
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {speakers.length === 0 && (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faUser} className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Speakers Found</h3>
                <p className="text-gray-400">Add speakers to assign them to conference sessions.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white">Calendar View</h3>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="text-center py-12 text-gray-400">
                <FontAwesomeIcon icon={faCalendar} className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Calendar view coming soon...</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white">Agenda Settings</h3>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="text-center py-12 text-gray-400">
                <FontAwesomeIcon icon={faCog} className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Settings panel coming soon...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingSession ? 'Edit Session' : 'Add New Session'}
                </h3>
                <button
                  onClick={() => {
                    setShowSessionModal(false);
                    resetSessionForm();
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSessionSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Session Title *
                    </label>
                    <input
                      type="text"
                      value={sessionForm.title}
                      onChange={(e) => setSessionForm({...sessionForm, title: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      value={sessionForm.description}
                      onChange={(e) => setSessionForm({...sessionForm, description: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Speaker
                    </label>
                    <select
                      value={sessionForm.speakerId}
                      onChange={(e) => setSessionForm({...sessionForm, speakerId: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Speaker</option>
                      {speakers.map(speaker => (
                        <option key={speaker.id} value={speaker.id}>
                          {speaker.fullName} - {speaker.company}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Session Type
                    </label>
                    <select
                      value={sessionForm.sessionType}
                      onChange={(e) => setSessionForm({...sessionForm, sessionType: e.target.value as any})}
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      <option value="keynote">Keynote</option>
                      <option value="panel">Panel Discussion</option>
                      <option value="workshop">Workshop</option>
                      <option value="presentation">Presentation</option>
                      <option value="networking">Networking</option>
                      <option value="break">Break</option>
                      <option value="meal">Meal</option>
                      <option value="qanda">Q&A Session</option>
                    </select>
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={sessionForm.date}
                      onChange={(e) => setSessionForm({...sessionForm, date: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={sessionForm.startTime}
                      onChange={(e) => setSessionForm({...sessionForm, startTime: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={sessionForm.endTime}
                      onChange={(e) => setSessionForm({...sessionForm, endTime: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Location and Capacity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Room/Location *
                    </label>
                    <input
                      type="text"
                      value={sessionForm.room}
                      onChange={(e) => setSessionForm({...sessionForm, room: e.target.value})}
                      placeholder="e.g., Main Hall, Room A, Virtual"
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Capacity
                    </label>
                    <input
                      type="number"
                      value={sessionForm.capacity}
                      onChange={(e) => setSessionForm({...sessionForm, capacity: parseInt(e.target.value) || 0})}
                      min="1"
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tags and Options */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={sessionForm.tags}
                      onChange={(e) => setSessionForm({...sessionForm, tags: e.target.value})}
                      placeholder="e.g., AI, Technology, Innovation"
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-center gap-2 text-gray-300">
                      <input
                        type="checkbox"
                        checked={sessionForm.isVirtual}
                        onChange={(e) => setSessionForm({...sessionForm, isVirtual: e.target.checked})}
                        className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                      />
                      Virtual Session
                    </label>

                    <label className="flex items-center gap-2 text-gray-300">
                      <input
                        type="checkbox"
                        checked={sessionForm.allowRecording}
                        onChange={(e) => setSessionForm({...sessionForm, allowRecording: e.target.checked})}
                        className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                      />
                      Allow Recording
                    </label>

                    <label className="flex items-center gap-2 text-gray-300">
                      <input
                        type="checkbox"
                        checked={sessionForm.requireRegistration}
                        onChange={(e) => setSessionForm({...sessionForm, requireRegistration: e.target.checked})}
                        className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                      />
                      Require Registration
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faSave} className="w-4 h-4" />
                    {editingSession ? 'Update Session' : 'Create Session'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSessionModal(false);
                      resetSessionForm();
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Speaker Modal */}
      {showSpeakerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingSpeaker ? 'Edit Speaker' : 'Add New Speaker'}
                </h3>
                <button
                  onClick={() => {
                    setShowSpeakerModal(false);
                    resetSpeakerForm();
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSpeakerSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={speakerForm.fullName}
                      onChange={(e) => setSpeakerForm({...speakerForm, fullName: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      value={speakerForm.title}
                      onChange={(e) => setSpeakerForm({...speakerForm, title: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Company *
                    </label>
                    <input
                      type="text"
                      value={speakerForm.company}
                      onChange={(e) => setSpeakerForm({...speakerForm, company: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Biography *
                  </label>
                  <textarea
                    value={speakerForm.bio}
                    onChange={(e) => setSpeakerForm({...speakerForm, bio: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Expertise */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Areas of Expertise (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={speakerForm.expertise}
                    onChange={(e) => setSpeakerForm({...speakerForm, expertise: e.target.value})}
                    placeholder="e.g., Artificial Intelligence, Machine Learning, Data Science"
                    className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Social Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      value={speakerForm.linkedin}
                      onChange={(e) => setSpeakerForm({...speakerForm, linkedin: e.target.value})}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Twitter
                    </label>
                    <input
                      type="text"
                      value={speakerForm.twitter}
                      onChange={(e) => setSpeakerForm({...speakerForm, twitter: e.target.value})}
                      placeholder="@username"
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={speakerForm.website}
                      onChange={(e) => setSpeakerForm({...speakerForm, website: e.target.value})}
                      placeholder="https://website.com"
                      className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faSave} className="w-4 h-4" />
                    {editingSpeaker ? 'Update Speaker' : 'Add Speaker'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSpeakerModal(false);
                      resetSpeakerForm();
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
