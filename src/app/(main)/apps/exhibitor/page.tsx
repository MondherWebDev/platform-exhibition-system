"use client";
import React, { useState, useEffect } from "react";
import { db, auth } from "../../../../firebaseConfig";
import { collection, getDocs, doc, updateDoc, setDoc, getDoc, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { processQRCodeScan, QRScanResult } from "../../../../utils/badgeService";
import QRCodeScanner from "../../../../components/QRCodeScanner";
import ClientOnly from '../../../../components/ClientOnly';
import { signOut } from "firebase/auth";

// Simple Icon component using text symbols
const Icon = ({ name, className = "w-4 h-4" }: { name: string; className?: string }) => {
  const iconMap: { [key: string]: string } = {
    handshake: "🤝",
    spinner: "⟳",
    exclamationTriangle: "⚠️",
    checkCircle: "✅",
    users: "👥",
    camera: "📷",
    edit: "✏️",
    save: "💾",
    user: "👤",
    building: "🏢",
    phone: "📞",
    globe: "🌐",
    mapPin: "📍",
    image: "🖼️",
    star: "⭐",
    trophy: "🏆",
    crown: "👑",
    timesCircle: "❌",
    eye: "👁️",
    refresh: "🔄"
  };

  const icon = iconMap[name] || "•";
  return <span className={className}>{icon}</span>;
};

interface LeadRecord {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorCompany: string;
  visitorPosition: string;
  visitorEmail: string;
  exhibitorId: string;
  exhibitorName: string;
  exhibitorCompany: string;
  timestamp: string;
  leadScore: number;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  notes: string;
  followUpDate?: string;
  leadValue: number;
}

interface ExhibitorStats {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  averageLeadScore: number;
  todayLeads: number;
}

export default function ExhibitorLeadCapture() {
  const [currentView, setCurrentView] = useState<'scanner' | 'leads' | 'stats' | 'profile'>('scanner');
  const [isClient, setIsClient] = useState(false);
  const [exhibitorInfo, setExhibitorInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentEventId, setCurrentEventId] = useState<string>('default');
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);

  // Scanner modal state
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Leads state
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'leadScore' | 'visitorName'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Stats state
  const [exhibitorStats, setExhibitorStats] = useState<ExhibitorStats>({
    totalLeads: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    convertedLeads: 0,
    averageLeadScore: 0,
    todayLeads: 0
  });

  // Lead management
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadNotes, setLeadNotes] = useState('');
  const [leadStatus, setLeadStatus] = useState<'new' | 'contacted' | 'qualified' | 'converted' | 'rejected'>('new');
  const [followUpDate, setFollowUpDate] = useState('');

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Company showcase modal state
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    position: '',
    company: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    address: '',
    industry: '',
    companySize: '',
    boothId: '',
    bio: '',
    logoUrl: ''
  });

  useEffect(() => {
    setIsClient(true);

    // Load global settings and exhibitor info
    const loadInitialData = async () => {
      // Load global settings
      const sDoc = await getDoc(doc(db, 'AppSettings', 'global'));
      if (sDoc.exists()) {
        const s = sDoc.data() as any;
        if (s.eventId) {
          setCurrentEventId(s.eventId);
        }
      }

      // Load exhibitor info
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'Users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setExhibitorInfo(data);
          // Initialize profile form with current data
          setProfileForm({
            fullName: data.fullName || '',
            position: data.position || '',
            company: data.company || '',
            contactEmail: data.contactEmail || '',
            contactPhone: data.contactPhone || '',
            website: data.website || '',
            address: data.address || '',
            industry: data.industry || '',
            companySize: data.companySize || '',
            boothId: data.boothId || '',
            bio: data.bio || data.companyDescription || '',
            logoUrl: data.logoUrl || ''
          });

          console.log('🔍 Loaded exhibitor data:', {
            fullName: data.fullName,
            company: data.company,
            bio: data.bio,
            companyDescription: data.companyDescription,
            logoUrl: data.logoUrl,
            boothId: data.boothId,
            uid: data.uid
          });
        }
      }
    };

    loadInitialData();

    // Load leads and stats
    loadLeads();
    loadExhibitorStats();

    // Set up real-time listeners
    setupRealtimeListeners();
  }, []);

  // Filter and sort leads when dependencies change
  useEffect(() => {
    filterAndSortLeads();
  }, [leads, searchQuery, statusFilter, sortBy, sortOrder]);

  const loadLeads = async () => {
    try {
      const leadsQuery = query(
        collection(db, 'Leads'),
        where('exhibitorId', '==', auth.currentUser?.uid || ''),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const leadsSnapshot = await getDocs(leadsQuery);
      const leadsList: LeadRecord[] = [];

      leadsSnapshot.forEach((doc) => {
        const data = doc.data();
        leadsList.push({
          id: doc.id,
          visitorId: data.visitorId,
          visitorName: data.visitorInfo?.name || 'Unknown Visitor',
          visitorCompany: data.visitorInfo?.company || '',
          visitorPosition: data.visitorInfo?.position || '',
          visitorEmail: data.visitorInfo?.email || '',
          exhibitorId: data.exhibitorId,
          exhibitorName: data.exhibitorInfo?.company || '',
          exhibitorCompany: data.exhibitorInfo?.company || '',
          timestamp: data.timestamp,
          leadScore: data.leadScore || 0,
          status: data.status || 'new',
          notes: data.notes || '',
          followUpDate: data.followUpDate || '',
          leadValue: data.value || 0
        });
      });

      setLeads(leadsList);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const loadExhibitorStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get today's leads count
      const todayLeadsQuery = query(
        collection(db, 'Leads'),
        where('exhibitorId', '==', auth.currentUser?.uid || ''),
        where('timestamp', '>=', `${today}T00:00:00.000Z`),
        where('timestamp', '<=', `${today}T23:59:59.999Z`)
      );

      const todayLeadsSnapshot = await getDocs(todayLeadsQuery);
      const todayCount = todayLeadsSnapshot.size;

      // Calculate stats from all leads
      const statsQuery = query(
        collection(db, 'Leads'),
        where('exhibitorId', '==', auth.currentUser?.uid || '')
      );

      const statsSnapshot = await getDocs(statsQuery);

      let totalLeads = 0;
      let newLeads = 0;
      let qualifiedLeads = 0;
      let convertedLeads = 0;
      let totalScore = 0;

      statsSnapshot.forEach((doc) => {
        const data = doc.data();
        totalLeads++;
        totalScore += data.leadScore || 0;

        switch (data.status) {
          case 'new':
            newLeads++;
            break;
          case 'qualified':
            qualifiedLeads++;
            break;
          case 'converted':
            convertedLeads++;
            break;
        }
      });

      setExhibitorStats({
        totalLeads,
        newLeads,
        qualifiedLeads,
        convertedLeads,
        averageLeadScore: totalLeads > 0 ? Math.round(totalScore / totalLeads) : 0,
        todayLeads: todayCount
      });
    } catch (error) {
      console.error('Error loading exhibitor stats:', error);
    }
  };

  const setupRealtimeListeners = () => {
    // Listen for real-time lead updates
    const leadsQuery = query(
      collection(db, 'Leads'),
      where('exhibitorId', '==', auth.currentUser?.uid || ''),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
      const leadsList: LeadRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        leadsList.push({
          id: doc.id,
          visitorId: data.visitorId,
          visitorName: data.visitorInfo?.name || 'Unknown Visitor',
          visitorCompany: data.visitorInfo?.company || '',
          visitorPosition: data.visitorInfo?.position || '',
          visitorEmail: data.visitorInfo?.email || '',
          exhibitorId: data.exhibitorId,
          exhibitorName: data.exhibitorInfo?.company || '',
          exhibitorCompany: data.exhibitorInfo?.company || '',
          timestamp: data.timestamp,
          leadScore: data.leadScore || 0,
          status: data.status || 'new',
          notes: data.notes || '',
          followUpDate: data.followUpDate || '',
          leadValue: data.value || 0
        });
      });
      setLeads(leadsList);

      // Update stats in real-time
      loadExhibitorStats();
    });

    return () => {
      unsubscribeLeads();
    };
  };

  const filterAndSortLeads = () => {
    let filtered = leads;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.visitorName.toLowerCase().includes(query) ||
        lead.visitorCompany.toLowerCase().includes(query) ||
        lead.visitorEmail.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'leadScore':
          aValue = a.leadScore;
          bValue = b.leadScore;
          break;
        case 'visitorName':
          aValue = a.visitorName.toLowerCase();
          bValue = b.visitorName.toLowerCase();
          break;
        default:
          aValue = a.timestamp;
          bValue = b.timestamp;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredLeads(filtered);
  };

  const handleQRCodeScan = async (qrData: string) => {
    if (!auth.currentUser) {
      setError('Exhibitor not authenticated');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await processQRCodeScan(
        qrData,
        auth.currentUser.uid,
        'Exhibitor',
        'lead'
      );

      setScanResult(result);

      if (result.success) {
        setSuccess(result.message);

        // Reload leads and stats after successful scan
        setTimeout(() => {
          loadLeads();
          loadExhibitorStats();
        }, 1000);
      } else {
        setError(result.error || 'Lead capture failed');
      }
    } catch (error: any) {
      console.error('Lead capture error:', error);
      setError(error.message || 'Failed to capture lead');
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: LeadRecord['status'], notes?: string, followUpDate?: string) => {
    try {
      await setDoc(doc(db, 'Leads', leadId), {
        status: newStatus,
        notes: notes || '',
        followUpDate: followUpDate || null,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update local state
      setLeads((prev: LeadRecord[]) => {
        return prev.map((lead: LeadRecord): LeadRecord =>
          lead.id === leadId
            ? { ...lead, status: newStatus, notes: notes || lead.notes, followUpDate: followUpDate || lead.followUpDate }
            : lead
        );
      });

      setShowLeadModal(false);
      setSelectedLead(null);
    } catch (error) {
      console.error('Error updating lead:', error);
      setError('Failed to update lead status');
    }
  };

  const openLeadModal = (lead: LeadRecord) => {
    setSelectedLead(lead);
    setLeadNotes(lead.notes);
    setLeadStatus(lead.status);
    setFollowUpDate(lead.followUpDate || '');
    setShowLeadModal(true);
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) {
      setError('User not authenticated');
      return;
    }

    setProfileLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update user document in Firestore
      await updateDoc(doc(db, 'Users', auth.currentUser.uid), {
        ...profileForm,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setExhibitorInfo((prev: any) => ({ ...prev, ...profileForm }));
      setIsEditingProfile(false);
      setSuccess('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: LeadRecord['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/20 text-blue-400';
      case 'contacted':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'qualified':
        return 'bg-purple-500/20 text-purple-400';
      case 'converted':
        return 'bg-green-500/20 text-green-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status: LeadRecord['status']) => {
    switch (status) {
      case 'new':
        return 'star';
      case 'contacted':
        return 'handshake';
      case 'qualified':
        return 'trophy';
      case 'converted':
        return 'crown';
      case 'rejected':
        return 'timesCircle';
      default:
        return 'infoCircle';
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/signin';
    } catch (error) {
      console.error('Error signing out:', error);
    }
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
            <Icon name="handshake" className="text-blue-400 text-2xl" />
            <div>
              <h1 className="text-xl font-bold text-white">Lead Capture</h1>
              <p className="text-blue-200 text-sm">Scan visitor badges to capture leads</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {exhibitorInfo?.logoUrl ? (
                <img
                  src={exhibitorInfo.logoUrl}
                  alt="Company Logo"
                  className="w-12 h-8 object-contain bg-white/10 rounded-lg p-1"
                />
              ) : (
                <div className="w-12 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Icon name="building" className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="text-left">
                <p className="text-white font-medium">{exhibitorInfo?.company || 'Company'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCompanyModal(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <Icon name="building" className="w-4 h-4" />
                Company
              </button>
              <button
                onClick={handleLogout}
                className="text-red-300 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="text-blue-300 hover:text-white transition-colors"
              >
                Back to Home
              </button>
            </div>
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
            <Icon name="camera" className="w-4 h-4 mr-2" />
            Scanner
          </button>
          <button
            onClick={() => setCurrentView('leads')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              currentView === 'leads'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Icon name="users" className="w-4 h-4 mr-2" />
            My Leads ({leads.length})
          </button>
          <button
            onClick={() => setCurrentView('stats')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              currentView === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Icon name="trophy" className="w-4 h-4 mr-2" />
            Statistics
          </button>
          <button
            onClick={() => setCurrentView('profile')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              currentView === 'profile'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Icon name="user" className="w-4 h-4 mr-2" />
            Profile
          </button>
        </div>

        {/* Scanner Dashboard View */}
        {currentView === 'scanner' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Lead Capture</h2>
              <p className="text-gray-300 mb-6">
                Click the scan button below to open the QR code scanner and capture visitor leads.
              </p>

              <button
                onClick={() => setShowScannerModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200 flex items-center gap-3 mx-auto"
              >
                <Icon name="camera" className="w-6 h-6" />
                Start Scanning
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
                <Icon name="users" className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-400">{exhibitorStats.totalLeads}</div>
                <div className="text-sm text-gray-300">Total Leads</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
                <Icon name="star" className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-400">{exhibitorStats.todayLeads}</div>
                <div className="text-sm text-gray-300">Today</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
                <Icon name="trophy" className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-400">{exhibitorStats.qualifiedLeads}</div>
                <div className="text-sm text-gray-300">Qualified</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
                <Icon name="crown" className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-400">{exhibitorStats.averageLeadScore}%</div>
                <div className="text-sm text-gray-300">Avg Score</div>
              </div>
            </div>

            {/* Recent Leads */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Recent Leads</h2>
              <div className="space-y-3">
                {leads.slice(0, 5).map((lead) => (
                  <div key={lead.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon
                        name={getStatusIcon(lead.status)}
                        className={`w-5 h-5 ${lead.status === 'new' ? 'text-blue-400' : lead.status === 'qualified' ? 'text-purple-400' : 'text-gray-400'}`}
                      />
                      <div>
                        <div className="text-white font-medium">{lead.visitorName}</div>
                        <div className="text-gray-400 text-sm">{lead.visitorCompany}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-300 text-sm">{formatTime(lead.timestamp)}</div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                        {lead.leadScore}%
                      </div>
                    </div>
                  </div>
                ))}
                {leads.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Icon name="camera" className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No leads captured yet. Start scanning to see leads here!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Leads Management View */}
        {currentView === 'leads' && (
          <div className="space-y-6">
            {/* Filters and Search */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search leads by name, company, or email..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="converted">Converted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="timestamp">Date</option>
                    <option value="leadScore">Score</option>
                    <option value="visitorName">Name</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                  >
                    <Icon name={sortOrder === 'asc' ? 'sortUp' : 'sortDown'} />
                  </button>
                </div>
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">My Leads</h2>
                <button
                  onClick={loadLeads}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Icon name="refresh" className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left text-gray-400 py-2">Visitor</th>
                      <th className="text-left text-gray-400 py-2">Company</th>
                      <th className="text-left text-gray-400 py-2">Position</th>
                      <th className="text-left text-gray-400 py-2">Score</th>
                      <th className="text-left text-gray-400 py-2">Status</th>
                      <th className="text-left text-gray-400 py-2">Date</th>
                      <th className="text-left text-gray-400 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="border-b border-white/10">
                        <td className="py-3 text-white font-medium">
                          {lead.visitorName}
                        </td>
                        <td className="py-3 text-gray-300">
                          {lead.visitorCompany}
                        </td>
                        <td className="py-3 text-gray-300">
                          {lead.visitorPosition}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                            {lead.leadScore}%
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-300">
                          {formatDate(lead.timestamp)}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => openLeadModal(lead)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Icon name="eye" className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredLeads.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Icon name="users" className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No leads found matching your criteria</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistics View */}
        {currentView === 'stats' && (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
                <Icon name="users" className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-400">{exhibitorStats.totalLeads}</div>
                <div className="text-sm text-gray-300">Total Leads</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
                <Icon name="star" className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-400">{exhibitorStats.newLeads}</div>
                <div className="text-sm text-gray-300">New Leads</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
                <Icon name="trophy" className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-400">{exhibitorStats.qualifiedLeads}</div>
                <div className="text-sm text-gray-300">Qualified</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
                <Icon name="crown" className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-400">{exhibitorStats.convertedLeads}</div>
                <div className="text-sm text-gray-300">Converted</div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Performance Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">{exhibitorStats.averageLeadScore}%</div>
                  <div className="text-gray-300">Average Lead Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">{exhibitorStats.todayLeads}</div>
                  <div className="text-gray-300">Leads Captured Today</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">
                    {exhibitorStats.totalLeads > 0 ? Math.round((exhibitorStats.qualifiedLeads / exhibitorStats.totalLeads) * 100) : 0}%
                  </div>
                  <div className="text-gray-300">Qualification Rate</div>
                </div>
              </div>
            </div>

            {/* Lead Status Distribution */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Lead Status Distribution</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <span className="text-white">New Leads</span>
                  </div>
                  <span className="text-blue-400 font-semibold">{exhibitorStats.newLeads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-white">Contacted</span>
                  </div>
                  <span className="text-yellow-400 font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                    <span className="text-white">Qualified</span>
                  </div>
                  <span className="text-purple-400 font-semibold">{exhibitorStats.qualifiedLeads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-white">Converted</span>
                  </div>
                  <span className="text-green-400 font-semibold">{exhibitorStats.convertedLeads}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile View */}
        {currentView === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Exhibitor Profile</h2>
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    isEditingProfile
                      ? 'bg-gray-600 hover:bg-gray-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Icon name={isEditingProfile ? 'save' : 'edit'} className="w-4 h-4 mr-2" />
                  {isEditingProfile ? 'Save Profile' : 'Edit Profile'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profile Picture and Basic Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {exhibitorInfo?.logoUrl ? (
                        <img
                          src={exhibitorInfo.logoUrl}
                          alt="Company Logo"
                          className="w-20 h-12 object-contain bg-white/10 rounded-lg p-2"
                        />
                      ) : (
                        <div className="w-20 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                          <Icon name="building" className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">
                        {exhibitorInfo?.fullName || 'Exhibitor Name'}
                      </h3>
                      <p className="text-gray-300">{exhibitorInfo?.company || 'Company Name'}</p>
                      <p className="text-gray-300">{exhibitorInfo?.position || 'Position'}</p>
                    </div>
                  </div>

                  {/* Logo URL Input (when editing) */}
                  {isEditingProfile && (
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">Logo URL</label>
                      <input
                        type="url"
                        value={profileForm.logoUrl}
                        onChange={(e) => setProfileForm((prev: typeof profileForm) => ({ ...prev, logoUrl: e.target.value }))}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">Full Name</label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm((prev: typeof profileForm) => ({ ...prev, fullName: e.target.value }))}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-white">{exhibitorInfo?.fullName || 'Not provided'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">Position</label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={profileForm.position}
                          onChange={(e) => setProfileForm((prev: typeof profileForm) => ({ ...prev, position: e.target.value }))}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-white">{exhibitorInfo?.position || 'Not provided'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Company</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileForm.company}
                        onChange={(e) => setProfileForm((prev: typeof profileForm) => ({ ...prev, company: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-white">{exhibitorInfo?.company || 'Not provided'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-gray-300 font-medium mb-2">Email</label>
                      {isEditingProfile ? (
                        <input
                          type="email"
                          value={profileForm.contactEmail}
                          onChange={(e) => setProfileForm((prev: typeof profileForm) => ({ ...prev, contactEmail: e.target.value }))}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-white break-words">{exhibitorInfo?.contactEmail || 'Not provided'}</p>
                      )}
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-gray-300 font-medium mb-2">Phone</label>
                      {isEditingProfile ? (
                        <input
                          type="tel"
                          value={profileForm.contactPhone}
                          onChange={(e) => setProfileForm((prev: typeof profileForm) => ({ ...prev, contactPhone: e.target.value }))}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-white">{exhibitorInfo?.contactPhone || 'Not provided'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Website</label>
                    {isEditingProfile ? (
                      <input
                        type="url"
                        value={profileForm.website}
                        onChange={(e) => setProfileForm((prev: typeof profileForm) => ({ ...prev, website: e.target.value }))}
                        placeholder="https://example.com"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-white">{exhibitorInfo?.website ? (
                        <a href={exhibitorInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                          {exhibitorInfo.website}
                        </a>
                      ) : 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="mt-8 pt-6 border-t border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Industry</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileForm.industry}
                        onChange={(e) => setProfileForm((prev: typeof profileForm) => ({ ...prev, industry: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-white">{exhibitorInfo?.industry || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Company Size</label>
                    {isEditingProfile ? (
                      <select
                        value={profileForm.companySize}
                        onChange={(e) => setProfileForm((prev: typeof profileForm) => ({ ...prev, companySize: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="500+">500+ employees</option>
                      </select>
                    ) : (
                      <p className="text-white">{exhibitorInfo?.companySize || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Booth ID</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileForm.boothId}
                        onChange={(e) => setProfileForm((prev: typeof profileForm) => ({ ...prev, boothId: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-white">{exhibitorInfo?.boothId || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Address</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm((prev: typeof profileForm) => ({ ...prev, address: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-white">{exhibitorInfo?.address || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-gray-300 font-medium mb-2">Bio / Description</label>
                  {isEditingProfile ? (
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm((prev: typeof profileForm) => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell visitors about your company and what makes you unique..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  ) : (
                    <div className="space-y-2">
                      {exhibitorInfo?.bio && (
                        <p className="text-white">{exhibitorInfo.bio}</p>
                      )}
                      {exhibitorInfo?.companyDescription && exhibitorInfo?.companyDescription !== exhibitorInfo?.bio && (
                        <p className="text-white">{exhibitorInfo.companyDescription}</p>
                      )}
                      {!exhibitorInfo?.bio && !exhibitorInfo?.companyDescription && (
                        <p className="text-gray-400 italic">No description provided</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Save/Cancel buttons for editing */}
              {isEditingProfile && (
                <div className="mt-6 pt-6 border-t border-white/20 flex gap-3">
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon name="save" className="w-5 h-5" />
                    {profileLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingProfile(false);
                      // Reset form to current exhibitor info
                      if (exhibitorInfo) {
                        setProfileForm({
                          fullName: exhibitorInfo.fullName || '',
                          position: exhibitorInfo.position || '',
                          company: exhibitorInfo.company || '',
                          contactEmail: exhibitorInfo.contactEmail || '',
                          contactPhone: exhibitorInfo.contactPhone || '',
                          website: exhibitorInfo.website || '',
                          address: exhibitorInfo.address || '',
                          industry: exhibitorInfo.industry || '',
                          companySize: exhibitorInfo.companySize || '',
                          boothId: exhibitorInfo.boothId || '',
                          bio: exhibitorInfo.bio || '',
                          logoUrl: exhibitorInfo.logoUrl || ''
                        });
                      }
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Lead Capture Scanner</h2>
                <button
                  onClick={() => setShowScannerModal(false)}
                  className="text-white/70 hover:text-white"
                >
                  <Icon name="timesCircle" className="w-6 h-6" />
                </button>
              </div>
              <p className="text-blue-100 mt-2">Scan visitor QR codes to capture leads</p>
            </div>

            <div className="p-6">
              <QRCodeScanner
                userId={auth.currentUser?.uid || ''}
                userCategory="Exhibitor"
                mode="lead"
                onScanResult={(result: QRScanResult) => {
                  if (result.success) {
                    setSuccess(result.message);
                    // Reload leads and stats after successful scan
                    setTimeout(() => {
                      loadLeads();
                      loadExhibitorStats();
                    }, 1000);
                  } else {
                    setError(result.error || 'Lead capture failed');
                  }
                }}
                onClose={() => setShowScannerModal(false)}
              />

              {loading && (
                <div className="mt-4 text-center">
                  <Icon name="spinner" className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-2" />
                  <p className="text-gray-600">Capturing lead...</p>
                </div>
              )}

              {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-lg flex items-center gap-2">
                  <Icon name="exclamationTriangle" className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mt-4 bg-green-500/10 border border-green-500/20 text-green-600 p-4 rounded-lg flex items-center gap-2">
                  <Icon name="checkCircle" className="w-5 h-5" />
                  <span>{success}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lead Management Modal */}
      {showLeadModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Manage Lead</h2>
                <button
                  onClick={() => setShowLeadModal(false)}
                  className="text-white/70 hover:text-white"
                >
                  <Icon name="timesCircle" className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Lead Info */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  {exhibitorInfo?.logoUrl ? (
                    <img
                      src={exhibitorInfo.logoUrl}
                      alt="Company Logo"
                      className="w-10 h-6 object-contain bg-gray-100 rounded p-1"
                    />
                  ) : (
                    <div className="w-10 h-6 bg-gray-200 rounded flex items-center justify-center">
                      <Icon name="building" className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{exhibitorInfo?.company || 'Company'}</h3>
                    <p className="text-sm text-gray-600">{exhibitorInfo?.fullName || 'Exhibitor'}</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-2">Visitor Information:</h4>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{selectedLead.visitorName}</h3>
                  <p className="text-gray-600">{selectedLead.visitorPosition}</p>
                  <p className="text-gray-600">{selectedLead.visitorCompany}</p>
                  <p className="text-gray-600">{selectedLead.visitorEmail}</p>
                </div>
              </div>

              {/* Status Update */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Status</label>
                <select
                  value={leadStatus}
                  onChange={(e) => setLeadStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Notes</label>
                <textarea
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                />
              </div>

              {/* Follow-up Date */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Follow-up Date (Optional)</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => updateLeadStatus(selectedLead.id, leadStatus, leadNotes, followUpDate)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Update Lead
                </button>
                <button
                  onClick={() => setShowLeadModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Showcase Modal */}
      {showCompanyModal && exhibitorInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white relative">
              <div className="text-center">
                {/* Large Company Logo */}
                <div className="mb-6 flex justify-center">
                  {exhibitorInfo.logoUrl ? (
                    <img
                      src={exhibitorInfo.logoUrl}
                      alt={`${exhibitorInfo.company} Logo`}
                      className="w-32 h-20 object-contain bg-white/10 rounded-xl p-3"
                    />
                  ) : (
                    <div className="w-32 h-20 bg-white/20 rounded-xl flex items-center justify-center">
                      <Icon name="building" className="w-16 h-16 text-white" />
                    </div>
                  )}
                </div>

                {/* Prominent Company Name */}
                <h1 className="text-3xl font-bold mb-2">
                  {exhibitorInfo.company || 'Company Name'}
                </h1>

                {/* Secondary Exhibitor Info */}
                <div className="space-y-1 text-purple-100">
                  <p className="text-xl font-medium">
                    {exhibitorInfo.fullName || 'Exhibitor Name'}
                  </p>
                  <p className="text-lg opacity-90">
                    {exhibitorInfo.position || 'Position'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCompanyModal(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              >
                <Icon name="timesCircle" className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 bg-gray-50">
              {/* Company Details */}
              <div className="space-y-4">
                {exhibitorInfo.bio && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">About</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {exhibitorInfo.bio}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 pt-4 border-t border-gray-200">
                  {exhibitorInfo.contactEmail && (
                    <div className="flex items-center gap-3 text-sm">
                      <Icon name="user" className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{exhibitorInfo.contactEmail}</span>
                    </div>
                  )}

                  {exhibitorInfo.contactPhone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Icon name="phone" className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{exhibitorInfo.contactPhone}</span>
                    </div>
                  )}

                  {exhibitorInfo.website && (
                    <div className="flex items-center gap-3 text-sm">
                      <Icon name="globe" className="w-4 h-4 text-gray-400" />
                      <a
                        href={exhibitorInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {exhibitorInfo.website}
                      </a>
                    </div>
                  )}

                  {exhibitorInfo.boothId && (
                    <div className="flex items-center gap-3 text-sm">
                      <Icon name="mapPin" className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Booth: {exhibitorInfo.boothId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowCompanyModal(false)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
