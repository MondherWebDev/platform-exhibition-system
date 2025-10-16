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
  faPlus,
  faEye,
  faEdit,
  faTrash,
  faStar,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faBuilding,
  faCrown,
  faUsers,
  faChartLine,
  faFilter,
  faSearch,
  faDownload,
  faUpload,
  faCog,
  faBars,
  faSignOutAlt,
  faBell,
  faInfoCircle,
  faMobile,
  faTablet,
  faDesktop,
  faLightbulb,
  faHandshake,
  faCalendar,
  faClock,
  faMapMarkerAlt,
  faPhone,
  faEnvelope,
  faGlobe,
  faTrophy,
  faMedal,
  faAward,
  faThumbsUp,
  faThumbsDown,
  faMagic,
  faEye as faEyeIcon,
  faEdit as faEditIcon,
  faTrash as faTrashIcon,
  faPlus as faPlusIcon,
  faRefresh,
  faPlay,
  faStop,
  faPause,
  faForward,
  faBackward,
  faSort,
  faSortUp,
  faSortDown,
  faFilter as faFilterIcon,
  faSearch as faSearchIcon,
  faDownload as faDownloadIcon,
  faUpload as faUploadIcon,
  faCog as faCogIcon,
  faBars as faBarsIcon,
  faSignOutAlt as faSignOutAltIcon,
  faBell as faBellIcon,
  faInfoCircle as faInfoCircleIcon,
  faQrcode as faQrcodeIcon,
  faCamera as faCameraIcon,
  faPlus as faPlusIconIcon,
  faEye as faEyeIconIcon,
  faEdit as faEditIconIcon,
  faTrash as faTrashIconIcon,
  faStar as faStarIcon,
  faCheckCircle as faCheckCircleIcon,
  faTimesCircle as faTimesCircleIcon,
  faSpinner as faSpinnerIcon,
  faBuilding as faBuildingIcon,
  faCrown as faCrownIcon,
  faUsers as faUsersIcon,
  faChartLine as faChartLineIcon,
  faFilter as faFilterIconIcon,
  faSearch as faSearchIconIcon,
  faDownload as faDownloadIconIcon,
  faUpload as faUploadIconIcon,
  faCog as faCogIconIcon,
  faBars as faBarsIconIcon,
  faSignOutAlt as faSignOutAltIconIcon,
  faBell as faBellIconIcon,
  faInfoCircle as faInfoCircleIconIcon
} from '@fortawesome/free-solid-svg-icons';

interface Lead {
  id: string;
  exhibitorId: string;
  exhibitorName: string;
  exhibitorCompany: string;
  attendeeId: string;
  attendeeName: string;
  attendeeCompany: string;
  attendeeCategory: string;
  score: number;
  status: 'hot' | 'warm' | 'cold';
  notes: string;
  followUp: 'call' | 'email' | 'meeting' | 'demo' | 'none';
  createdAt: any;
  updatedAt: any;
  tags: string[];
  source: 'scan' | 'matchmaking' | 'manual';
  contactInfo?: {
    email?: string;
    phone?: string;
    linkedin?: string;
  };
}

export default function ExhibitorLeadScanner() {
  const [user, setUser] = React.useState<any>(null);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [attendees, setAttendees] = React.useState<any[]>([]);
  const [currentEventId, setCurrentEventId] = React.useState<string>('default');
  const [isClient, setIsClient] = React.useState(false);

  // Scanner state - simplified for modal-based scanner
  const [scannerResult, setScannerResult] = React.useState('');
  const [showScanner, setShowScanner] = React.useState(false);

  // Filter and search state
  const [leadFilter, setLeadFilter] = React.useState<{
    search: string;
    status: string;
    followUp: string;
    score: string;
  }>({
    search: '',
    status: 'All',
    followUp: 'All',
    score: 'All'
  });

  // Modal states
  const [showLeadModal, setShowLeadModal] = React.useState<boolean>(false);
  const [showCreateLeadModal, setShowCreateLeadModal] = React.useState<boolean>(false);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [showScannerHelp, setShowScannerHelp] = React.useState<boolean>(false);

  // Lead form state
  const [leadForm, setLeadForm] = React.useState({
    attendeeId: '',
    attendeeName: '',
    attendeeCompany: '',
    attendeeCategory: 'Visitor',
    score: 5,
    status: 'warm' as Lead['status'],
    notes: '',
    followUp: 'call' as Lead['followUp'],
    tags: '',
    contactEmail: '',
    contactPhone: '',
    linkedin: ''
  });

  // Statistics
  const [stats, setStats] = React.useState({
    totalLeads: 0,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    avgScore: 0,
    conversionRate: 0
  });

  // Authentication check
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'Users', u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          // Allow exhibitors and organizers to access lead scanner
          if (data.category === 'Exhibitor' || data.category === 'Organizer' || data.category === 'Admin') {
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
    if (!currentEventId || !user?.uid) return;

    // Load leads for current exhibitor
    const leadsUnsub = onSnapshot(
      query(collection(db, 'Leads'), where('exhibitorId', '==', user.uid)),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
        setLeads(data);
      }
    );

    // Load all attendees for manual lead creation
    const attendeesUnsub = onSnapshot(
      collection(db, 'Users'),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAttendees(data);
      }
    );

    return () => {
      leadsUnsub();
      attendeesUnsub();
    };
  }, [currentEventId, user?.uid]);

  // Load global settings
  React.useEffect(() => {
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

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Calculate statistics
  React.useEffect(() => {
    const totalLeads = leads.length;
    const hotLeads = leads.filter(l => l.status === 'hot').length;
    const warmLeads = leads.filter(l => l.status === 'warm').length;
    const coldLeads = leads.filter(l => l.status === 'cold').length;
    const avgScore = totalLeads > 0 ? leads.reduce((sum, l) => sum + l.score, 0) / totalLeads : 0;

    setStats({
      totalLeads,
      hotLeads,
      warmLeads,
      coldLeads,
      avgScore: Math.round(avgScore * 10) / 10,
      conversionRate: totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0
    });
  }, [leads]);

  // Filter leads
  const filteredLeads = React.useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = !leadFilter.search ||
        lead.attendeeName.toLowerCase().includes(leadFilter.search.toLowerCase()) ||
        lead.attendeeCompany.toLowerCase().includes(leadFilter.search.toLowerCase()) ||
        lead.notes.toLowerCase().includes(leadFilter.search.toLowerCase());

      const matchesStatus = leadFilter.status === 'All' || lead.status === leadFilter.status;
      const matchesFollowUp = leadFilter.followUp === 'All' || lead.followUp === leadFilter.followUp;
      const matchesScore = leadFilter.score === 'All' ||
        (leadFilter.score === 'high' && lead.score >= 7) ||
        (leadFilter.score === 'medium' && lead.score >= 4 && lead.score < 7) ||
        (leadFilter.score === 'low' && lead.score < 4);

      return matchesSearch && matchesStatus && matchesFollowUp && matchesScore;
    });
  }, [leads, leadFilter]);



  // Create lead from scan
  const createLeadFromScan = async (attendee: any) => {
    try {
      // Filter out undefined values for Firebase compatibility
      const contactInfo: any = {};
      if (attendee.email) contactInfo.email = attendee.email;
      if (attendee.phone) contactInfo.phone = attendee.phone;
      if (attendee.linkedin) contactInfo.linkedin = attendee.linkedin;

      const leadData: Omit<Lead, 'id'> = {
        exhibitorId: user!.uid,
        exhibitorName: userProfile!.fullName || '',
        exhibitorCompany: userProfile!.company || '',
        attendeeId: attendee.id,
        attendeeName: attendee.fullName || attendee.email || 'Unknown',
        attendeeCompany: attendee.company || '',
        attendeeCategory: attendee.category || 'Visitor',
        score: 5, // Default score
        status: 'warm',
        notes: `Scanned at exhibitor booth - ${new Date().toLocaleString()}`,
        followUp: 'call',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tags: [attendee.category || 'Visitor'].filter(Boolean),
        source: 'scan',
        ...(Object.keys(contactInfo).length > 0 && { contactInfo })
      };

      await addDoc(collection(db, 'Leads'), leadData);

      setScannerResult(`✅ Lead captured: ${attendee.fullName || attendee.email}`);
      setTimeout(() => setScannerResult(''), 3000);
    } catch (error) {
      console.error('Error creating lead:', error);
      setScannerResult('❌ Error creating lead');
      setTimeout(() => setScannerResult(''), 3000);
    }
  };

  // Create manual lead
  const createManualLead = async () => {
    if (!leadForm.attendeeId || !leadForm.attendeeName) {
      alert('Please select an attendee');
      return;
    }

    try {
      const leadData: Omit<Lead, 'id'> = {
        exhibitorId: user!.uid,
        exhibitorName: userProfile!.fullName,
        exhibitorCompany: userProfile!.company || '',
        attendeeId: leadForm.attendeeId,
        attendeeName: leadForm.attendeeName,
        attendeeCompany: leadForm.attendeeCompany,
        attendeeCategory: leadForm.attendeeCategory,
        score: leadForm.score,
        status: leadForm.status,
        notes: leadForm.notes,
        followUp: leadForm.followUp,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tags: leadForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        source: 'manual',
        contactInfo: {
          email: leadForm.contactEmail,
          phone: leadForm.contactPhone,
          linkedin: leadForm.linkedin
        }
      };

      await addDoc(collection(db, 'Leads'), leadData);

      setLeadForm({
        attendeeId: '',
        attendeeName: '',
        attendeeCompany: '',
        attendeeCategory: 'Visitor',
        score: 5,
        status: 'warm',
        notes: '',
        followUp: 'call',
        tags: '',
        contactEmail: '',
        contactPhone: '',
        linkedin: ''
      });
      setShowCreateLeadModal(false);
    } catch (error) {
      console.error('Error creating manual lead:', error);
      alert('Error creating lead');
    }
  };

  // Update lead
  const updateLead = async () => {
    if (!selectedLead) return;

    try {
      await updateDoc(doc(db, 'Leads', selectedLead.id), {
        score: selectedLead.score,
        status: selectedLead.status,
        notes: selectedLead.notes,
        followUp: selectedLead.followUp,
        tags: selectedLead.tags,
        updatedAt: serverTimestamp()
      });

      setShowLeadModal(false);
      setSelectedLead(null);
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  // Delete lead
  const deleteLead = async (leadId: string) => {
    if (!confirm('Delete this lead?')) return;

    try {
      await deleteDoc(doc(db, 'Leads', leadId));
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  // Export leads to CSV
  const exportLeadsCSV = () => {
    const csvData = filteredLeads.map(lead => ({
      'Attendee Name': lead.attendeeName,
      'Attendee Company': lead.attendeeCompany,
      'Attendee Category': lead.attendeeCategory,
      'Lead Score': lead.score,
      'Status': lead.status,
      'Follow Up': lead.followUp,
      'Notes': lead.notes,
      'Tags': lead.tags.join(', '),
      'Source': lead.source,
      'Created Date': lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString() : '',
      'Contact Email': lead.contactInfo?.email || '',
      'Contact Phone': lead.contactInfo?.phone || '',
      'LinkedIn': lead.contactInfo?.linkedin || ''
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(field =>
        typeof field === 'string' && field.includes(',') ? `"${field}"` : field
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
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
          <div className="text-white">Loading Lead Scanner...</div>
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

  if (!userProfile || (userProfile.category !== 'Exhibitor' && userProfile.category !== 'Organizer' && userProfile.category !== 'Admin')) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <FontAwesomeIcon icon={faTimesCircle} className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>Only exhibitors and organizers can access the lead scanner.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <header className="bg-blue-900/80 backdrop-blur-md border-b border-blue-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faQrcode} className="text-blue-400 text-2xl" />
            <div>
              <h1 className="text-xl font-bold text-white">Exhibitor Lead Scanner</h1>
              <p className="text-blue-200 text-sm">Scan attendee badges and capture qualified leads</p>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-blue-600/20 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm">Total Leads</p>
                <p className="text-2xl font-bold text-white">{stats.totalLeads}</p>
              </div>
              <FontAwesomeIcon icon={faUsers} className="text-blue-400 text-2xl" />
            </div>
          </div>

          <div className="bg-red-600/20 rounded-xl p-4 border border-red-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-300 text-sm">Hot Leads</p>
                <p className="text-2xl font-bold text-white">{stats.hotLeads}</p>
              </div>
              <FontAwesomeIcon icon={faStar} className="text-red-400 text-2xl" />
            </div>
          </div>

          <div className="bg-yellow-600/20 rounded-xl p-4 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-300 text-sm">Warm Leads</p>
                <p className="text-2xl font-bold text-white">{stats.warmLeads}</p>
              </div>
              <FontAwesomeIcon icon={faCheckCircle} className="text-yellow-400 text-2xl" />
            </div>
          </div>

          <div className="bg-gray-600/20 rounded-xl p-4 border border-gray-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Cold Leads</p>
                <p className="text-2xl font-bold text-white">{stats.coldLeads}</p>
              </div>
              <FontAwesomeIcon icon={faTimesCircle} className="text-gray-400 text-2xl" />
            </div>
          </div>

          <div className="bg-green-600/20 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm">Avg Score</p>
                <p className="text-2xl font-bold text-white">{stats.avgScore}</p>
              </div>
              <FontAwesomeIcon icon={faChartLine} className="text-green-400 text-2xl" />
            </div>
          </div>

          <div className="bg-purple-600/20 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm">Conversion</p>
                <p className="text-2xl font-bold text-white">{stats.conversionRate}%</p>
              </div>
              <FontAwesomeIcon icon={faTrophy} className="text-purple-400 text-2xl" />
            </div>
          </div>
        </div>

        {/* Scanner Section */}
        <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">QR Code Scanner</h3>
            <button
              onClick={() => setShowScannerHelp(true)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              How to use?
            </button>
          </div>

          {/* Scanner Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
            <button
              onClick={() => setShowScanner(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faCamera} className="w-4 h-4" />
              Open Scanner
            </button>

            <button
              onClick={() => setShowCreateLeadModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
              Add Manual Lead
            </button>
          </div>

          {/* Scanner Result */}
          {scannerResult && (
            <div className={`p-4 rounded-lg border mb-4 ${scannerResult.includes('✅') ? 'bg-green-500/10 border-green-500/20 text-green-300' : scannerResult.includes('❌') ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={scannerResult.includes('✅') ? faCheckCircle : scannerResult.includes('❌') ? faTimesCircle : faInfoCircle} className="w-5 h-5" />
                <span>{scannerResult}</span>
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
                  userCategory={userProfile?.category || 'Exhibitor'}
                  mode="lead"
                  onScanResult={async (result) => {
                    if (result.success && result.data) {
                      try {
                        // Get the scanned user data
                        const scannedUserId = result.data.userId;
                        if (!scannedUserId) {
                          setScannerResult('❌ Invalid scan data - no user ID found');
                          setTimeout(() => setScannerResult(''), 4000);
                          setTimeout(() => setShowScanner(false), 2000);
                          return;
                        }

                        // Find the attendee in our attendees list
                        const attendee = attendees.find(a => a.id === scannedUserId);
                        if (!attendee) {
                          setScannerResult('❌ Attendee not found in database');
                          setTimeout(() => setScannerResult(''), 4000);
                          setTimeout(() => setShowScanner(false), 2000);
                          return;
                        }

                        // Check if lead already exists for this attendee
                        const existingLead = leads.find(l => l.attendeeId === attendee.id);
                        if (existingLead) {
                          setScannerResult(`Lead already exists for ${attendee.fullName || attendee.email}`);
                          setTimeout(() => setScannerResult(''), 3000);
                          setTimeout(() => setShowScanner(false), 2000);
                          return;
                        }

                        // Create new lead from scan
                        await createLeadFromScan(attendee);

                        // Show success message
                        setScannerResult(`✅ Lead captured: ${attendee.fullName || attendee.email}`);
                        setTimeout(() => setScannerResult(''), 3000);

                      } catch (error) {
                        console.error('Error processing lead scan:', error);
                        setScannerResult('❌ Error creating lead from scan');
                        setTimeout(() => setScannerResult(''), 4000);
                      }
                    } else {
                      // Handle scan errors
                      setScannerResult(`❌ ${result.message || 'Scan failed'}`);
                      setTimeout(() => setScannerResult(''), 4000);
                    }

                    // Close scanner after processing
                    setTimeout(() => setShowScanner(false), 2000);
                  }}
                  onClose={() => setShowScanner(false)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Leads Management */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Captured Leads</h3>
            <div className="flex gap-3">
              <button
                onClick={exportLeadsCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Search leads..."
                value={leadFilter.search}
                onChange={(e) => setLeadFilter({...leadFilter, search: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={leadFilter.status}
                onChange={(e) => setLeadFilter({...leadFilter, status: e.target.value})}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Status</option>
                <option value="hot">Hot Leads</option>
                <option value="warm">Warm Leads</option>
                <option value="cold">Cold Leads</option>
              </select>
              <select
                value={leadFilter.followUp}
                onChange={(e) => setLeadFilter({...leadFilter, followUp: e.target.value})}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Follow-up</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="demo">Demo</option>
                <option value="none">None</option>
              </select>
              <select
                value={leadFilter.score}
                onChange={(e) => setLeadFilter({...leadFilter, score: e.target.value})}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Scores</option>
                <option value="high">High (7-10)</option>
                <option value="medium">Medium (4-6)</option>
                <option value="low">Low (1-3)</option>
              </select>
            </div>
          </div>

          {/* Leads Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold truncate">{lead.attendeeName}</h4>
                    <p className="text-blue-300 text-sm truncate">{lead.attendeeCompany}</p>
                    <p className="text-gray-400 text-xs capitalize">{lead.attendeeCategory}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setSelectedLead(lead);
                        setShowLeadModal(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                      title="Edit lead"
                    >
                      <FontAwesomeIcon icon={faEdit} className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                      title="Delete lead"
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Score:</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-2 w-16">
                        <div
                          className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full"
                          style={{ width: `${(lead.score / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                        lead.score >= 7 ? 'bg-green-500/20 text-green-300' :
                        lead.score >= 4 ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {lead.score}/10
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lead.status === 'hot' ? 'bg-red-500/20 text-red-300' :
                      lead.status === 'warm' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {lead.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Follow-up:</span>
                    <span className="text-blue-300 text-sm capitalize">{lead.followUp}</span>
                  </div>
                </div>

                {lead.notes && (
                  <div className="mb-3">
                    <p className="text-gray-300 text-sm line-clamp-2">{lead.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Source: {lead.source}</span>
                  <span>{lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString() : 'Unknown'}</span>
                </div>

                {lead.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {lead.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                    {lead.tags.length > 3 && (
                      <span className="text-xs bg-gray-500/20 text-gray-300 px-2 py-1 rounded-full">
                        +{lead.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faUsers} className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Leads Captured Yet</h3>
              <p className="text-gray-400">
                {leads.length === 0
                  ? 'Start scanning attendee badges to capture your first leads'
                  : 'No leads match your current filters'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scanner Help Modal */}
      {showScannerHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">How to Use Lead Scanner</h3>
              <button
                onClick={() => setShowScannerHelp(false)}
                className="text-gray-400 hover:text-white"
              >
                <FontAwesomeIcon icon={faTimesCircle} className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-white">
              <div>
                <h4 className="font-semibold mb-2">📱 Mobile Scanning</h4>
                <p className="text-gray-300">This interface is optimized for mobile devices. Use your phone or tablet camera to scan attendee badges.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🎯 Scanning Process</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-300">
                  <li>Click "Start Scanning" to activate your camera</li>
                  <li>Point your camera at the attendee's QR code</li>
                  <li>Hold steady until the code is recognized</li>
                  <li>The lead will be automatically captured and scored</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">⭐ Lead Scoring</h4>
                <p className="text-gray-300">Leads are automatically scored based on attendee category and interaction quality. You can adjust scores manually after scanning.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">📋 Manual Lead Entry</h4>
                <p className="text-gray-300">Use "Add Manual Lead" if you meet someone without a scannable badge or want to add leads from business cards.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🔄 Real-time Sync</h4>
                <p className="text-gray-300">All leads are synced in real-time across all your devices and the central dashboard.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScannerHelp(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Manual Lead Modal */}
      {showCreateLeadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Add Manual Lead</h3>
              <button
                onClick={() => setShowCreateLeadModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <FontAwesomeIcon icon={faTimesCircle} className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white font-medium mb-2">Select Attendee</label>
                <select
                  value={leadForm.attendeeId}
                  onChange={(e) => {
                    const attendee = attendees.find(a => a.id === e.target.value);
                    if (attendee) {
                      setLeadForm({
                        ...leadForm,
                        attendeeId: attendee.id,
                        attendeeName: attendee.fullName || attendee.email,
                        attendeeCompany: attendee.company || '',
                        attendeeCategory: attendee.category || 'Visitor',
                        contactEmail: attendee.email || '',
                        contactPhone: attendee.phone || '',
                        linkedin: attendee.linkedin || ''
                      });
                    }
                  }}
                  className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select an attendee...</option>
                  {attendees.map((attendee) => (
                    <option key={attendee.id} value={attendee.id}>
                      {attendee.fullName || attendee.email} - {attendee.category || 'Visitor'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Lead Score: {leadForm.score}/10</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={leadForm.score}
                    onChange={(e) => setLeadForm({...leadForm, score: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Status</label>
                  <select
                    value={leadForm.status}
                    onChange={(e) => setLeadForm({...leadForm, status: e.target.value as Lead['status']})}
                    className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="hot">Hot Lead</option>
                    <option value="warm">Warm Lead</option>
                    <option value="cold">Cold Lead</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Follow-up Action</label>
                <select
                  value={leadForm.followUp}
                  onChange={(e) => setLeadForm({...leadForm, followUp: e.target.value as Lead['followUp']})}
                  className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="call">Schedule Call</option>
                  <option value="email">Send Email</option>
                  <option value="meeting">Book Meeting</option>
                  <option value="demo">Arrange Demo</option>
                  <option value="none">No Follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Notes</label>
                <textarea
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({...leadForm, notes: e.target.value})}
                  className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  rows={3}
                  placeholder="Meeting notes, interests, requirements..."
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={leadForm.tags}
                  onChange={(e) => setLeadForm({...leadForm, tags: e.target.value})}
                  className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="VIP, Technology, Budget, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={leadForm.contactEmail}
                    onChange={(e) => setLeadForm({...leadForm, contactEmail: e.target.value})}
                    className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    value={leadForm.contactPhone}
                    onChange={(e) => setLeadForm({...leadForm, contactPhone: e.target.value})}
                    className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">LinkedIn</label>
                  <input
                    type="url"
                    value={leadForm.linkedin}
                    onChange={(e) => setLeadForm({...leadForm, linkedin: e.target.value})}
                    className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={createManualLead}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                Add Lead
              </button>
              <button
                onClick={() => setShowCreateLeadModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showLeadModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Edit Lead</h3>
              <button
                onClick={() => setShowLeadModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <FontAwesomeIcon icon={faTimesCircle} className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Attendee Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white ml-2 font-medium">{selectedLead.attendeeName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Company:</span>
                    <span className="text-white ml-2 font-medium">{selectedLead.attendeeCompany}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Category:</span>
                    <span className="text-white ml-2 font-medium">{selectedLead.attendeeCategory}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Source:</span>
                    <span className="text-white ml-2 font-medium capitalize">{selectedLead.source}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Lead Score: {selectedLead.score}/10</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={selectedLead.score}
                    onChange={(e) => setSelectedLead({...selectedLead, score: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Status</label>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => setSelectedLead({...selectedLead, status: e.target.value as Lead['status']})}
                    className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="hot">Hot Lead</option>
                    <option value="warm">Warm Lead</option>
                    <option value="cold">Cold Lead</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Follow-up Action</label>
                <select
                  value={selectedLead.followUp}
                  onChange={(e) => setSelectedLead({...selectedLead, followUp: e.target.value as Lead['followUp']})}
                  className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="call">Schedule Call</option>
                  <option value="email">Send Email</option>
                  <option value="meeting">Book Meeting</option>
                  <option value="demo">Arrange Demo</option>
                  <option value="none">No Follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Notes</label>
                <textarea
                  value={selectedLead.notes}
                  onChange={(e) => setSelectedLead({...selectedLead, notes: e.target.value})}
                  className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  rows={3}
                  placeholder="Meeting notes, interests, requirements..."
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={selectedLead.tags.join(', ')}
                  onChange={(e) => setSelectedLead({...selectedLead, tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean)})}
                  className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="VIP, Technology, Budget, etc."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={updateLead}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                Update Lead
              </button>
              <button
                onClick={() => setShowLeadModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
