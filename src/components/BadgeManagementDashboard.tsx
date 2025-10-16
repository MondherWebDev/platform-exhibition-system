"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faIdBadge,
  faPlus,
  faSearch,
  faFilter,
  faTrash,
  faCheckCircle,
  faClock,
  faUsers,
  faSpinner,
  faTimes,
  faEdit,
  faEye,
  faDownload,
  faRefresh,
  faFileExport,
  faExclamationTriangle,
  faArrowUp,
  faArrowDown
} from '@fortawesome/free-solid-svg-icons';
import { BadgeData, BadgeCategory, BadgeStatus } from '../types/badge';
import { enhancedBadgeService } from '../utils/enhancedBadgeService';
import EnhancedBadgeGenerator from './EnhancedBadgeGenerator';

interface BadgeManagementDashboardProps {
  eventId?: string;
  className?: string;
}

const BadgeManagementDashboard: React.FC<BadgeManagementDashboardProps> = ({
  eventId = 'default',
  className = ''
}) => {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [filteredBadges, setFilteredBadges] = useState<BadgeData[]>([]);
  const [selectedBadges, setSelectedBadges] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BadgeStatus | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<BadgeCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'status' | 'category'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentView, setCurrentView] = useState<'list' | 'grid' | 'generator'>('list');
  const [selectedBadgeForEdit, setSelectedBadgeForEdit] = useState<BadgeData | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    printed: 0,
    reprint: 0,
    byCategory: {} as Record<BadgeCategory, number>
  });

  // Performance optimization states
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [templateCache, setTemplateCache] = useState<Map<string, any>>(new Map());
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Lazy loading for badge previews
  const loadMoreBadges = () => {
    if (isLoadingMore || visibleRange.end >= filteredBadges.length) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleRange(prev => ({
        start: 0,
        end: Math.min(prev.end + 50, filteredBadges.length)
      }));
      setIsLoadingMore(false);
    }, 300);
  };

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.offsetHeight;

      if (scrollPosition > documentHeight - 1000) {
        loadMoreBadges();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleRange.end, filteredBadges.length, isLoadingMore]);

  // Cache template assets
  const getCachedTemplate = (templateId: string) => {
    if (templateCache.has(templateId)) {
      return templateCache.get(templateId);
    }

    // In a real implementation, this would load template assets from a CDN or cache
    const templateAssets = {
      background: `template-${templateId}-bg.svg`,
      overlay: `template-${templateId}-overlay.svg`,
      fonts: [`font-${templateId}-primary`, `font-${templateId}-secondary`]
    };

    setTemplateCache(prev => new Map(prev.set(templateId, templateAssets)));
    return templateAssets;
  };

  // Load badges and stats
  const loadBadges = async () => {
    try {
      setLoading(true);
      const [badgesData, statsData] = await Promise.all([
        enhancedBadgeService.getEventBadges(eventId),
        enhancedBadgeService.getBadgeStats(eventId)
      ]);

      setBadges(badgesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBadges();

    // Subscribe to real-time updates
    const unsubscribe = enhancedBadgeService.subscribeToBadges(eventId, (updatedBadges) => {
      setBadges(updatedBadges);
    });

    return () => unsubscribe();
  }, [eventId]);

  // Filter and sort badges
  useEffect(() => {
    let filtered = badges;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(badge =>
        badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        badge.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        badge.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(badge => badge.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(badge => badge.category === categoryFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        default:
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredBadges(filtered);
  }, [badges, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder]);

  const handleSelectBadge = (badgeId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedBadges);
    if (isSelected) {
      newSelected.add(badgeId);
    } else {
      newSelected.delete(badgeId);
    }
    setSelectedBadges(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedBadges.size === filteredBadges.length) {
      setSelectedBadges(new Set());
    } else {
      setSelectedBadges(new Set(filteredBadges.map(badge => badge.id)));
    }
    setShowBulkActions(selectedBadges.size !== filteredBadges.length);
  };

  const handleBulkStatusUpdate = async (newStatus: BadgeStatus) => {
    if (selectedBadges.size === 0) return;

    setBulkActionLoading(true);
    try {
      const result = await enhancedBadgeService.bulkUpdateStatus(
        Array.from(selectedBadges),
        newStatus,
        'current_user' // In real app, get from auth context
      );

      if (result.success > 0) {
        await loadBadges(); // Refresh data
        setSelectedBadges(new Set());
        setShowBulkActions(false);
      }
    } catch (error) {
      console.error('Bulk status update error:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm('Are you sure you want to delete this badge? This action cannot be undone.')) {
      return;
    }

    try {
      // Use the enhancedBadgeService for deletion (it handles the full cleanup)
      const success = await enhancedBadgeService.deleteBadge(badgeId, 'dashboard_user');
      if (success) {
        await loadBadges();
        // Show success message
        alert('Badge deleted successfully!');
      } else {
        alert('Failed to delete badge. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting badge:', error);
      alert('Error deleting badge. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBadges.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedBadges.size} badges? This action cannot be undone.`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      // Use enhancedBadgeService for bulk deletion (it handles proper cleanup)
      const deletePromises = Array.from(selectedBadges).map(badgeId =>
        enhancedBadgeService.deleteBadge(badgeId, 'dashboard_user')
      );
      await Promise.all(deletePromises);

      await loadBadges();
      setSelectedBadges(new Set());
      setShowBulkActions(false);
      alert(`Successfully deleted ${selectedBadges.size} badges!`);
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Error deleting badges. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Role', 'Company', 'Category', 'Email', 'Status', 'Created At', 'Template'];
    const csvData = filteredBadges.map(badge => [
      badge.id,
      badge.name,
      badge.role,
      badge.company || '',
      badge.category,
      badge.email || '',
      badge.status,
      badge.createdAt.toISOString(),
      badge.template
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `badges_${eventId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCleanupTestData = async () => {
    if (!confirm('This will delete all badges created during testing. Are you sure?')) {
      return;
    }

    try {
      // Get all badges and filter for test badges
      const allBadges = await enhancedBadgeService.getEventBadges(eventId);
      const testBadges = allBadges.filter(badge =>
        badge.name.toLowerCase().includes('test') ||
        badge.name.toLowerCase().includes('john doe') ||
        badge.name.toLowerCase().includes('jane smith') ||
        badge.name.toLowerCase().includes('test user') ||
        badge.email?.toLowerCase().includes('example.com') ||
        badge.createdAt.getTime() > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
      );

      if (testBadges.length === 0) {
        alert('No test badges found to clean up.');
        return;
      }

      console.log('🧹 Cleaning up test badges:', testBadges.map(b => ({ id: b.id, name: b.name })));

      // Use enhancedBadgeService delete function for each test badge
      const deletePromises = testBadges.map(badge =>
        enhancedBadgeService.deleteBadge(badge.id, 'cleanup_user')
      );
      await Promise.all(deletePromises);

      await loadBadges();
      alert(`Successfully cleaned up ${testBadges.length} test badges!`);
    } catch (error) {
      console.error('Error cleaning up test data:', error);
      alert('Error cleaning up test data. Please try again.');
    }
  };

  const getStatusColor = (status: BadgeStatus) => {
    switch (status) {
      case 'printed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reprint': return 'bg-orange-100 text-orange-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      case 'lost': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: BadgeCategory) => {
    const colors: Record<BadgeCategory, string> = {
      'Organizer': 'bg-orange-100 text-orange-800',
      'VIP': 'bg-purple-100 text-purple-800',
      'Speaker': 'bg-green-100 text-green-800',
      'Exhibitor': 'bg-blue-100 text-blue-800',
      'Media': 'bg-yellow-100 text-yellow-800',
      'Hosted Buyer': 'bg-indigo-100 text-indigo-800',
      'Agent': 'bg-gray-100 text-gray-800',
      'Visitor': 'bg-slate-100 text-slate-800',
    };
    return colors[category] || 'bg-blue-100 text-blue-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading badge management system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-t-lg p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FontAwesomeIcon icon={faIdBadge} className="text-blue-600" />
              Badge Management System
            </h1>
            <p className="text-gray-600 mt-1">Comprehensive badge creation, management, and tracking</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('generator')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
              Create Badge
            </button>

            <button
              onClick={exportToCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faFileExport} className="w-4 h-4" />
              Export CSV
            </button>

            <button
              onClick={handleCleanupTestData}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
              Cleanup Tests
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Badges</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <FontAwesomeIcon icon={faIdBadge} className="text-blue-500 text-2xl" />
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
              </div>
              <FontAwesomeIcon icon={faClock} className="text-yellow-500 text-2xl" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Printed</p>
                <p className="text-2xl font-bold text-green-900">{stats.printed}</p>
              </div>
              <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-2xl" />
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Need Reprint</p>
                <p className="text-2xl font-bold text-orange-900">{stats.reprint}</p>
              </div>
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-orange-500 text-2xl" />
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {showBulkActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-blue-900">
                    {selectedBadges.size} badge{selectedBadges.size > 1 ? 's' : ''} selected
                  </span>

                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        const status = e.target.value as BadgeStatus;
                        if (status) handleBulkStatusUpdate(status);
                      }}
                      className="px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue=""
                    >
                      <option value="">Update Status...</option>
                      <option value="pending">Mark as Pending</option>
                      <option value="printed">Mark as Printed</option>
                      <option value="reprint">Mark for Reprint</option>
                      <option value="damaged">Mark as Damaged</option>
                      <option value="lost">Mark as Lost</option>
                    </select>

                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkActionLoading}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      {bulkActionLoading ? (
                        <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                      ) : (
                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                      )}
                      Delete Selected
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedBadges(new Set());
                    setShowBulkActions(false);
                  }}
                  className="text-blue-600 hover:text-blue-800 p-2"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* View Toggle and Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setCurrentView('grid')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setCurrentView('generator')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'generator'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Badge Generator
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3 flex-1 lg:flex-initial">
            <div className="relative flex-1 lg:w-64">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search badges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BadgeStatus | 'All')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="printed">Printed</option>
              <option value="reprint">Reprint</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as BadgeCategory | 'All')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Categories</option>
              <option value="Organizer">Organizer</option>
              <option value="VIP">VIP</option>
              <option value="Speaker">Speaker</option>
              <option value="Exhibitor">Exhibitor</option>
              <option value="Media">Media</option>
              <option value="Hosted Buyer">Hosted Buyer</option>
              <option value="Agent">Agent</option>
              <option value="Visitor">Visitor</option>
            </select>

            <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-transparent border-none focus:outline-none"
              >
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="category">Category</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 hover:bg-gray-100 rounded-r-lg transition-colors"
              >
                <FontAwesomeIcon icon={sortOrder === 'asc' ? faArrowUp : faArrowDown} className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-gray-50 p-6">
        <AnimatePresence mode="wait">
          {currentView === 'generator' ? (
            <motion.div
              key="generator"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-lg"
            >
              <div className="p-6 border-b border-gray-200">
                <button
                  onClick={() => setCurrentView('list')}
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faArrowUp} className="w-4 h-4" />
                  Back to Badge List
                </button>
              </div>
              <div className="p-6">
                <EnhancedBadgeGenerator
                  badge={selectedBadgeForEdit || undefined}
                  editMode={true}
                  onBadgeUpdated={(updatedBadge) => {
                    console.log('Badge updated:', updatedBadge);
                    loadBadges(); // Refresh the badge list
                  }}
                  onBadgeDeleted={(badgeId) => {
                    console.log('Badge deleted:', badgeId);
                    setCurrentView('list');
                    loadBadges(); // Refresh the badge list
                  }}
                />
              </div>
            </motion.div>
          ) : currentView === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredBadges.map((badge) => (
                <div key={badge.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selectedBadges.has(badge.id)}
                        onChange={(e) => handleSelectBadge(badge.id, e.target.checked)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{badge.name}</h3>
                        <p className="text-sm text-gray-600 truncate">{badge.role}</p>
                        {badge.company && (
                          <p className="text-sm text-gray-500 truncate">{badge.company}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(badge.category)}`}>
                        {badge.category}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(badge.status)}`}>
                        {badge.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 mb-4">
                      Created: {badge.createdAt.toLocaleDateString()}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedBadgeForEdit(badge);
                          setCurrentView('generator');
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <FontAwesomeIcon icon={faEdit} className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBadge(badge.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedBadges.size === filteredBadges.length && filteredBadges.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBadges.map((badge) => (
                      <tr key={badge.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedBadges.has(badge.id)}
                            onChange={(e) => handleSelectBadge(badge.id, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {badge.photoUrl ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={badge.photoUrl}
                                  alt={badge.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <FontAwesomeIcon icon={faUsers} className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{badge.name}</div>
                              <div className="text-sm text-gray-500">{badge.email}</div>
                              {badge.company && (
                                <div className="text-sm text-gray-500">{badge.company}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(badge.category)}`}>
                            {badge.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(badge.status)}`}>
                            {badge.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {badge.createdAt.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedBadgeForEdit(badge);
                                setCurrentView('generator');
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBadge(badge.id)}
                              className="text-red-600 hover:text-red-900"
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

              {filteredBadges.length === 0 && (
                <div className="text-center py-12">
                  <FontAwesomeIcon icon={faIdBadge} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-medium mb-2">No badges found</p>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || statusFilter !== 'All' || categoryFilter !== 'All'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Get started by creating your first badge.'}
                  </p>
                  <button
                    onClick={() => setCurrentView('generator')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                    Create First Badge
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BadgeManagementDashboard;
