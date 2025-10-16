"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../../firebaseConfig';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faUsers,
  faSearch,
  faFilter,
  faDownload,
  faEye,
  faStar,
  faCalendar,
  faBuilding,
  faEnvelope,
  faPhone,
  faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';
import GlassCard from '../../../../components/GlassCard';

export default function ExhibitorLeadsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

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

  // Load leads for this exhibitor
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      query(
        collection(db, 'Leads'),
        where('exhibitorUid', '==', user.uid)
      ),
      (snap) => {
        const leadsData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        // Sort leads by createdAt in memory instead of in query
        leadsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        setLeads(leadsData);
        setFilteredLeads(leadsData);
      }
    );

    return () => unsub();
  }, [user]);

  // Filter and search leads
  useEffect(() => {
    let filtered = leads;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.attendeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.attendeeEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (filterBy !== 'all') {
      if (filterBy === 'high') {
        filtered = filtered.filter(lead => (lead.score || 0) >= 80);
      } else if (filterBy === 'medium') {
        filtered = filtered.filter(lead => (lead.score || 0) >= 60 && (lead.score || 0) < 80);
      } else if (filterBy === 'low') {
        filtered = filtered.filter(lead => (lead.score || 0) < 60);
      }
    }

    // Sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
    } else if (sortBy === 'score') {
      filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => (a.attendeeName || '').localeCompare(b.attendeeName || ''));
    }

    setFilteredLeads(filtered);
  }, [leads, searchTerm, filterBy, sortBy]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20';
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'High Priority';
    if (score >= 60) return 'Medium Priority';
    return 'Low Priority';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#181f2a] flex items-center justify-center">
        <div className="text-white/80">Loading your leads...</div>
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
            <span className="text-white text-lg sm:text-xl font-bold tracking-tight">My Leads</span>
            <div className="w-1 h-4 sm:h-6 bg-[#0d6efd]/50 rounded-full hidden sm:block"></div>
            <span className="text-[#6c757d] text-xs sm:text-sm font-medium hidden lg:block">
              {profile?.fullName || user.email}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center gap-2 text-[#6c757d] text-sm">
            <FontAwesomeIcon icon={faUsers} className="text-lg" />
            <span>{leads.length} Total Leads</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-6 overflow-auto bg-[#0f1419]">
        <div className="w-full max-w-7xl mx-auto">
          {/* Stats Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <GlassCard className="p-4 text-center">
              <FontAwesomeIcon icon={faUsers} className="text-2xl text-blue-400 mb-2" />
              <h3 className="text-white font-semibold mb-1">Total Leads</h3>
              <p className="text-2xl font-bold text-white">{leads.length}</p>
              <p className="text-white/70 text-sm">All time</p>
            </GlassCard>

            <GlassCard className="p-4 text-center">
              <FontAwesomeIcon icon={faStar} className="text-2xl text-yellow-400 mb-2" />
              <h3 className="text-white font-semibold mb-1">High Priority</h3>
              <p className="text-2xl font-bold text-white">{leads.filter(l => (l.score || 0) >= 80).length}</p>
              <p className="text-white/70 text-sm">Score ≥ 80</p>
            </GlassCard>

            <GlassCard className="p-4 text-center">
              <FontAwesomeIcon icon={faCalendar} className="text-2xl text-green-400 mb-2" />
              <h3 className="text-white font-semibold mb-1">This Week</h3>
              <p className="text-2xl font-bold text-white">
                {leads.filter(l => {
                  const leadDate = l.createdAt?.toDate?.();
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return leadDate && leadDate >= weekAgo;
                }).length}
              </p>
              <p className="text-white/70 text-sm">Last 7 days</p>
            </GlassCard>

            <GlassCard className="p-4 text-center">
              <FontAwesomeIcon icon={faDownload} className="text-2xl text-purple-400 mb-2" />
              <h3 className="text-white font-semibold mb-1">Avg. Score</h3>
              <p className="text-2xl font-bold text-white">
                {leads.length > 0 ? Math.round(leads.reduce((acc, l) => acc + (l.score || 0), 0) / leads.length) : 0}
              </p>
              <p className="text-white/70 text-sm">Lead quality</p>
            </GlassCard>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search leads by name, company, or email..."
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
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-colors"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="score">Highest Score</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>

          {/* Leads List */}
          <GlassCard className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FontAwesomeIcon icon={faUsers} className="text-blue-400" />
                All Leads ({filteredLeads.length})
              </h2>
              <button
                onClick={() => {
                  // Export functionality
                  const csvContent = [
                    ['Name', 'Email', 'Company', 'Position', 'Score', 'Date Created', 'Notes', 'Status'].join(','),
                    ...filteredLeads.map(lead => [
                      `"${lead.attendeeName || 'N/A'}"`,
                      `"${lead.attendeeEmail || 'N/A'}"`,
                      `"${lead.company || 'N/A'}"`,
                      `"${lead.position || 'N/A'}"`,
                      lead.score || 'N/A',
                      `"${lead.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}"`,
                      `"${(lead.notes || '').replace(/"/g, '""').replace(/,/g, ';')}"`,
                      getScoreLabel(lead.score || 0)
                    ].join(','))
                  ].join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                }}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} />
                Export CSV
              </button>
            </div>

            {filteredLeads.length > 0 ? (
              <div className="space-y-4">
                {filteredLeads.map((lead) => (
                  <div key={lead.id} className="bg-white/5 rounded-lg p-6 border border-white/10 hover:border-white/20 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {(lead.attendeeName || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-white font-bold text-lg">{lead.attendeeName || 'Unknown Visitor'}</h3>
                            <p className="text-white/70 text-sm">{lead.company || 'No company'} • {lead.position || 'No position'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-white/80 text-sm">
                            <FontAwesomeIcon icon={faEnvelope} className="text-blue-400" />
                            <span>{lead.attendeeEmail || 'No email'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/80 text-sm">
                            <FontAwesomeIcon icon={faBuilding} className="text-green-400" />
                            <span>{lead.company || 'No company'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/80 text-sm">
                            <FontAwesomeIcon icon={faCalendar} className="text-purple-400" />
                            <span>{lead.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}</span>
                          </div>
                        </div>

                        {lead.notes && (
                          <div className="mb-4">
                            <p className="text-white/80 text-sm">
                              <strong>Notes:</strong> {lead.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-3 ${getScoreColor(lead.score || 0)}`}>
                          <FontAwesomeIcon icon={faStar} className="mr-1" />
                          Score: {lead.score || 'N/A'}
                        </div>
                        <div className="text-xs text-white/60">
                          {getScoreLabel(lead.score || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faUsers} className="text-6xl text-white/20 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Leads Found</h3>
                <p className="text-white/70 mb-4">
                  {searchTerm || filterBy !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Start scanning visitor badges to generate leads.'}
                </p>
                {!searchTerm && filterBy === 'all' && (
                  <button
                    onClick={() => router.push('/dashboard/exhibitor')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
                  >
                    Start Scanning Badges
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
