"use client";
import React, { useState, useEffect } from "react";
import { db, auth } from "../../../firebaseConfig";
import AuthForm from "../../../components/AuthForm";
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc, setDoc, query, where, orderBy, limit, onSnapshot, addDoc, deleteDoc, increment } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from 'html5-qrcode';
import { authService, UserProfile } from "../../../utils/authService";
import ClientOnly from '../../../components/ClientOnly';
import Sidebar from './Sidebar';
import EventBuilder from './EventBuilder';
import { AttendanceChart, CategoryPieChart, EventAnalyticsChart, FootfallChart, LeadConversionChart } from './Charts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQrcode,
  faPrint,
  faUserCheck,
  faUsers,
  faBuilding,
  faChartBar,
  faChartLine,
  faLightbulb,
  faCalendar,
  faClock,
  faDownload,
  faCog,
  faSignOutAlt,
  faCheckCircle,
  faSpinner,
  faPlus,
  faEdit,
  faTrash,
  faPlay,
  faStop,
  faCamera,
  faUser,
  faIdBadge,
  faEnvelope,
  faTimes,
  faSave,
  faPhone,
  faExclamationTriangle,
  faFileExport,
  faUpload,
  faStar,
  faMapMarkerAlt,
  faSyncAlt,
  faTimesCircle,
  faInfoCircle,
  faUserTag,
  faCrown,
  faBrain,
  faHandshake,
  faTrophy,
  faRefresh,
  faBell
} from '@fortawesome/free-solid-svg-icons';

interface OrganizerDashboardProps {}

export default function OrganizerDashboard({}: OrganizerDashboardProps) {
  const [user, setUser] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab] = useState('Overview');
  const [userRole, setUserRole] = useState<string>('Organizer');
  const [matches, setMatches] = useState<any[]>([]);

  // Events CRUD state
  const [events, setEvents] = useState<any[]>([]);
  const [eventForm, setEventForm] = useState<any>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    location: '',
    capacity: '',
    status: 'draft'
  });
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventFilter, setEventFilter] = useState<{search: string; status: string}>({ search: '', status: 'All' });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [appName, setAppName] = useState<string>('EventPlatform');
  const [logoUrl, setLogoUrl] = useState<string>('/logo.svg');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoSize, setLogoSize] = useState<number>(32);
  const [scanner, setScanner] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [scannerResult, setScannerResult] = useState('');
  const [eventStats, setEventStats] = useState<{ perDay: Record<string, number>; uniqueAllDays: number; todayIn: number; todayOut: number }>({ perDay: {}, uniqueAllDays: 0, todayIn: 0, todayOut: 0 });
  const [currentEventId, setCurrentEventId] = useState<string>('default');
  const [config, setConfig] = useState<any>({ floorplanUrl: '' });
  const [isClient, setIsClient] = useState(false);
  const [badgeFilter, setBadgeFilter] = useState<{search: string; category: string; status?: string}>({ search: '', category: 'All' });
  const [badgePreviewId, setBadgePreviewId] = useState<string | null>(null);
  const [showComingSoon, setShowComingSoon] = useState<boolean>(true);
  const [showBulkBadgeModal, setShowBulkBadgeModal] = useState<boolean>(false);
  const [showBadgeTemplateModal, setShowBadgeTemplateModal] = useState<boolean>(false);
  const [showCreateBadgeModal, setShowCreateBadgeModal] = useState<boolean>(false);
  const [showBadgeEditModal, setShowBadgeEditModal] = useState<boolean>(false);
  const [showBadgeEditorModal, setShowBadgeEditorModal] = useState<boolean>(false);
  const [selectedAttendeesForBulk, setSelectedAttendeesForBulk] = useState<Set<string>>(new Set());
  const [badgeTemplates, setBadgeTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
  const [editingAttendeeForBadge, setEditingAttendeeForBadge] = useState<any>(null);
  const [badgeEditForm, setBadgeEditForm] = useState<any>({
    name: '',
    position: '',
    company: '',
    category: 'Visitor',
    badgeX: 100,
    badgeY: 200,
    fontSize: 14,
    fontWeight: 'normal',
    margins: 10,
    showGrid: true,
    snapToGrid: true,
    gridSize: 25
  });

  // Force re-render when form values change
  const [previewKey, setPreviewKey] = useState<number>(0);

  // Badge design reference
  const [referenceBadgeUrl, setReferenceBadgeUrl] = useState<string>('');
  const [showReferenceUpload, setShowReferenceUpload] = useState<boolean>(false);

  // Collapsible sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Helper function to constrain badge position within A5 boundaries
  const constrainBadgePosition = (x: number, y: number, badgeWidth: number = 200, badgeHeight: number = 300) => {
    const containerWidth = 842; // A5 landscape width
    const containerHeight = 595; // A5 landscape height

    // Calculate the maximum allowed positions to keep badge within container
    const maxX = containerWidth - badgeWidth;
    const maxY = containerHeight - badgeHeight;

    // Constrain values within boundaries
    const constrainedX = Math.max(0, Math.min(x, maxX));
    const constrainedY = Math.max(0, Math.min(y, maxY));

    return { x: constrainedX, y: constrainedY };
  };

  // Physical badge dimensions for printing (A5 paper size)
  const physicalBadgeWidth = 54; // mm
  const physicalBadgeHeight = 85; // mm
  const physicalX = 47; // mm from left
  const physicalY = 62.5; // mm from top

  // Helper function for snap-to-grid functionality
  const snapToGrid = (value: number, gridSize: number = 25) => {
    return Math.round(value / gridSize) * gridSize;
  };

  // Load badge layout preferences when editing an attendee
  useEffect(() => {
    const loadBadgeLayout = async () => {
      if (editingAttendeeForBadge) {
        // Set basic attendee data with position matching the rectangle area
        const initialForm = {
          name: editingAttendeeForBadge.fullName || '',
          position: editingAttendeeForBadge.position || '',
          company: editingAttendeeForBadge.company || '',
          category: editingAttendeeForBadge.category || 'Visitor',
          badgeX: 100, // Position in the rectangle area (right side)
          badgeY: 200, // Position in the rectangle area (bottom area)
          fontSize: 14,
          fontWeight: 'normal',
          margins: 10,
          showGrid: true,
          snapToGrid: true,
          gridSize: 25
        };

        setBadgeEditForm(initialForm);

        // Try to load existing layout preferences
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../../../firebaseConfig');
          const layoutDoc = await getDoc(doc(db, 'BadgeLayouts', editingAttendeeForBadge.id));
          if (layoutDoc.exists()) {
            const layoutData = layoutDoc.data();
            const constrained = constrainBadgePosition(
              layoutData.badgeX ?? 100,
              layoutData.badgeY ?? 200
            );

            setBadgeEditForm((prev: any) => ({
              ...prev,
              badgeX: constrained.x,
              badgeY: constrained.y,
              fontSize: layoutData.fontSize || 14,
              fontWeight: layoutData.fontWeight || 'normal',
              margins: layoutData.margins || 10
            }));
          }
        } catch (error) {
          console.log('No existing layout preferences found, using visible defaults');
        }
      }
    };

    loadBadgeLayout();
  }, [editingAttendeeForBadge]);

  const badgeCategories = ['All','Organizer','Visitor','Exhibitor','Media','Speaker','Hosted Buyer','VIP','Agent'];

  // Passcode management
  const [organizerPasscode, setOrganizerPasscode] = useState<string>('');
  const [newPasscode, setNewPasscode] = useState<string>('');
  const [confirmPasscode, setConfirmPasscode] = useState<string>('');
  const [showPasscodeModal, setShowPasscodeModal] = useState<boolean>(false);

  // Account creation state
  const [generatedCredentials, setGeneratedCredentials] = useState<any>(null);
  const [creatingAccount, setCreatingAccount] = useState<boolean>(false);

  // Website Builder data (per-event)
  const [exhibitors, setExhibitors] = useState<any[]>([]);
  const [exhForm, setExhForm] = useState<any>({
    name: '',
    description: '',
    boothId: '',
    tags: '',
    logoUrl: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    address: '',
    companySize: '',
    industry: ''
  });
  const [editingExhibitor, setEditingExhibitor] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    name: '',
    description: '',
    boothId: '',
    tags: '',
    logoUrl: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    address: '',
    companySize: '',
    industry: ''
  });

  const [editingSpeaker, setEditingSpeaker] = useState<any>(null);
  const [showEditSpeakerModal, setShowEditSpeakerModal] = useState(false);
  const [editSpeakerForm, setEditSpeakerForm] = useState<any>({
    name: '',
    title: '',
    company: '',
    photoUrl: '',
    tags: '',
    bio: '',
    email: '',
    phone: '',
    linkedin: '',
    twitter: ''
  });

  const [editingSponsor, setEditingSponsor] = useState<any>(null);
  const [showEditSponsorModal, setShowEditSponsorModal] = useState(false);
  const [editSponsorForm, setEditSponsorForm] = useState<any>({
    name: '',
    tier: 'gold',
    logoUrl: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    address: ''
  });

  // Function to save edited exhibitor
  const saveEditedExhibitor = async () => {
    if (!editingExhibitor || !editForm.name) return;

    try {
      await setDoc(doc(db, 'Events', currentEventId || 'default', 'Exhibitors', editingExhibitor.id), {
        name: editForm.name,
        description: editForm.description || '',
        boothId: editForm.boothId || '',
        tags: (editForm.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
        logoUrl: editForm.logoUrl || '',
        contactEmail: editForm.contactEmail || '',
        contactPhone: editForm.contactPhone || '',
        website: editForm.website || '',
        address: editForm.address || '',
        companySize: editForm.companySize || '',
        industry: editForm.industry || '',
        userId: editingExhibitor.userId, // Keep existing user account
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      }, { merge: true });

      setScannerResult(`✅ Exhibitor updated successfully!`);
      setTimeout(() => {
        setScannerResult('');
      }, 3000);

      // Close modal and reset form
      setShowEditModal(false);
      setEditingExhibitor(null);
      setEditForm({
        name: '',
        description: '',
        boothId: '',
        tags: '',
        logoUrl: '',
        contactEmail: '',
        contactPhone: '',
        website: '',
        address: '',
        companySize: '',
        industry: ''
      });

    } catch (error: any) {
      console.error('Error updating exhibitor:', error);
      setScannerResult(`❌ Error updating exhibitor: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setScannerResult(''), 3000);
    }
  };

  const [sponsors, setSponsors] = useState<any[]>([]);
  const [sponsorForm, setSponsorForm] = useState<any>({
    name: '',
    tier: 'gold',
    logoUrl: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    address: ''
  });

  const [speakers, setSpeakers] = useState<any[]>([]);
  const [speakerForm, setSpeakerForm] = useState<any>({
    name: '',
    title: '',
    company: '',
    photoUrl: '',
    tags: '',
    bio: '',
    email: '',
    phone: '',
    linkedin: '',
    twitter: ''
  });

  const [hostedBuyers, setHostedBuyers] = useState<any[]>([]);
  const [buyerForm, setBuyerForm] = useState<any>({
    name: '',
    company: '',
    notes: '',
    photoUrl: '',
    email: '',
    phone: '',
    industry: '',
    companySize: '',
    interests: '',
    budget: ''
  });
  const [editingHostedBuyer, setEditingHostedBuyer] = useState<any>(null);
  const [showEditBuyerModal, setShowEditBuyerModal] = useState(false);
  const [editBuyerForm, setEditBuyerForm] = useState<any>({
    name: '',
    company: '',
    notes: '',
    photoUrl: '',
    email: '',
    phone: '',
    industry: '',
    companySize: '',
    interests: '',
    budget: ''
  });

  const [agents, setAgents] = useState<any[]>([]);
  const [agentForm, setAgentForm] = useState<any>({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    photoUrl: '',
    notes: ''
  });
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [showEditAgentModal, setShowEditAgentModal] = useState(false);
  const [editAgentForm, setEditAgentForm] = useState<any>({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    photoUrl: '',
    notes: ''
  });

  // Agent creation now handled through registration form only
  const addAgent = async () => {
    setScannerResult('❌ Account creation must be done through the registration form. Please direct users to /signin to create accounts.');
    setTimeout(() => setScannerResult(''), 5000);
  };

  // Simple notification system - no composite indexes needed
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Simple notification functions - no complex queries
  const fetchNotifications = async () => {
    if (!user?.uid) return;

    try {
      // Simple query without ordering to avoid index requirements
      const q = query(
        collection(db, 'Notifications'),
        where('userId', '==', user.uid),
        limit(20)
      );
      const querySnapshot = await getDocs(q);

      // Sort client-side to avoid composite index requirement
      const notificationData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any)).sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });

      setNotifications(notificationData);
      setUnreadCount(notificationData.filter(n => !n.read).length);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'Notifications', notificationId), {
        read: true
      });
      // Refresh notifications after marking as read
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n =>
          updateDoc(doc(db, 'Notifications', n.id), { read: true })
        )
      );
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionForm, setSessionForm] = useState<any>({ title: '', day: '', start: '', end: '', room: '', speakerIds: [] as string[] });

  // Leads
  const [leads, setLeads] = useState<any[]>([]);

  // Analytics state for enhanced dashboard
  const [dailyStats, setDailyStats] = useState<Array<{
    date: string;
    registrations: number;
    checkIns: number;
    checkOuts: number;
    leads: number;
    currentAttendees: number;
  }>>([]);

  const [eventAnalytics, setEventAnalytics] = useState<{
    totalRegistrations: number;
    totalCheckIns: number;
    totalCheckOuts: number;
    totalLeads: number;
    currentAttendees: number;
  }>({
    totalRegistrations: 0,
    totalCheckIns: 0,
    totalCheckOuts: 0,
    totalLeads: 0,
    currentAttendees: 0
  });

  const [leadsByExhibitor, setLeadsByExhibitor] = useState<Array<{
    exhibitorName: string;
    leadCount: number;
  }>>([]);

  // Load analytics data
  const loadAnalyticsData = async () => {
    try {
      // Load daily stats for the last 3 days
      const today = new Date();
      const dailyStatsData = [];

      for (let i = 2; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Get daily event stats
        const dailyStatsRef = doc(db, 'DailyEventStats', `${currentEventId}_${dateStr}`);
        const dailyStatsDoc = await getDoc(dailyStatsRef);

        if (dailyStatsDoc.exists()) {
          const data = dailyStatsDoc.data() as any;
          dailyStatsData.push({
            date: dateStr,
            registrations: data.registrations || 0,
            checkIns: data.checkIns || 0,
            checkOuts: data.checkOuts || 0,
            leads: data.leads || 0,
            currentAttendees: (data.checkIns || 0) - (data.checkOuts || 0)
          });
        } else {
          dailyStatsData.push({
            date: dateStr,
            registrations: 0,
            checkIns: 0,
            checkOuts: 0,
            leads: 0,
            currentAttendees: 0
          });
        }
      }

      setDailyStats(dailyStatsData);

      // Load event analytics
      const eventStatsRef = doc(db, 'EventStats', currentEventId);
      const eventStatsDoc = await getDoc(eventStatsRef);

      if (eventStatsDoc.exists()) {
        const data = eventStatsDoc.data() as any;
        setEventAnalytics({
          totalRegistrations: data.totalRegistrations || 0,
          totalCheckIns: data.totalCheckIns || 0,
          totalCheckOuts: data.totalCheckOuts || 0,
          totalLeads: data.totalLeads || 0,
          currentAttendees: (data.totalCheckIns || 0) - (data.totalCheckOuts || 0)
        });
      }

      // Load leads by exhibitor
      const leadsQuery = query(collection(db, 'Leads'));
      const leadsSnapshot = await getDocs(leadsQuery);

      const exhibitorLeadCounts: Record<string, number> = {};
      leadsSnapshot.forEach((doc) => {
        const data = doc.data();
        const exhibitorName = data.exhibitorInfo?.company || 'Unknown Exhibitor';
        exhibitorLeadCounts[exhibitorName] = (exhibitorLeadCounts[exhibitorName] || 0) + 1;
      });

      const leadsByExhibitorData = Object.entries(exhibitorLeadCounts).map(([name, count]) => ({
        exhibitorName: name,
        leadCount: count
      })).sort((a, b) => b.leadCount - a.leadCount);

      setLeadsByExhibitor(leadsByExhibitorData);

    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  };

  // Floorplan mapping state (admin)
  const svgAdminRef = React.useRef<HTMLDivElement>(null);
  const [selectedBoothId, setSelectedBoothId] = useState<string>('');
  const [selectedExhibitorId, setSelectedExhibitorId] = useState<string>('');
  const [mappingMsg, setMappingMsg] = useState<string>('');

  // Subscribe to per-event collections
  useEffect(() => {
    if (!currentEventId) return;

    const exhUnsub = onSnapshot(collection(db, 'Events', currentEventId, 'Exhibitors'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setExhibitors(data);
      console.log('Exhibitors loaded:', data.length);
    });
    const spUnsub = onSnapshot(collection(db, 'Events', currentEventId, 'Sponsors'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSponsors(data);
      console.log('Sponsors loaded:', data.length);
    });
    const spkUnsub = onSnapshot(collection(db, 'Events', currentEventId, 'Speakers'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSpeakers(data);
      console.log('Speakers loaded:', data.length);
    });
    const hbUnsub = onSnapshot(collection(db, 'Events', currentEventId, 'HostedBuyers'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHostedBuyers(data);
      console.log('Hosted Buyers loaded:', data.length);
    });
    const sesUnsub = onSnapshot(collection(db, 'Events', currentEventId, 'Sessions'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(data);
      console.log('Sessions loaded:', data.length);
    });
    const leadsUnsub = onSnapshot(collection(db, 'Leads'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeads(data);
      console.log('Leads loaded:', data.length);
    });

    // Subscribe to agents from Users collection
    const agentsUnsub = onSnapshot(
      query(collection(db, 'Users'), where('category', '==', 'Agent')),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAgents(data);
        console.log('Agents loaded:', data.length);
      }
    );

    return () => { exhUnsub(); spUnsub(); spkUnsub(); hbUnsub(); sesUnsub(); leadsUnsub(); agentsUnsub(); };
  }, [currentEventId]);

  // Account creation now handled through registration form only
  // All account creation should go through the AuthForm component

  // Exhibitor creation now handled through registration form only
  const addExhibitor = async () => {
    setScannerResult('❌ Account creation must be done through the registration form. Please direct users to /signin to create accounts.');
    setTimeout(() => setScannerResult(''), 5000);
  };

  // Sponsor creation now handled through registration form only
  const addSponsor = async () => {
    setScannerResult('❌ Account creation must be done through the registration form. Please direct users to /signin to create accounts.');
    setTimeout(() => setScannerResult(''), 5000);
  };

  // Speaker creation now handled through registration form only
  const addSpeaker = async () => {
    setScannerResult('❌ Account creation must be done through the registration form. Please direct users to /signin to create accounts.');
    setTimeout(() => setScannerResult(''), 5000);
  };

  // Hosted Buyer creation now handled through registration form only
  const addHostedBuyer = async () => {
    setScannerResult('❌ Account creation must be done through the registration form. Please direct users to /signin to create accounts.');
    setTimeout(() => setScannerResult(''), 5000);
  };

  const addSession = async () => {
    if (!sessionForm.title || !sessionForm.day || !sessionForm.start || !sessionForm.end) return;
    await addDoc(collection(db, 'Events', currentEventId || 'default', 'Sessions'), {
      title: sessionForm.title,
      day: sessionForm.day,
      start: sessionForm.start,
      end: sessionForm.end,
      room: sessionForm.room || '',
      speakerIds: sessionForm.speakerIds || [],
      createdAt: serverTimestamp(),
    });
    setSessionForm({ title: '', day: '', start: '', end: '', room: '', speakerIds: [] });
  };

  const deleteItem = async (col: string, id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log(`Deleting ${col} item:`, id);

      if (col === 'Users') {
        // For agents, delete from Users collection
        await deleteDoc(doc(db, 'Users', id));
      } else {
        // For other categories, delete from Events subcollections
        await deleteDoc(doc(db, 'Events', currentEventId || 'default', col, id));
      }

      console.log(`✅ Successfully deleted ${col} item:`, id);
      setScannerResult(`✅ "${name}" deleted successfully!`);
      setTimeout(() => {
        setScannerResult('');
      }, 3000);

    } catch (error) {
      console.error('Error deleting item:', error);
      setScannerResult(`❌ Error deleting "${name}". Please try again.`);
      setTimeout(() => {
        setScannerResult('');
      }, 3000);
    }
  };

  const exportLeadsCsv = () => {
    const header = 'id,exhibitorUid,attendeeUid,notes,score,createdAt\n';
    const rows = leads.map(l => [l.id, l.exhibitorUid || '', l.attendeeUid || '', (l.notes || '').replace(/\n/g,' '), l.score || '', l.createdAt?.toDate ? l.createdAt.toDate().toISOString() : ''].join(','));
    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${currentEventId || 'default'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print individual badge function with layout preferences
  const printIndividualBadge = async (attendee: any) => {
    try {
      // Get badge layout preferences from Firestore
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../../firebaseConfig');

      let layoutPrefs = {
        badgeX: 0,
        badgeY: 0,
        fontSize: 14,
        fontWeight: 'normal',
        margins: 10,
        nameSpacing: 4,
        roleSpacing: 2,
        companySpacing: 6,
        categorySpacing: 3,
        qrSpacing: 8
      };

      try {
        const layoutDoc = await getDoc(doc(db, 'BadgeLayouts', attendee.id));
        if (layoutDoc.exists()) {
          layoutPrefs = { ...layoutPrefs, ...layoutDoc.data() };
        }
      } catch (error) {
        console.log('No layout preferences found, using defaults');
      }

      // Get the user's existing badge data for QR code
      let existingBadge = null;
      try {
        const badgeDoc = await getDoc(doc(db, 'Badges', `badge_${attendee.id}_`));
        if (badgeDoc.exists()) {
          existingBadge = badgeDoc.data();
        }
      } catch (error) {
        console.log('No existing badge found, will generate new QR code');
      }

      // Use the REAL QR code that was generated during registration
      const qrCodeData = existingBadge ? existingBadge.qrCode : attendee.id;

      // Use positioning values from the edit form (current values)
      // Use the same coordinate system as the editor
      const currentBadgeX = badgeEditForm.badgeX || 100; // Get from current edit form
      const currentBadgeY = badgeEditForm.badgeY || 200; // Get from current edit form

      // Update layoutPrefs with current values
      layoutPrefs.badgeX = currentBadgeX;
      layoutPrefs.badgeY = currentBadgeY;

      // Get badge data for PDF generation - USE EDITOR VALUES
      const badgeData = {
        id: `badge_${attendee.id}`,
        name: badgeEditForm.name || attendee.fullName || attendee.email,
        role: badgeEditForm.position || attendee.position || 'Attendee',
        company: badgeEditForm.company || attendee.company || '',
        category: badgeEditForm.category || attendee.category || 'Visitor',
        qrCode: qrCodeData
      };

      console.log('🔍 PRINT DEBUG - Comparing Editor vs Attendee Data:', {
        editorForm: {
          name: badgeEditForm.name,
          position: badgeEditForm.position,
          company: badgeEditForm.company,
          category: badgeEditForm.category
        },
        attendeeData: {
          name: attendee.fullName || attendee.email,
          position: attendee.position || 'Attendee',
          company: attendee.company || '',
          category: attendee.category || 'Visitor'
        },
        finalBadgeData: badgeData,
        position: {
          badgeX: badgeEditForm.badgeX,
          badgeY: badgeEditForm.badgeY
        }
      });

      console.log('🎯 PRINT DEBUG - Badge Editor Values:', {
        formValues: {
          name: badgeEditForm.name,
          position: badgeEditForm.position,
          company: badgeEditForm.company,
          category: badgeEditForm.category,
          badgeX: badgeEditForm.badgeX,
          badgeY: badgeEditForm.badgeY,
          fontSize: badgeEditForm.fontSize,
          fontWeight: badgeEditForm.fontWeight,
          margins: badgeEditForm.margins
        },
        finalBadgeData: badgeData,
        attendeeData: {
          name: attendee.fullName || attendee.email,
          position: attendee.position || 'Attendee',
          company: attendee.company || '',
          category: attendee.category || 'Visitor'
        }
      });

      // Get default template for PDF generation
      const defaultTemplate = {
        id: 'default',
        name: 'Default Template',
        description: 'Default badge template',
        layout: 'standard' as const,
        backgroundColor: '#ffffff',
        textColor: '#000000',
        accentColor: '#3b82f6',
        fontFamily: 'Inter, sans-serif',
        fontSize: { name: 16, role: 12, company: 10 },
        includeQR: true,
        includePhoto: false,
        preview: '/templates/default.png',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate PDF with EXACT positioning and styling options from the editor
      const { enhancedBadgeService } = await import('../../../utils/enhancedBadgeService');
      const pdfDataUrl = await enhancedBadgeService.generateBadgePDF(badgeData as any, defaultTemplate, {
        badgeX: currentBadgeX,
        badgeY: currentBadgeY,
        fontSize: badgeEditForm.fontSize || 14,
        fontWeight: badgeEditForm.fontWeight || 'normal',
        margins: badgeEditForm.margins || 10
      });

      // ✅ FINAL SOLUTION: Use the same positioning calculation as the editor preview
      const printScaleX = 842; // A5 width in pixels
      const printScaleY = 595; // A5 height in pixels
      const scaledX = (currentBadgeX * printScaleX) / 842;
      const scaledY = (currentBadgeY * printScaleY) / 595;

      console.log('🎯 FINAL POSITIONING FIX:', {
        editorPosition: { x: currentBadgeX, y: currentBadgeY },
        scaledPosition: { x: scaledX, y: scaledY },
        previewCalculation: {
          left: `${scaledX}px`,
          top: `${scaledY}px`
        }
      });

      console.log('✅ PDF Generated with Editor Values:', {
        position: { x: currentBadgeX, y: currentBadgeY },
        styling: {
          fontSize: badgeEditForm.fontSize || 14,
          fontWeight: badgeEditForm.fontWeight || 'normal',
          margins: badgeEditForm.margins || 10
        },
        content: {
          name: badgeEditForm.name || attendee.fullName || attendee.email,
          position: badgeEditForm.position || attendee.position || 'Attendee',
          company: badgeEditForm.company || attendee.company || '',
          category: badgeEditForm.category || attendee.category || 'Visitor'
        }
      });

      // Debug logging to verify values are being passed correctly
      console.log('🎨 Badge Editor Print Debug:', {
        editorValues: {
          badgeX: currentBadgeX,
          badgeY: currentBadgeY,
          fontSize: badgeEditForm.fontSize || 14,
          fontWeight: badgeEditForm.fontWeight || 'normal',
          margins: badgeEditForm.margins || 10,
          name: badgeEditForm.name || attendee.fullName || attendee.email,
          position: badgeEditForm.position || attendee.position || 'Attendee',
          company: badgeEditForm.company || attendee.company || '',
          category: badgeEditForm.category || attendee.category || 'Visitor'
        },
        attendeeData: {
          name: attendee.fullName || attendee.email,
          position: attendee.position || 'Attendee',
          company: attendee.company || '',
          category: attendee.category || 'Visitor'
        }
      });

      // Debug logging to help identify positioning issues
      console.log('🎯 Badge positioning debug:', {
        editorX: currentBadgeX,
        editorY: currentBadgeY,
        containerWidth: 842,
        containerHeight: 595,
        scaledX: (currentBadgeX * 600) / 842,
        scaledY: (currentBadgeY * 424) / 595
      });

      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
      if (!printWindow) {
        setScannerResult('❌ Please allow popups for this site to print badges');
        setTimeout(() => setScannerResult(''), 3000);
        return;
      }

      // Generate clean badge HTML that matches the preview EXACTLY
      // Use the same coordinate system as the editor preview

      console.log('🖨️ Print Layout Debug:', {
        layoutPrefs: layoutPrefs,
        scaledPosition: { x: scaledX, y: scaledY },
        physicalPosition: { x: physicalX, y: physicalY },
        physicalSize: { width: physicalBadgeWidth, height: physicalBadgeHeight },
        pageSize: { width: 148, height: 210 }
      });

      console.log('🎯 Cross-platform positioning:', {
        originalX: layoutPrefs.badgeX,
        originalY: layoutPrefs.badgeY,
        pixelX: scaledX,
        pixelY: scaledY,
        physicalX: physicalX.toFixed(2) + 'mm',
        physicalY: physicalY.toFixed(2) + 'mm',
        printScaleX,
        printScaleY
      });

      const badgeHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Badge - ${attendee.fullName || attendee.email}</title>
            <meta charset="UTF-8">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
            <style>
              @page {
                size: A5 landscape;
                margin: 0;
              }
              body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                margin: 0;
                padding: 0;
                background: white;
                width: 148mm;
                height: 210mm;
                position: relative;
                overflow: hidden;
                /* Ensure consistent rendering across browsers */
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              .badge {
                width: ${physicalBadgeWidth.toFixed(2)}mm;
                height: ${physicalBadgeHeight.toFixed(2)}mm;
                background: white;
                padding: ${layoutPrefs.margins}px;
                color: black;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                position: absolute;
                left: ${physicalX.toFixed(2)}mm;
                top: ${physicalY.toFixed(2)}mm;
                /* NO BORDER - clean badge like preview */
                box-shadow: none;
                z-index: 10;
                /* Ensure badge stays within page bounds */
                max-width: 148mm;
                max-height: 210mm;
                box-sizing: border-box;
              }
              .badge-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                padding-bottom: ${layoutPrefs.qrSpacing}px;
              }
              .attendee-name {
                font-size: ${layoutPrefs.fontSize + 8}px;
                font-weight: ${layoutPrefs.fontWeight === 'bold' ? '700' : layoutPrefs.fontWeight === 'lighter' ? '300' : '400'};
                margin-bottom: ${layoutPrefs.nameSpacing}px;
                color: #1f2937;
                line-height: 1.0;
                word-wrap: break-word;
                max-width: 100%;
              }
              .attendee-role {
                font-size: ${layoutPrefs.fontSize + 2}px;
                margin-bottom: ${layoutPrefs.roleSpacing}px;
                color: #4b5563;
                font-weight: ${layoutPrefs.fontWeight === 'bold' ? '600' : layoutPrefs.fontWeight === 'lighter' ? '300' : '500'};
                line-height: 1.1;
                word-wrap: break-word;
                max-width: 100%;
              }
              .attendee-company {
                font-size: ${layoutPrefs.fontSize}px;
                color: #6b7280;
                font-weight: ${layoutPrefs.fontWeight === 'bold' ? '500' : layoutPrefs.fontWeight === 'lighter' ? '300' : '400'};
                line-height: 1.2;
                margin-bottom: ${layoutPrefs.qrSpacing}px;
                word-wrap: break-word;
                max-width: 100%;
              }
              .qr-code-container {
                background: white;
                padding: 8px;
                border-radius: 6px;
                margin: 0 auto;
                /* NO BORDER - clean like preview */
              }
              .qr-code {
                width: 140px;
                height: 140px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
              }
              .qr-code canvas {
                width: 100% !important;
                height: 100% !important;
                border-radius: 3px;
              }
              @media print {
                @page {
                  size: A5 landscape;
                  margin: 0;
                }
                body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                  width: 148mm !important;
                  height: 210mm !important;
                  min-height: 210mm !important;
                  max-height: 210mm !important;
                  /* Ensure consistent rendering across all browsers and print drivers */
                  -webkit-print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .badge {
                  box-shadow: none !important;
                  width: ${physicalBadgeWidth.toFixed(2)}mm !important;
                  height: ${physicalBadgeHeight.toFixed(2)}mm !important;
                  left: ${physicalX.toFixed(2)}mm !important;
                  top: ${physicalY.toFixed(2)}mm !important;
                  position: absolute !important;
                  /* Ensure consistent rendering across all browsers */
                  -webkit-print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  /* Prevent any browser-specific scaling or transformations */
                  transform: none !important;
                  -webkit-transform: none !important;
                  -moz-transform: none !important;
                  -ms-transform: none !important;
                  -o-transform: none !important;
                  /* Ensure proper box model */
                  box-sizing: border-box !important;
                  /* Prevent any margin/padding inheritance issues */
                  margin: 0 !important;
                  padding: ${layoutPrefs.margins}px !important;
                }
                .print-controls { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="badge">
              <div class="badge-content">
                <div class="attendee-name">${attendee.fullName || attendee.email}</div>
                <div class="attendee-role">${attendee.position || 'Attendee'}</div>
                ${attendee.company ? `<div class="attendee-company">${attendee.company}</div>` : ''}
              </div>

              <div class="qr-code-container">
                <div class="qr-code">
                  <canvas id="qr-code-canvas"></canvas>
                </div>
              </div>
            </div>

            <script>
              // Use the REAL QR code data from the existing badge
              document.addEventListener('DOMContentLoaded', function() {
                const qrDataString = ${JSON.stringify(qrCodeData)};
                console.log('🎫 REAL QR Data for badge:', qrDataString);

                let qrData;
                try {
                  // Try to parse as JSON (existing QR code)
                  qrData = JSON.parse(qrDataString);
                } catch {
                  // Use as string if not JSON
                  qrData = qrDataString;
                }

                const qr = qrcode(0, 'M');
                qr.addData(typeof qrData === 'string' ? qrData : JSON.stringify(qrData));
                qr.make();

                const canvas = document.getElementById('qr-code-canvas');
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  const size = 140; // EXACTLY 140px as requested
                  canvas.width = size;
                  canvas.height = size;

                  // Set background to white
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, size, size);

                  // Draw QR code modules
                  const moduleSize = size / qr.getModuleCount();
                  ctx.fillStyle = '#000000';

                  for (let row = 0; row < qr.getModuleCount(); row++) {
                    for (let col = 0; col < qr.getModuleCount(); col++) {
                      if (qr.isDark(row, col)) {
                        ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize);
                      }
                    }
                  }
                }
              });
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(badgeHtml);
      printWindow.document.close();

      // Wait for content to load then show print dialog
      printWindow.onload = () => {
        if (printWindow) {
          setTimeout(() => {
            printWindow.print();
            // Don't auto-close - let user close manually
          }, 500);
        }
      };

      setScannerResult('✅ Badge sent to printer with custom layout and BIG QR code');
      setTimeout(() => setScannerResult(''), 3000);

    } catch (error: any) {
      console.error('Error printing badge:', error);
      setScannerResult('❌ Error printing badge');
      setTimeout(() => setScannerResult(''), 3000);
    }
  };

  // Floorplan booth assignment
  const assignBooth = async () => {
    if (!selectedBoothId || !selectedExhibitorId) return;
    try {
      await setDoc(doc(db, 'Events', currentEventId || 'default', 'Exhibitors', selectedExhibitorId), { boothId: selectedBoothId }, { merge: true });
      setMappingMsg(`Assigned ${selectedBoothId} to exhibitor`);
    } catch (e) {
      setMappingMsg('Assignment failed');
    } finally {
      setTimeout(() => setMappingMsg(''), 2000);
    }
  };

  // Load SVG for admin mapping
  useEffect(() => {
    let cancelled = false;
    async function loadSvg() {
      if (!config.floorplanUrl || !String(config.floorplanUrl).toLowerCase().includes('.svg')) return;
      try {
        const res = await fetch(config.floorplanUrl);
        const svgText = await res.text();
        if (cancelled) return;
        if (svgAdminRef.current) {
          svgAdminRef.current.innerHTML = svgText;
          (svgAdminRef.current as any).onclick = (e: any) => {
            const el = (e.target as HTMLElement).closest('[id]') as HTMLElement | null;
            const bid = el?.id?.trim();
            if (bid) setSelectedBoothId(bid);
          };
        }
      } catch {}
    }
    loadSvg();
    return () => { cancelled = true; if (svgAdminRef.current) (svgAdminRef.current as any).onclick = null; };
  }, [config.floorplanUrl]);

  const generateMatchmaking = async () => {
    try {
      const res = await fetch('/api/matchmaking/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: currentEventId || 'default', minScore: 0.1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Matchmaking failed');
      setScannerResult(`Generated ${data.count} recommendations`);
    } catch (e: any) {
      setScannerResult(`Matchmaking failed: ${e?.message || e}`);
    } finally {
      setTimeout(() => setScannerResult(''), 2500);
    }
  };

  const filteredAttendees = React.useMemo(() => {
    return attendees.filter((a: any) => {
      const matchesCategory = badgeFilter.category === 'All' || ((a.category || '').toLowerCase() === badgeFilter.category.toLowerCase());
      const q = badgeFilter.search.toLowerCase();
      const matchesSearch = !q || (a.fullName || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q) || (a.company || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [attendees, badgeFilter]);

  const router = useRouter();

  useEffect(() => {
    // Get current user from Firebase Auth
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      console.log('🏠 ORGANIZER DEBUG: Auth state changed, user:', u ? u.email : 'none');
      setUser(u);
      if (u) {
        try {
          // Fetch user profile specifically for organizer
          console.log('🏠 ORGANIZER DEBUG: Fetching organizer profile for:', u.uid);
          const userDoc = await getDoc(doc(db, 'Users', u.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            console.log('🏠 ORGANIZER DEBUG: User profile found:', data);

            // Ensure this is organizer data, not agent data
            if (data.category === 'Organizer' || data.category === 'Admin' || data.category === 'Manager' || !data.category) {
              // This is organizer data or no category set yet
              setUserProfile(data);
            } else {
              // This might be agent data, but don't override the category for organizer accounts
              console.log('🏠 ORGANIZER DEBUG: Found non-organizer data, but preserving organizer context');
              // Keep the existing profile data but ensure it's marked as organizer context for dashboard access
              setUserProfile({
                ...data,
                // Don't override the category - let the account creation functions handle categories properly
              });
            }
          } else {
            // Create default organizer profile if none exists
            console.log('🏠 ORGANIZER DEBUG: No user profile found, creating organizer profile');
            const defaultProfile = {
              uid: u.uid,
              email: u.email,
              fullName: u.displayName || u.email,
              position: 'Organizer',
              company: '',
              category: 'Organizer',
              createdAt: serverTimestamp()
            };
            await setDoc(doc(db, 'Users', u.uid), defaultProfile);
            console.log('🏠 ORGANIZER DEBUG: Created organizer profile:', defaultProfile);
            setUserProfile(defaultProfile);
          }
        } catch (error) {
          console.error('🏠 ORGANIZER DEBUG: Error loading organizer profile:', error);
        }
      } else {
        console.log('🏠 ORGANIZER DEBUG: No user, clearing profile');
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []); // Empty dependency array - only run once on mount

  // Function to fetch attendees and keep it up to date
  const fetchAttendees = async () => {
    try {
      const snapshot = await getDocs(collection(db, "Users"));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendees(data);
      console.log('✅ Attendees refreshed:', data.length);
    } catch (error) {
      console.error('Error fetching attendees:', error);
    }
  };

  useEffect(() => {
    fetchAttendees();

    // Set up real-time listener for Users collection to keep attendees updated
    const unsubscribe = onSnapshot(collection(db, "Users"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendees(data);
      console.log('🔄 Attendees updated in real-time:', data.length);
    }, (error: any) => {
      console.error('Error with attendees listener:', error);
      // Fallback to manual fetch if listener fails
      fetchAttendees();
    });

    return () => unsubscribe();
  }, []);

  // Load global app settings shared across all sessions
  useEffect(() => {
    async function loadGlobalSettings() {
      try {
        const sDoc = await getDoc(doc(db, 'AppSettings', 'global'));
        if (sDoc.exists()) {
          const s = sDoc.data() as any;
          if (s.appName) {
            setAppName(s.appName);
          }
          if (s.logoUrl) {
            setLogoUrl(s.logoUrl);
          }
          if (typeof s.logoSize === 'number') {
            setLogoSize(s.logoSize);
          }
          if (s.eventId) {
            setCurrentEventId(s.eventId);
          }
        }
      } catch (e) {
        console.warn('Failed to load global settings', e);
      }
    }
    loadGlobalSettings();
  }, []);

  // Load from localStorage after component mounts
  useEffect(() => {
    const savedAppName = localStorage.getItem('globalAppName');
    if (savedAppName) setAppName(savedAppName);

    const savedLogoUrl = localStorage.getItem('globalLogoUrl');
    if (savedLogoUrl) setLogoUrl(savedLogoUrl);

    const savedLogoSize = localStorage.getItem('globalLogoSize');
    if (savedLogoSize) setLogoSize(parseInt(savedLogoSize));

    const savedEventId = localStorage.getItem('globalEventId');
    if (savedEventId) setCurrentEventId(savedEventId);
  }, []);

  useEffect(() => {
    if (activeTab === 'Check-In System' && !scanner) {
      const initializeScanner = async () => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait

        const tryInitialize = async () => {
          attempts++;

          // Check if element exists
          const element = document.getElementById('qr-reader');
          if (!element) {
            if (attempts < maxAttempts) {
              setTimeout(tryInitialize, 100);
              return;
            } else {
              console.error('❌ Check-in QR Reader element not found after maximum attempts');
              return;
            }
          }

          try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const html5QrCode = new Html5Qrcode("qr-reader");
            setScanner(html5QrCode);
            console.log('✅ Check-in QR Scanner initialized successfully');
          } catch (error) {
            console.error('❌ Failed to initialize check-in QR scanner:', error);
          }
        };

        // Start trying to initialize
        setTimeout(tryInitialize, 100);
      };

      initializeScanner();
    }

    return () => {
      if (scanner) {
        try {
          if (scanner.clear && typeof scanner.clear === 'function') {
            scanner.clear();
          }
        } catch (error) {
          console.warn('Scanner cleanup error:', error);
        }
      }
    };
  }, [activeTab, scanner]); // Add scanner dependency to prevent re-initialization

  // Cloudinary helper and floorplan config listener
  const uploadToCloud = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'event_logo_unsigned');
    const res = await fetch('https://api.cloudinary.com/v1_1/dp3fxdxyj/image/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.secure_url) throw new Error('Cloudinary upload failed');
    return data.secure_url as string;
  };

  useEffect(() => {
    if (!currentEventId) return;
    const cfgRef = doc(db, 'Events', currentEventId, 'Config', 'default');
    const unsub = onSnapshot(cfgRef, (snap) => { if (snap.exists()) setConfig(snap.data()); });
    return () => unsub();
  }, [currentEventId]);

  const startScanning = async () => {
    if (!scanner) return;
    setScanning(true);

    try {
      // Check if we're in a secure context (HTTPS or localhost)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('Camera access requires HTTPS. Please access the site via HTTPS or use localhost.');
      }

      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.');
      }

      // Request camera permission with better error handling
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (permissionError: any) {
        if (permissionError.name === 'NotAllowedError') {
          throw new Error('Camera permission denied. Please click "Allow" when your browser asks for camera access.');
        } else if (permissionError.name === 'NotFoundError') {
          throw new Error('No camera found on this device.');
        } else if (permissionError.name === 'NotReadableError') {
          throw new Error('Camera is already in use by another application.');
        } else {
          throw permissionError;
        }
      }

      // Stop the test stream immediately as we'll use Html5Qrcode
      stream.getTracks().forEach(track => track.stop());

      const cameraConfig: any = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      const parseUid = (text: string): string | null => {
        try {
          // Try to parse as JSON first (enhanced QR codes)
          const qrData = JSON.parse(text);
          if (qrData && qrData.uid) {
            console.log('📱 Enhanced QR Code detected:', qrData);
            return String(qrData.uid);
          }
        } catch {
          // Not JSON, try legacy formats
        }

        // Legacy QR code formats
        const m = text.match(/checkin\/([A-Za-z0-9_-]+)/);
        if (m) return m[1];

        if (/^[A-Za-z0-9_-]{10,}$/.test(text)) return text;

        try {
          const u = new URL(text);
          const qp = u.searchParams.get('uid');
          if (qp) return qp;
          const pm = u.pathname.match(/checkin\/([A-Za-z0-9_-]+)/);
          if (pm) return pm[1];
        } catch {}

        return null;
      };

      await scanner.start(
        { facingMode: 'environment' },
        cameraConfig,
        (decodedText: string) => {
          console.log('✅ QR Code scanned successfully:', decodedText);
          const uid = parseUid(decodedText);
          if (uid) {
            toggleCheckIn(uid);
            setScannerResult(`✅ Scanned: ${uid.substring(0, 8)}...`);
          } else {
            setScannerResult('❌ Invalid QR code. Please scan a valid event badge.');
            setTimeout(() => setScannerResult(''), 2000);
          }
          // Stop scanning after a successful decode
          stopScanning();
        },
        (error: any) => {
          // Only log actual errors, not normal "no QR code found" errors
          if (error && typeof error === 'string' && error.includes('NotFoundException')) {
            // This is normal - no QR code detected in frame
            return;
          }
          console.error('Scanner error:', error);
        }
      );

      setScannerResult('✅ Scanner active. Point at QR code...');
    } catch (err: any) {
      console.error('❌ Error starting scanner:', err);
      let msg = '❌ Scanner error. Please try again.';

      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        msg = '❌ Camera permission denied. Please allow camera access when prompted by your browser.';
      } else if (err?.name === 'NotFoundError') {
        msg = '❌ No camera found on this device.';
      } else if (err?.name === 'NotReadableError') {
        msg = '❌ Camera is already in use by another application.';
      } else if (err?.message?.includes('HTTPS')) {
        msg = '❌ Camera requires HTTPS. Please access the site via HTTPS.';
      } else if (err?.message?.includes('not supported')) {
        msg = '❌ Camera not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.';
      }

      setScannerResult(msg);
      setTimeout(() => setScannerResult(''), 6000);
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scanner && scanning) {
      try {
        await scanner.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      setScanning(false);
    }
  };

  const formatDay = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const toggleCheckIn = async (uid: string) => {
    try {
      const userRef = doc(db, 'Users', uid);
      // Find last event for this uid
      const q = query(
        collection(db, 'CheckIns'),
        where('uid', '==', uid),
        orderBy('at', 'desc'),
        limit(1)
      );
      const lastSnap = await getDocs(q);
      const last = lastSnap.docs.length > 0 ? lastSnap.docs[0].data() as any : null;
      const nextType: 'in' | 'out' = last && last.type === 'in' ? 'out' : 'in';
      const now = new Date();

      // Write log entry
      await addDoc(collection(db, 'CheckIns'), {
        uid,
        type: nextType,
        at: serverTimestamp(),
        eventDay: formatDay(now),
        eventId: currentEventId || 'default',
      });

      // Update user document
      if (nextType === 'in') {
        await updateDoc(userRef, {
          lastCheckIn: serverTimestamp(),
          lastStatus: 'in',
          checkInCount: increment(1),
        });
        setScannerResult(`Checked in: ${uid.substring(0, 8)}...`);
      } else {
        await updateDoc(userRef, {
          lastCheckOut: serverTimestamp(),
          lastStatus: 'out',
        });
        setScannerResult(`Checked out: ${uid.substring(0, 8)}...`);
      }

      // Update recent list display
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setRecentCheckIns(prev => [
          {
            uid,
            fullName: (userData as any).fullName || (userData as any).email || 'Unknown User',
            category: (userData as any).category || 'Visitor',
            timestamp: now.toLocaleString(),
          },
          ...prev.slice(0, 9)
        ]);
      }

      // Refresh stats and recent list periodically
      fetchRecentCheckIns();
      fetchEventStats();

    } catch (error) {
      console.error('Check-in/out error:', error);
      setScannerResult('Check-in/out failed. Please try again.');
      setTimeout(() => setScannerResult(''), 3000);
    }
  };

  const fetchRecentCheckIns = async () => {
    try {
      // Get recent CheckIns logs instead of users
      const q = query(collection(db, 'CheckIns'), orderBy('at', 'desc'), limit(10));
      const snap = await getDocs(q);
      const items = await Promise.all(snap.docs.map(async (d) => {
        const rec = d.data() as any;
        const uSnap = await getDoc(doc(db, 'Users', rec.uid));
        const u = uSnap.exists() ? (uSnap.data() as any) : {};
        const ts = (rec.at && typeof (rec.at as any).toDate === 'function') ? (rec.at as any).toDate().toLocaleString() : new Date().toLocaleString();
        return {
          uid: rec.uid,
          fullName: u.fullName || u.email || 'Unknown User',
          category: u.category || 'Visitor',
          timestamp: ts,
          type: rec.type,
        };
      }));
      setRecentCheckIns(items);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    }
  };

  const fetchEventStats = async () => {
    try {
      // last 4 days window
      const since = new Date();
      since.setDate(since.getDate() - 4);
      const q = query(collection(db, 'CheckIns'), orderBy('at', 'desc'));
      const snap = await getDocs(q);
      const perDayMap: Record<string, Set<string>> = {};
      const unionSet: Set<string> = new Set();
      let todayIn = 0;
      let todayOut = 0;
      const todayStr = formatDay(new Date());

      snap.docs.forEach((d) => {
        const rec = d.data() as any;
        const at = rec.at && typeof (rec.at.toDate) === 'function' ? rec.at.toDate() : new Date();
        if (at < since) return; // consider only last 4 days window
        const day = rec.eventDay || formatDay(at);
        if (!perDayMap[day]) perDayMap[day] = new Set<string>();
        if (rec.type === 'in') {
          perDayMap[day].add(rec.uid);
          unionSet.add(rec.uid);
        }
        if (day === todayStr) {
          if (rec.type === 'in') todayIn++;
          if (rec.type === 'out') todayOut++;
        }
      });

      const perDayCounts: Record<string, number> = {};
      Object.keys(perDayMap).forEach((k) => perDayCounts[k] = perDayMap[k].size);
      setEventStats({ perDay: perDayCounts, uniqueAllDays: unionSet.size, todayIn, todayOut });
    } catch (e) {
      console.error('Failed to compute event stats', e);
    }
  };

  useEffect(() => {
    if (activeTab !== 'Check-In System') return;
    // Live subscription to CheckIns for this event
    const constraints: any[] = [];
    if (currentEventId) constraints.push(where('eventId', '==', currentEventId));
    constraints.push(orderBy('at', 'desc'));
    const qRef = query(collection(db, 'CheckIns'), ...constraints);
    let fallbackUnsub: (() => void) | null = null;
    const unsub = onSnapshot(qRef, async (snap) => {
      // Recent list
      const items = await Promise.all(snap.docs.slice(0, 10).map(async (d) => {
        const rec = d.data() as any;
        const uSnap = await getDoc(doc(db, 'Users', rec.uid));
        const u = uSnap.exists() ? (uSnap.data() as any) : {};
        const ts = (rec.at && typeof (rec.at as any).toDate === 'function') ? (rec.at as any).toDate().toLocaleString() : new Date().toLocaleString();
        return { uid: rec.uid, fullName: u.fullName || u.email || 'Unknown User', category: u.category || 'Visitor', timestamp: ts, type: rec.type };
      }));
      setRecentCheckIns(items);

      // Stats (last 4 days)
      const since = new Date();
      since.setDate(since.getDate() - 4);
      const perDayMap: Record<string, Set<string>> = {};
      const unionSet: Set<string> = new Set();
      let todayIn = 0;
      let todayOut = 0;
      const todayStr = formatDay(new Date());
      snap.docs.forEach((d) => {
        const rec = d.data() as any;
        const at = rec.at && typeof (rec.at as any).toDate === 'function' ? (rec.at as any).toDate() : new Date();
        if (at < since) return;
        const day = rec.eventDay || formatDay(at);
        if (!perDayMap[day]) perDayMap[day] = new Set<string>();
        if (rec.type === 'in') {
          perDayMap[day].add(rec.uid);
          unionSet.add(rec.uid);
        }
        if (day === todayStr) {
          if (rec.type === 'in') todayIn++;
          if (rec.type === 'out') todayOut++;
        }
      });
      const perDayCounts: Record<string, number> = {};
      Object.keys(perDayMap).forEach((k) => perDayCounts[k] = perDayMap[k].size);
      setEventStats({ perDay: perDayCounts, uniqueAllDays: unionSet.size, todayIn, todayOut });
    }, async (error) => {
      // Composite index missing fallback: subscribe without filter and filter client-side.
      console.warn('CheckIns index missing. Falling back to client-side filtering.', error);
      const fbRef = query(collection(db, 'CheckIns'), orderBy('at', 'desc'));
      fallbackUnsub = onSnapshot(fbRef, async (snap) => {
        const docs = currentEventId ? snap.docs.filter(d => (((d.data() as any).eventId) || '') === currentEventId) : snap.docs;

        // Recent list
        const items = await Promise.all(docs.slice(0, 10).map(async (d) => {
          const rec = d.data() as any;
          const uSnap = await getDoc(doc(db, 'Users', rec.uid));
          const u = uSnap.exists() ? (uSnap.data() as any) : {};
          const ts = (rec.at && typeof (rec.at as any).toDate === 'function') ? (rec.at as any).toDate().toLocaleString() : new Date().toLocaleString();
          return { uid: rec.uid, fullName: u.fullName || u.email || 'Unknown User', category: u.category || 'Visitor', timestamp: ts, type: rec.type };
        }));
        setRecentCheckIns(items);

        // Stats (last 4 days)
        const since = new Date();
        since.setDate(since.getDate() - 4);
        const perDayMap: Record<string, Set<string>> = {};
        const unionSet: Set<string> = new Set();
        let todayIn = 0;
        let todayOut = 0;
        const todayStr = formatDay(new Date());
        docs.forEach((d) => {
          const rec = d.data() as any;
          const at = rec.at && typeof (rec.at as any).toDate === 'function' ? (rec.at as any).toDate() : new Date();
          if (at < since) return;
          const day = rec.eventDay || formatDay(at);
          if (!perDayMap[day]) perDayMap[day] = new Set<string>();
          if (rec.type === 'in') {
            perDayMap[day].add(rec.uid);
            unionSet.add(rec.uid);
          }
          if (day === todayStr) {
            if (rec.type === 'in') todayIn++;
            if (rec.type === 'out') todayOut++;
          }
        });
        const perDayCounts: Record<string, number> = {};
        Object.keys(perDayMap).forEach((k) => perDayCounts[k] = perDayMap[k].size);
        setEventStats({ perDay: perDayCounts, uniqueAllDays: unionSet.size, todayIn, todayOut });
      });
    });

    return () => { if (fallbackUnsub) fallbackUnsub(); unsub(); };
  }, [activeTab, currentEventId]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load analytics data when event changes
  useEffect(() => {
    if (currentEventId) {
      loadAnalyticsData();
    }
  }, [currentEventId]);

  // Fetch notifications when user is available
  useEffect(() => {
    if (user?.uid) {
      fetchNotifications();

      // Set up real-time listener for notifications - completely avoid composite index
      // Only filter by userId, sort client-side to avoid index requirement
      const q = query(
        collection(db, 'Notifications'),
        where('userId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notificationData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as any)).sort((a, b) => {
          // Sort by createdAt desc client-side to completely avoid composite index requirement
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        }).slice(0, 20); // Limit to 20 after sorting

        setNotifications(notificationData);
        setUnreadCount(notificationData.filter((n: any) => !n.read).length);
      }, (error) => {
        console.warn('Error with notifications query, attempting alternative approach:', error);
        // If we still get an error, try a simpler query without any ordering
        try {
          const simpleQuery = query(
            collection(db, 'Notifications'),
            where('userId', '==', user.uid)
          );

          onSnapshot(simpleQuery, (snapshot) => {
            const notificationData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as any)).sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || new Date(0);
              const bTime = b.createdAt?.toDate?.() || new Date(0);
              return bTime.getTime() - aTime.getTime();
            }).slice(0, 20);

            setNotifications(notificationData);
            setUnreadCount(notificationData.filter((n: any) => !n.read).length);
          });
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
        }
      });

      return () => unsubscribe();
    }
  }, [user?.uid]);

  // Prevent hydration errors by ensuring client-side only rendering
  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col bg-[#181f2a] font-avenir">
        <div className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-[#1c2331] to-[#232b3e] border-b border-[#0d6efd]/20 shadow-lg h-16">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-[#232b3e] rounded animate-pulse"></div>
            <div className="h-6 w-32 bg-[#232b3e] rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  console.log('🏠 ORGANIZER DEBUG: Render - user:', user ? user.email : 'none', 'userProfile:', userProfile ? 'exists' : 'none');

  if (!user) {
    console.log('🏠 ORGANIZER DEBUG: Showing auth form (no user)');
    // Show the same working authentication form used on the home page
    return (
      <div className="min-h-screen w-full bg-[#0b1020] flex items-center justify-center p-4">
        <AuthForm />
      </div>
    );
  }

  // Show loading while user profile is being fetched
  if (user && !userProfile) {
    console.log('🏠 ORGANIZER DEBUG: Showing loading screen (user but no profile)');
    return (
      <div className="min-h-screen flex flex-col bg-[#181f2a] font-avenir">
        <div className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-[#1c2331] to-[#232b3e] border-b border-[#0d6efd]/20 shadow-lg h-16">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-[#232b3e] rounded animate-pulse"></div>
            <div className="h-6 w-32 bg-[#232b3e] rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d6efd] mx-auto mb-4"></div>
            <div className="text-white text-lg">Loading your dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181f2a] font-avenir">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1c2331] to-[#232b3e] border-b border-[#0d6efd]/20 shadow-lg">
        <div className="flex items-center gap-4">
          <img
            src={logoUrl}
            alt="Logo"
            className="h-8 w-auto"
            style={{ height: `${logoSize}px` }}
          />
          <h1 className="text-xl font-bold text-white">{appName}</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-300 hover:text-white transition-colors"
            >
              <FontAwesomeIcon icon={faBell} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <p className="text-sm text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.createdAt?.toDate?.()?.toLocaleString() || 'Unknown time'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-white font-medium text-sm">{userProfile?.fullName || user?.email}</p>
              <p className="text-gray-400 text-xs">{userProfile?.position || 'Organizer'}</p>
            </div>
            <button
              onClick={() => auth.signOut()}
              className="p-2 text-gray-300 hover:text-white transition-colors"
              title="Sign Out"
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 bg-[#1c2331] border-r border-white/10">
          <nav className="p-4 space-y-2">
            {[
            { id: 'Overview', icon: faChartBar, label: 'Overview' },
            { id: 'Events', icon: faCalendar, label: 'Events' },
            { id: 'Event Builder', icon: faEdit, label: 'Event Builder' },
            { id: 'Floorplan Designer', icon: faMapMarkerAlt, label: 'Floorplan Designer' },
            { id: 'Attendees', icon: faUsers, label: 'Attendees' },
            { id: 'Exhibitors', icon: faBuilding, label: 'Exhibitors' },
            { id: 'Check-In System', icon: faQrcode, label: 'Check-In System' },
            { id: 'Settings', icon: faCog, label: 'Settings' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
                <div className="flex items-center gap-3">
                  <select
                    value={currentEventId}
                    onChange={(e) => setCurrentEventId(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="default">Default Event</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>{event.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faUsers} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Attendees</p>
                      <p className="text-2xl font-bold text-white">{attendees.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faUserCheck} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Checked In Today</p>
                      <p className="text-2xl font-bold text-white">{eventStats.todayIn}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faBuilding} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Exhibitors</p>
                      <p className="text-2xl font-bold text-white">{exhibitors.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faHandshake} className="text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Matches</p>
                      <p className="text-2xl font-bold text-white">{matches.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Analytics Charts */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white">Event Analytics</h3>

                {/* 3-Day Event Analytics */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <EventAnalyticsChart
                    eventStats={eventAnalytics}
                    dailyStats={dailyStats}
                    leadsByExhibitor={leadsByExhibitor}
                  />
                </div>

                {/* Footfall Analysis */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <FootfallChart dailyStats={dailyStats} />
                </div>

                {/* Lead Generation Analysis */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <LeadConversionChart leadsByExhibitor={leadsByExhibitor} />
                </div>
              </div>

              {/* Traditional Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-4">Attendance Trends</h3>
                  <AttendanceChart data={eventStats.perDay} />
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-4">Category Distribution</h3>
                  <CategoryPieChart attendees={attendees} />
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {recentCheckIns.slice(0, 5).map((checkIn, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className={`w-3 h-3 rounded-full bg-${checkIn.type === 'in' ? 'green' : 'red'}-400`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{checkIn.fullName}</p>
                        <p className="text-gray-400 text-xs">{checkIn.category}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${checkIn.type === 'in' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                          {checkIn.type === 'in' ? 'Check-in' : 'Check-out'}
                        </span>
                        <p className="text-gray-400 text-xs mt-1">{checkIn.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'Events' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Event Management</h2>
                <button
                  onClick={() => setShowEventModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Create Event
                </button>
              </div>

              {/* Events List */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="space-y-4">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <div key={event.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-semibold">{event.name}</h3>
                            <p className="text-gray-400 text-sm">{event.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-300">
                              <span>{event.startDate} - {event.endDate}</span>
                              <span>{event.location}</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                event.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                              }`}>
                                {event.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingEvent(event);
                                setEventForm(event);
                                setShowEventModal(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteItem('Events', event.id, event.name)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <FontAwesomeIcon icon={faCalendar} className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No events found</p>
                      <button
                        onClick={() => setShowEventModal(true)}
                        className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Create Your First Event
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Attendees Tab */}
          {activeTab === 'Attendees' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Attendee Management</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Search attendees..."
                    value={badgeFilter.search}
                    onChange={(e) => setBadgeFilter(prev => ({ ...prev, search: e.target.value }))}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                  />
                  <select
                    value={badgeFilter.category}
                    onChange={(e) => setBadgeFilter(prev => ({ ...prev, category: e.target.value }))}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                  >
                    {badgeCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attendees Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAttendees.map((attendee) => (
                  <div key={attendee.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faUser} className="text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{attendee.fullName || attendee.email}</h3>
                        <p className="text-gray-400 text-sm">{attendee.category || 'Visitor'}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="text-gray-300">{attendee.company || 'No company'}</p>
                      <p className="text-gray-300">{attendee.position || 'No position'}</p>
                      <p className="text-gray-300">{attendee.email}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => {
                          setEditingAttendeeForBadge(attendee);
                          setShowBadgeEditorModal(true);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Edit Badge
                      </button>
                      <button
                        onClick={() => printIndividualBadge(attendee)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Print
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredAttendees.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <FontAwesomeIcon icon={faUsers} className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No attendees found</p>
                </div>
              )}
            </div>
          )}

          {/* Exhibitors Tab */}
          {activeTab === 'Exhibitors' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Exhibitor Management</h2>
                <button
                  onClick={() => setScannerResult('❌ Account creation must be done through the registration form. Please direct users to /signin to create accounts.')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add Exhibitor
                </button>
              </div>

              {/* Exhibitors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exhibitors.map((exhibitor) => (
                  <div key={exhibitor.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faBuilding} className="text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{exhibitor.name}</h3>
                        <p className="text-gray-400 text-sm">Booth: {exhibitor.boothId || 'Not assigned'}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="text-gray-300">{exhibitor.description || 'No description'}</p>
                      <p className="text-gray-300">{exhibitor.contactEmail}</p>
                      <p className="text-gray-300">{exhibitor.contactPhone}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => {
                          setEditingExhibitor(exhibitor);
                          setEditForm(exhibitor);
                          setShowEditModal(true);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem('Exhibitors', exhibitor.id, exhibitor.name)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {exhibitors.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <FontAwesomeIcon icon={faBuilding} className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No exhibitors found</p>
                </div>
              )}
            </div>
          )}

          {/* Check-In System Tab */}
          {activeTab === 'Check-In System' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Check-In System</h2>
                <div className="flex items-center gap-3">
                  {!scanning ? (
                    <button
                      onClick={startScanning}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faCamera} />
                      Start Scanner
                    </button>
                  ) : (
                    <button
                      onClick={stopScanning}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faStop} />
                      Stop Scanner
                    </button>
                  )}
                </div>
              </div>

              {/* QR Scanner */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div id="qr-reader" className="w-full"></div>
                {scannerResult && (
                  <div className={`mt-4 p-3 rounded-lg text-center ${
                    scannerResult.includes('✅') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {scannerResult}
                  </div>
                )}
              </div>

              {/* Recent Check-Ins */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Recent Check-Ins</h3>
                <div className="space-y-3">
                  {recentCheckIns.length > 0 ? (
                    recentCheckIns.slice(0, 10).map((checkIn, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <div className={`w-3 h-3 rounded-full bg-${checkIn.type === 'in' ? 'green' : 'red'}-400`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm">{checkIn.fullName}</p>
                          <p className="text-gray-400 text-xs">{checkIn.category}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${checkIn.type === 'in' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {checkIn.type === 'in' ? 'Check-in' : 'Check-out'}
                          </span>
                          <p className="text-gray-400 text-xs mt-1">{checkIn.timestamp}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <FontAwesomeIcon icon={faClock} className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No recent check-ins</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'Settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Settings</h2>

              {/* App Branding */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">App Branding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">App Name</label>
                    <input
                      type="text"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Logo Size</label>
                    <input
                      type="number"
                      value={logoSize}
                      onChange={(e) => setLogoSize(parseInt(e.target.value))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* Event Configuration */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Event Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Current Event ID</label>
                    <input
                      type="text"
                      value={currentEventId}
                      onChange={(e) => setCurrentEventId(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Logo URL</label>
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* Save Settings */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    localStorage.setItem('globalAppName', appName);
                    localStorage.setItem('globalLogoUrl', logoUrl);
                    localStorage.setItem('globalLogoSize', logoSize.toString());
                    localStorage.setItem('globalEventId', currentEventId);
                    setScannerResult('✅ Settings saved successfully!');
                    setTimeout(() => setScannerResult(''), 3000);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faSave} />
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* Event Builder Tab */}
          {activeTab === 'Event Builder' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Event Builder</h2>
                <button
                  onClick={() => router.push('/events')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faEdit} />
                  Open Event Builder
                </button>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-center py-8">
                  <FontAwesomeIcon icon={faEdit} className="w-16 h-16 mx-auto mb-4 text-blue-400 opacity-50" />
                  <h3 className="text-xl font-semibold text-white mb-2">Event Builder</h3>
                  <p className="text-gray-400 mb-4">Create and manage your events with the comprehensive event builder tool.</p>
                  <button
                    onClick={() => router.push('/events')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                    Launch Event Builder
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floorplan Designer Tab */}
          {activeTab === 'Floorplan Designer' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Floorplan Designer</h2>
                <button
                  onClick={() => router.push('/floorplan')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                  Open Floorplan Designer
                </button>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-center py-8">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-50" />
                  <h3 className="text-xl font-semibold text-white mb-2">Floorplan Designer</h3>
                  <p className="text-gray-400 mb-4">Design and manage your event floorplan with interactive booth placement and exhibitor mapping.</p>
                  <button
                    onClick={() => router.push('/floorplan')}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                  >
                    <FontAwesomeIcon icon={faMapMarkerAlt} />
                    Launch Floorplan Designer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other tabs */}
          {activeTab !== 'Overview' && activeTab !== 'Events' && activeTab !== 'Attendees' && activeTab !== 'Exhibitors' && activeTab !== 'Check-In System' && activeTab !== 'Settings' && activeTab !== 'Event Builder' && activeTab !== 'Floorplan Designer' && (
            <div className="text-center py-12 text-gray-400">
              <FontAwesomeIcon icon={faLightbulb} className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-white mb-2">{activeTab} Coming Soon</h3>
              <p>This feature is under development and will be available soon.</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {scannerResult && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          scannerResult.includes('✅') ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          {scannerResult}
        </div>
      )}
    </div>
  );
}
