"use client";
import React, { useState, useEffect } from "react";
import { db, auth } from "../../../firebaseConfig";
import AuthForm from "../../../components/AuthForm";
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc, setDoc, query, where, orderBy, limit, onSnapshot, addDoc, deleteDoc, increment } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { authService, UserProfile } from "../../../utils/authService";
import ClientOnly from '../../../components/ClientOnly';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagic,
  faUsers,
  faBuilding,
  faCrown,
  faHandshake,
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
  faStar,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faBrain,
  faRobot,
  faLightbulb,
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
  faEye,
  faEdit,
  faTrash,
  faPlus,
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
  faInfoCircle as faInfoCircleIcon
} from '@fortawesome/free-solid-svg-icons';

interface MatchRecommendation {
  id: string;
  buyerId: string;
  exhibitorId: string;
  buyerName: string;
  exhibitorName: string;
  buyerCompany: string;
  exhibitorCompany: string;
  score: number;
  reasons: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'scheduled';
  createdAt: any;
  meetingDate?: string;
  meetingTime?: string;
  meetingLocation?: string;
  notes?: string;
}

export default function MatchmakingEngine() {
  const [user, setUser] = React.useState<any>(null);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [hostedBuyers, setHostedBuyers] = React.useState<any[]>([]);
  const [exhibitors, setExhibitors] = React.useState<any[]>([]);
  const [recommendations, setRecommendations] = React.useState<MatchRecommendation[]>([]);
  const [currentEventId, setCurrentEventId] = React.useState<string>('default');
  const [isClient, setIsClient] = React.useState(false);

  // Filter and search state
  const [filter, setFilter] = React.useState<{
    search: string;
    minScore: number;
    status: string;
    buyerIndustry: string;
    exhibitorIndustry: string;
  }>({
    search: '',
    minScore: 0,
    status: 'All',
    buyerIndustry: 'All',
    exhibitorIndustry: 'All'
  });

  // Modal states
  const [showGenerateModal, setShowGenerateModal] = React.useState<boolean>(false);
  const [showRecommendationModal, setShowRecommendationModal] = React.useState<boolean>(false);
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<MatchRecommendation | null>(null);

  // Generation settings
  const [generationSettings, setGenerationSettings] = React.useState({
    minScore: 0.3,
    maxRecommendations: 10,
    includeExisting: false,
    prioritizeIndustry: true,
    prioritizeBudget: true,
    prioritizeCompanySize: false
  });

  // Loading states
  const [generating, setGenerating] = React.useState(false);
  const [stats, setStats] = React.useState({
    totalMatches: 0,
    pendingMatches: 0,
    acceptedMatches: 0,
    scheduledMeetings: 0,
    averageScore: 0
  });

  // Authentication check
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'Users', u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.category === 'Organizer' || data.category === 'Admin') {
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
    if (!currentEventId) return;

    // Load hosted buyers
    const buyersUnsub = onSnapshot(
      collection(db, 'Events', currentEventId, 'HostedBuyers'),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setHostedBuyers(data);
      }
    );

    // Load exhibitors
    const exhibitorsUnsub = onSnapshot(
      collection(db, 'Events', currentEventId, 'Exhibitors'),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setExhibitors(data);
      }
    );

    // Load existing recommendations
    const recommendationsUnsub = onSnapshot(
      collection(db, 'MatchmakingRecommendations'),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchRecommendation));
        setRecommendations(data);
      }
    );

    return () => {
      buyersUnsub();
      exhibitorsUnsub();
      recommendationsUnsub();
    };
  }, [currentEventId]);

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
    const totalMatches = recommendations.length;
    const pendingMatches = recommendations.filter(r => r.status === 'pending').length;
    const acceptedMatches = recommendations.filter(r => r.status === 'accepted').length;
    const scheduledMeetings = recommendations.filter(r => r.status === 'scheduled').length;
    const averageScore = totalMatches > 0
      ? recommendations.reduce((sum, r) => sum + r.score, 0) / totalMatches
      : 0;

    setStats({
      totalMatches,
      pendingMatches,
      acceptedMatches,
      scheduledMeetings,
      averageScore: Math.round(averageScore * 100) / 100
    });
  }, [recommendations]);

  // Filter recommendations
  const filteredRecommendations = React.useMemo(() => {
    return recommendations.filter((rec) => {
      const matchesSearch = !filter.search ||
        rec.buyerName.toLowerCase().includes(filter.search.toLowerCase()) ||
        rec.exhibitorName.toLowerCase().includes(filter.search.toLowerCase()) ||
        rec.buyerCompany.toLowerCase().includes(filter.search.toLowerCase()) ||
        rec.exhibitorCompany.toLowerCase().includes(filter.search.toLowerCase());

      const matchesMinScore = rec.score >= filter.minScore;
      const matchesStatus = filter.status === 'All' || rec.status === filter.status;

      const buyer = hostedBuyers.find(b => b.id === rec.buyerId);
      const exhibitor = exhibitors.find(e => e.id === rec.exhibitorId);

      const matchesBuyerIndustry = filter.buyerIndustry === 'All' || buyer?.industry === filter.buyerIndustry;
      const matchesExhibitorIndustry = filter.exhibitorIndustry === 'All' || exhibitor?.industry === filter.exhibitorIndustry;

      return matchesSearch && matchesMinScore && matchesStatus && matchesBuyerIndustry && matchesExhibitorIndustry;
    });
  }, [recommendations, filter, hostedBuyers, exhibitors]);

  // AI-powered matching algorithm
  const calculateMatchScore = (buyer: any, exhibitor: any): { score: number; reasons: string[] } => {
    let score = 0;
    const reasons: string[] = [];

    // Industry matching (40% weight)
    if (buyer.industry && exhibitor.industry) {
      if (buyer.industry.toLowerCase() === exhibitor.industry.toLowerCase()) {
        score += 0.4;
        reasons.push(`Same industry: ${buyer.industry}`);
      } else if (generationSettings.prioritizeIndustry) {
        // Check for related industries
        const relatedIndustries: { [key: string]: string[] } = {
          'Technology': ['Healthcare', 'Finance', 'Manufacturing'],
          'Healthcare': ['Technology', 'Manufacturing'],
          'Finance': ['Technology', 'Retail'],
          'Manufacturing': ['Technology', 'Healthcare', 'Energy'],
          'Retail': ['Technology', 'Finance'],
          'Energy': ['Manufacturing', 'Technology']
        };

        const buyerRelated = relatedIndustries[buyer.industry] || [];
        if (buyerRelated.includes(exhibitor.industry)) {
          score += 0.2;
          reasons.push(`Related industries: ${buyer.industry} & ${exhibitor.industry}`);
        }
      }
    }

    // Company size compatibility (20% weight)
    if (buyer.companySize && exhibitor.companySize) {
      const sizeCompatibility: { [key: string]: string[] } = {
        '1-50': ['1-50', '51-200'],
        '51-200': ['1-50', '51-200', '201-1000'],
        '201-1000': ['51-200', '201-1000', '1000+'],
        '1000+': ['201-1000', '1000+']
      };

      const compatibleSizes = sizeCompatibility[buyer.companySize] || [];
      if (compatibleSizes.includes(exhibitor.companySize)) {
        score += 0.2;
        reasons.push(`Compatible company sizes: ${buyer.companySize} & ${exhibitor.companySize}`);
      }
    }

    // Budget alignment (25% weight)
    if (buyer.budget && exhibitor.companySize) {
      const budgetRanges = {
        'Small': ['1-50'],
        'Medium': ['51-200', '201-1000'],
        'Large': ['201-1000', '1000+'],
        'Enterprise': ['1000+']
      };

      // Simple budget alignment based on company size
      let budgetAlignment = 0;
      if (buyer.budget === 'Small' && ['1-50'].includes(exhibitor.companySize)) budgetAlignment = 0.25;
      else if (buyer.budget === 'Medium' && ['51-200', '201-1000'].includes(exhibitor.companySize)) budgetAlignment = 0.25;
      else if (buyer.budget === 'Large' && ['201-1000', '1000+'].includes(exhibitor.companySize)) budgetAlignment = 0.25;
      else if (buyer.budget === 'Enterprise' && exhibitor.companySize === '1000+') budgetAlignment = 0.25;

      score += budgetAlignment;
      if (budgetAlignment > 0) {
        reasons.push(`Budget alignment: ${buyer.budget} & ${exhibitor.companySize} company`);
      }
    }

    // Interest-based matching (15% weight)
    if (buyer.interests && exhibitor.description) {
      const buyerInterests = buyer.interests.toLowerCase();
      const exhibitorDesc = exhibitor.description.toLowerCase();

      const commonKeywords = [
        'technology', 'software', 'hardware', 'solutions', 'services',
        'manufacturing', 'production', 'equipment', 'machinery',
        'healthcare', 'medical', 'pharmaceutical', 'devices',
        'finance', 'banking', 'insurance', 'investment',
        'retail', 'ecommerce', 'consumer', 'products',
        'energy', 'sustainable', 'renewable', 'power'
      ];

      let interestMatches = 0;
      commonKeywords.forEach(keyword => {
        if (buyerInterests.includes(keyword) && exhibitorDesc.includes(keyword)) {
          interestMatches++;
        }
      });

      if (interestMatches > 0) {
        const interestScore = Math.min(interestMatches * 0.05, 0.15);
        score += interestScore;
        reasons.push(`${interestMatches} common interest areas`);
      }
    }

    return { score: Math.min(score, 1.0), reasons };
  };

  // Generate recommendations
  const generateRecommendations = async () => {
    if (hostedBuyers.length === 0 || exhibitors.length === 0) {
      alert('Need both hosted buyers and exhibitors to generate matches');
      return;
    }

    setGenerating(true);
    try {
      const newRecommendations: Omit<MatchRecommendation, 'id'>[] = [];

      for (const buyer of hostedBuyers) {
        for (const exhibitor of exhibitors) {
          // Skip if recommendation already exists (unless including existing)
          if (!generationSettings.includeExisting) {
            const existingRec = recommendations.find(
              r => r.buyerId === buyer.id && r.exhibitorId === exhibitor.id
            );
            if (existingRec) continue;
          }

          const { score, reasons } = calculateMatchScore(buyer, exhibitor);

          if (score >= generationSettings.minScore) {
            newRecommendations.push({
              buyerId: buyer.id,
              exhibitorId: exhibitor.id,
              buyerName: buyer.name,
              exhibitorName: exhibitor.name,
              buyerCompany: buyer.company,
              exhibitorCompany: exhibitor.company,
              score,
              reasons,
              status: 'pending',
              createdAt: serverTimestamp()
            });
          }
        }
      }

      // Limit to max recommendations
      const limitedRecommendations = newRecommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, generationSettings.maxRecommendations);

      // Save to Firestore
      for (const rec of limitedRecommendations) {
        await addDoc(collection(db, 'MatchmakingRecommendations'), rec);
      }

      setShowGenerateModal(false);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('Error generating recommendations');
    } finally {
      setGenerating(false);
    }
  };

  // Update recommendation status
  const updateRecommendationStatus = async (recId: string, status: MatchRecommendation['status'], meetingDetails?: any) => {
    try {
      const updateData: any = { status, updatedAt: serverTimestamp() };

      if (status === 'scheduled' && meetingDetails) {
        updateData.meetingDate = meetingDetails.date;
        updateData.meetingTime = meetingDetails.time;
        updateData.meetingLocation = meetingDetails.location;
        updateData.notes = meetingDetails.notes;
      }

      await updateDoc(doc(db, 'MatchmakingRecommendations', recId), updateData);
    } catch (error) {
      console.error('Error updating recommendation:', error);
    }
  };

  // Delete recommendation
  const deleteRecommendation = async (recId: string) => {
    if (!confirm('Delete this recommendation?')) return;

    try {
      await deleteDoc(doc(db, 'MatchmakingRecommendations', recId));
    } catch (error) {
      console.error('Error deleting recommendation:', error);
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
          <div className="text-white">Loading Matchmaking Engine...</div>
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

  if (!userProfile || (userProfile.category !== 'Organizer' && userProfile.category !== 'Admin')) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <FontAwesomeIcon icon={faTimesCircle} className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>Only organizers can access the matchmaking engine.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-purple-900/80 backdrop-blur-md border-b border-purple-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faBrain} className="text-purple-400 text-2xl" />
            <div>
              <h1 className="text-xl font-bold text-white">B2B Matchmaking Engine</h1>
              <p className="text-purple-200 text-sm">AI-powered buyer-exhibitor matching and meeting scheduler</p>
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
              onClick={async () => {
                await auth.signOut();
                window.location.href = '/signin';
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-purple-600/20 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm">Total Matches</p>
                <p className="text-3xl font-bold text-white">{stats.totalMatches}</p>
              </div>
              <FontAwesomeIcon icon={faHandshake} className="text-purple-400 text-3xl" />
            </div>
          </div>

          <div className="bg-yellow-600/20 rounded-xl p-6 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-300 text-sm">Pending</p>
                <p className="text-3xl font-bold text-white">{stats.pendingMatches}</p>
              </div>
              <FontAwesomeIcon icon={faClock} className="text-yellow-400 text-3xl" />
            </div>
          </div>

          <div className="bg-green-600/20 rounded-xl p-6 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm">Accepted</p>
                <p className="text-3xl font-bold text-white">{stats.acceptedMatches}</p>
              </div>
              <FontAwesomeIcon icon={faCheckCircle} className="text-green-400 text-3xl" />
            </div>
          </div>

          <div className="bg-blue-600/20 rounded-xl p-6 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm">Scheduled</p>
                <p className="text-3xl font-bold text-white">{stats.scheduledMeetings}</p>
              </div>
              <FontAwesomeIcon icon={faCalendar} className="text-blue-400 text-3xl" />
            </div>
          </div>

          <div className="bg-orange-600/20 rounded-xl p-6 border border-orange-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-300 text-sm">Avg Score</p>
                <p className="text-3xl font-bold text-white">{stats.averageScore}</p>
              </div>
              <FontAwesomeIcon icon={faStar} className="text-orange-400 text-3xl" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search matches..."
                  value={filter.search}
                  onChange={(e) => setFilter({...filter, search: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <select
                value={filter.status}
                onChange={(e) => setFilter({...filter, status: e.target.value})}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="All">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="scheduled">Scheduled</option>
              </select>
              <select
                value={filter.minScore}
                onChange={(e) => setFilter({...filter, minScore: parseFloat(e.target.value)})}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="0">All Scores</option>
                <option value="0.3">0.3+ Score</option>
                <option value="0.5">0.5+ Score</option>
                <option value="0.7">0.7+ Score</option>
                <option value="0.9">0.9+ Score</option>
              </select>
            </div>
            <div className="flex gap-3 w-full lg:w-auto">
              <button
                onClick={() => setShowGenerateModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faMagic} className="w-4 h-4" />
                Generate Matches
              </button>
              <button
                onClick={() => {
                  // Export recommendations to CSV
                  const csvData = filteredRecommendations.map(r => ({
                    'Buyer Name': r.buyerName,
                    'Buyer Company': r.buyerCompany,
                    'Exhibitor Name': r.exhibitorName,
                    'Exhibitor Company': r.exhibitorCompany,
                    'Match Score': r.score,
                    'Status': r.status,
                    'Meeting Date': r.meetingDate || '',
                    'Meeting Time': r.meetingTime || '',
                    'Reasons': r.reasons.join('; ')
                  }));

                  const csvContent = [
                    Object.keys(csvData[0]).join(','),
                    ...csvData.map(row => Object.values(row).join(','))
                  ].join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `matchmaking_recommendations_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Recommendations Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          {filteredRecommendations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Match Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Score & Reasons
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Meeting
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredRecommendations.map((rec) => (
                    <tr key={rec.id} className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FontAwesomeIcon icon={faCrown} className="text-yellow-400 text-sm" />
                              <span className="text-white font-medium">{rec.buyerName}</span>
                              <span className="text-gray-400">({rec.buyerCompany})</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <FontAwesomeIcon icon={faBuilding} className="text-blue-400 text-sm" />
                              <span className="text-white font-medium">{rec.exhibitorName}</span>
                              <span className="text-gray-400">({rec.exhibitorCompany})</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                              style={{ width: `${rec.score * 100}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                            rec.score >= 0.8 ? 'bg-green-500/20 text-green-300' :
                            rec.score >= 0.6 ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {(rec.score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rec.reasons.slice(0, 2).map((reason, index) => (
                            <span key={index} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                              {reason}
                            </span>
                          ))}
                          {rec.reasons.length > 2 && (
                            <span className="text-xs bg-gray-500/20 text-gray-300 px-2 py-1 rounded-full">
                              +{rec.reasons.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rec.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          rec.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                          rec.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                          rec.status === 'scheduled' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {rec.status === 'scheduled' ? (
                          <div className="text-sm">
                            <div className="text-white">{rec.meetingDate}</div>
                            <div className="text-gray-400">{rec.meetingTime}</div>
                            {rec.meetingLocation && (
                              <div className="text-gray-400">{rec.meetingLocation}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedRecommendation(rec);
                              setShowRecommendationModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                            title="View details"
                          >
                            <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                          </button>
                          {rec.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateRecommendationStatus(rec.id, 'accepted')}
                                className="text-green-400 hover:text-green-300 p-1 rounded transition-colors"
                                title="Accept match"
                              >
                                <FontAwesomeIcon icon={faThumbsUp} className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => updateRecommendationStatus(rec.id, 'rejected')}
                                className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                                title="Reject match"
                              >
                                <FontAwesomeIcon icon={faThumbsDown} className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteRecommendation(rec.id)}
                            className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                            title="Delete recommendation"
                          >
                            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faBrain} className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Recommendations Yet</h3>
              <p className="text-gray-400 mb-6">
                {hostedBuyers.length === 0 || exhibitors.length === 0
                  ? 'Need both hosted buyers and exhibitors to generate matches'
                  : 'Generate your first AI-powered matchmaking recommendations'
                }
              </p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
              >
                <FontAwesomeIcon icon={faMagic} className="w-4 h-4" />
                Generate First Matches
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Generate Matchmaking Recommendations</h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <FontAwesomeIcon icon={faTimesCircle} className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-blue-400" />
                  <span className="text-blue-300 font-medium">Generation Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Hosted Buyers:</span>
                    <span className="text-white ml-2 font-medium">{hostedBuyers.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Exhibitors:</span>
                    <span className="text-white ml-2 font-medium">{exhibitors.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Possible Matches:</span>
                    <span className="text-white ml-2 font-medium">{hostedBuyers.length * exhibitors.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Existing Recommendations:</span>
                    <span className="text-white ml-2 font-medium">{recommendations.length}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Minimum Match Score: {generationSettings.minScore}</label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    value={generationSettings.minScore}
                    onChange={(e) => setGenerationSettings({...generationSettings, minScore: parseFloat(e.target.value)})}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0.1 (More matches)</span>
                    <span>0.9 (High quality only)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Maximum Recommendations: {generationSettings.maxRecommendations}</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={generationSettings.maxRecommendations}
                    onChange={(e) => setGenerationSettings({...generationSettings, maxRecommendations: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>10 (Conservative)</span>
                    <span>100 (Aggressive)</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={generationSettings.includeExisting}
                      onChange={(e) => setGenerationSettings({...generationSettings, includeExisting: e.target.checked})}
                      className="rounded"
                    />
                    Include existing recommendations (recalculate scores)
                  </label>

                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={generationSettings.prioritizeIndustry}
                      onChange={(e) => setGenerationSettings({...generationSettings, prioritizeIndustry: e.target.checked})}
                      className="rounded"
                    />
                    Prioritize industry alignment (recommended)
                  </label>

                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={generationSettings.prioritizeBudget}
                      onChange={(e) => setGenerationSettings({...generationSettings, prioritizeBudget: e.target.checked})}
                      className="rounded"
                    />
                    Prioritize budget compatibility
                  </label>

                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={generationSettings.prioritizeCompanySize}
                      onChange={(e) => setGenerationSettings({...generationSettings, prioritizeCompanySize: e.target.checked})}
                      className="rounded"
                    />
                    Prioritize company size compatibility
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={generateRecommendations}
                disabled={generating}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faMagic} className="w-4 h-4" />
                    Generate Recommendations
                  </>
                )}
              </button>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recommendation Details Modal */}
      {showRecommendationModal && selectedRecommendation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Match Details</h3>
              <button
                onClick={() => setShowRecommendationModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <FontAwesomeIcon icon={faTimesCircle} className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Buyer Details */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FontAwesomeIcon icon={faCrown} className="text-yellow-400" />
                  <h4 className="text-lg font-semibold text-white">Hosted Buyer</h4>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-400 text-sm">Name:</span>
                    <span className="text-white ml-2 font-medium">{selectedRecommendation.buyerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Company:</span>
                    <span className="text-white ml-2 font-medium">{selectedRecommendation.buyerCompany}</span>
                  </div>
                  {(() => {
                    const buyer = hostedBuyers.find(b => b.id === selectedRecommendation.buyerId);
                    return buyer ? (
                      <>
                        <div>
                          <span className="text-gray-400 text-sm">Industry:</span>
                          <span className="text-white ml-2 font-medium">{buyer.industry || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Company Size:</span>
                          <span className="text-white ml-2 font-medium">{buyer.companySize || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Budget:</span>
                          <span className="text-white ml-2 font-medium">{buyer.budget || 'Not specified'}</span>
                        </div>
                        {buyer.interests && (
                          <div>
                            <span className="text-gray-400 text-sm">Interests:</span>
                            <span className="text-white ml-2 font-medium">{buyer.interests}</span>
                          </div>
                        )}
                      </>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Exhibitor Details */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FontAwesomeIcon icon={faBuilding} className="text-blue-400" />
                  <h4 className="text-lg font-semibold text-white">Exhibitor</h4>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-400 text-sm">Name:</span>
                    <span className="text-white ml-2 font-medium">{selectedRecommendation.exhibitorName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Company:</span>
                    <span className="text-white ml-2 font-medium">{selectedRecommendation.exhibitorCompany}</span>
                  </div>
                  {(() => {
                    const exhibitor = exhibitors.find(e => e.id === selectedRecommendation.exhibitorId);
                    return exhibitor ? (
                      <>
                        <div>
                          <span className="text-gray-400 text-sm">Industry:</span>
                          <span className="text-white ml-2 font-medium">{exhibitor.industry || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Company Size:</span>
                          <span className="text-white ml-2 font-medium">{exhibitor.companySize || 'Not specified'}</span>
                        </div>
                        {exhibitor.description && (
                          <div>
                            <span className="text-gray-400 text-sm">Description:</span>
                            <span className="text-white ml-2 font-medium">{exhibitor.description}</span>
                          </div>
                        )}
                      </>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>

            {/* Match Analysis */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faBrain} className="text-purple-400" />
                Match Analysis
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-400 text-sm">Match Score:</span>
                    <span className={`text-lg font-bold px-2 py-1 rounded ${
                      selectedRecommendation.score >= 0.8 ? 'bg-green-500/20 text-green-300' :
                      selectedRecommendation.score >= 0.6 ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {(selectedRecommendation.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full"
                      style={{ width: `${selectedRecommendation.score * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${
                    selectedRecommendation.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                    selectedRecommendation.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                    selectedRecommendation.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                    selectedRecommendation.status === 'scheduled' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {selectedRecommendation.status.charAt(0).toUpperCase() + selectedRecommendation.status.slice(1)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 text-sm mb-2 block">Match Reasons:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedRecommendation.reasons.map((reason, index) => (
                    <span key={index} className="text-sm bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Meeting Scheduling (if accepted) */}
            {selectedRecommendation.status === 'accepted' && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCalendar} className="text-green-400" />
                  Schedule Meeting
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="date"
                    className="px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-green-500 focus:outline-none"
                    placeholder="Meeting Date"
                  />
                  <input
                    type="time"
                    className="px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-green-500 focus:outline-none"
                    placeholder="Meeting Time"
                  />
                  <input
                    type="text"
                    className="px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-green-500 focus:outline-none"
                    placeholder="Location/Room"
                  />
                </div>
                <button className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  Schedule Meeting
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {selectedRecommendation.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      updateRecommendationStatus(selectedRecommendation.id, 'accepted');
                      setShowRecommendationModal(false);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faThumbsUp} className="w-4 h-4" />
                    Accept Match
                  </button>
                  <button
                    onClick={() => {
                      updateRecommendationStatus(selectedRecommendation.id, 'rejected');
                      setShowRecommendationModal(false);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faThumbsDown} className="w-4 h-4" />
                    Reject Match
                  </button>
                </>
              )}
              <button
                onClick={() => deleteRecommendation(selectedRecommendation.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setShowRecommendationModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
