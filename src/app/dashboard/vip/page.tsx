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
  faRss,
  faCrown,
  faDiamond,
  faGem,
  faStarHalfAlt
} from '@fortawesome/free-solid-svg-icons';
import ProfileEditor from '../../../components/ProfileEditor';
import BadgeGenerator from '../../../components/BadgeGenerator';
import GlassCard from '../../../components/GlassCard';
import AuthSection from '../../AuthSection';

export default function VIPDashboard() {
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

  // VIP-specific state
  const [showVIPLounge, setShowVIPLounge] = useState(false);
  const [showConcierge, setShowConcierge] = useState(false);
  const [showPrivateEvents, setShowPrivateEvents] = useState(false);
  const [showNetworking, setShowNetworking] = useState(false);
  const [vipBenefits, setVipBenefits] = useState<any[]>([]);
  const [conciergeRequests, setConciergeRequests] = useState<any[]>([]);
  const [privateSessions, setPrivateSessions] = useState<any[]>([]);
  const [networkingOpportunities, setNetworkingOpportunities] = useState<any[]>([]);
  const [selectedConciergeService, setSelectedConciergeService] = useState<string>('');
  const [conciergeNotes, setConciergeNotes] = useState<string>('');

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
    // Show loading state while authentication is being checked
    // The main page will handle the redirect to sign-in if needed
    return (
      <div className="min-h-screen w-full bg-[#0b1020] flex items-center justify-center">
        <div className="w-full max-w-md">
          <AuthSection />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0b1020] flex items-center justify-center">
      <div className="w-full max-w-md">
        <AuthSection />
      </div>
    </div>
  );
}
