"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faPrint,
  faEdit,
  faTrash,
  faCopy,
  faEye,
  faEyeSlash,
  faCog,
  faPalette,
  faQrcode,
  faImage,
  faCheck,
  faTimes,
  faSpinner,
  faExclamationTriangle,
  faPlus,
  faSave,
  faArrowLeft,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { BadgeData, BadgeTemplate, BadgeCategory } from '../types/badge';
import { enhancedBadgeService } from '../utils/enhancedBadgeService';

interface EnhancedBadgeGeneratorProps {
  badge?: BadgeData;
  attendee?: {
    id: string;
    fullName?: string;
    email?: string;
    company?: string;
    position?: string;
    category?: BadgeCategory;
    photoUrl?: string;
  };
  onBadgeGenerated?: (badge: BadgeData) => void;
  onBadgeUpdated?: (badge: BadgeData) => void;
  onBadgeDeleted?: (badgeId: string) => void;
  className?: string;
  editMode?: boolean; // New prop to indicate if we're editing an existing badge
}

const EnhancedBadgeGenerator: React.FC<EnhancedBadgeGeneratorProps> = ({
  badge,
  attendee,
  onBadgeGenerated,
  onBadgeUpdated,
  onBadgeDeleted,
  className = '',
  editMode = false
}) => {
  const [currentBadge, setCurrentBadge] = useState<BadgeData | null>(badge || null);
  const [selectedTemplate, setSelectedTemplate] = useState<BadgeTemplate | null>(null);
  const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  // Default templates
  const defaultTemplates: BadgeTemplate[] = [
    {
      id: 'modern',
      name: 'Modern Blue',
      description: 'Clean modern design with blue gradient',
      layout: 'modern',
      backgroundColor: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
      textColor: '#ffffff',
      accentColor: '#60a5fa',
      fontFamily: 'Inter, sans-serif',
      fontSize: { name: 18, role: 14, company: 12 },
      includeQR: true,
      includePhoto: true,
      preview: '/templates/modern.png',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'classic',
      name: 'Classic White',
      description: 'Traditional white background design',
      layout: 'classic',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      accentColor: '#3b82f6',
      fontFamily: 'Georgia, serif',
      fontSize: { name: 16, role: 12, company: 10 },
      includeQR: true,
      includePhoto: true,
      preview: '/templates/classic.png',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'corporate',
      name: 'Corporate Dark',
      description: 'Professional dark theme for corporate events',
      layout: 'corporate',
      backgroundColor: '#1f2937',
      textColor: '#f9fafb',
      accentColor: '#f59e0b',
      fontFamily: 'Roboto, sans-serif',
      fontSize: { name: 16, role: 12, company: 10 },
      includeQR: true,
      includePhoto: true,
      preview: '/templates/corporate.png',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'minimal',
      name: 'Minimal Clean',
      description: 'Simple and clean minimalist design',
      layout: 'minimal',
      backgroundColor: '#f9fafb',
      textColor: '#374151',
      accentColor: '#6b7280',
      fontFamily: 'Inter, sans-serif',
      fontSize: { name: 14, role: 10, company: 8 },
      includeQR: true,
      includePhoto: false,
      preview: '/templates/minimal.png',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  useEffect(() => {
    setTemplates(defaultTemplates);

    // Set initial template based on edit mode or default
    if (editMode && badge?.template) {
      // Find the template that matches the badge's current template
      const badgeTemplate = defaultTemplates.find(t => t.id === badge.template);
      setSelectedTemplate(badgeTemplate || defaultTemplates[0]);
    } else {
      setSelectedTemplate(defaultTemplates[0]);
    }
  }, [editMode, badge]);

  useEffect(() => {
    if (badge) {
      setCurrentBadge(badge);
    }
  }, [badge]);

  const generateOrUpdateBadge = async () => {
    if (!attendee || !selectedTemplate) return;

    setIsGenerating(true);
    setError(null);

    try {
      let badgeData: BadgeData;

      if (currentBadge) {
        // Update existing badge with enhanced feedback
        setShowSuccess('🔄 Updating badge...');

        const updates: Partial<BadgeData> = {
          template: selectedTemplate.id,
          updatedAt: new Date()
        };

        const success = await enhancedBadgeService.updateBadge(
          currentBadge.id,
          updates,
          'current_user' // In real app, get from auth context
        );

        if (!success) {
          throw new Error('Failed to update badge');
        }

        badgeData = { ...currentBadge, ...updates };
        setCurrentBadge(badgeData);
        onBadgeUpdated?.(badgeData);
        setShowSuccess('✅ Badge updated successfully!');
      } else {
        // Create new badge with enhanced feedback
        setShowSuccess('🎨 Creating badge...');

        // Check if user already has a badge to reuse QR code
        const existingBadges = await enhancedBadgeService.getUserBadges(attendee.id);

        if (existingBadges.length > 0) {
          // Use existing badge data but update template
          const existingBadge = existingBadges[0];
          badgeData = await enhancedBadgeService.createBadgeWithExistingQR(
            attendee.id,
            'default',
            selectedTemplate.id,
            existingBadge.qrCode, // Reuse existing QR code
            'current_user'
          );
        } else {
          // Create completely new badge
          badgeData = await enhancedBadgeService.createBadge(
            attendee.id,
            'default',
            selectedTemplate.id,
            'current_user'
          );
        }

        setCurrentBadge(badgeData);
        onBadgeGenerated?.(badgeData);
        setShowSuccess('✅ Badge created successfully!');
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (err) {
      console.error('Error generating badge:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate badge';

      // Provide more specific error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Network error. Please check your connection and try again.';
      } else if (errorMessage.includes('permission')) {
        userFriendlyMessage = 'Permission denied. Please check your access rights.';
      } else if (errorMessage.includes('quota')) {
        userFriendlyMessage = 'Service quota exceeded. Please try again later.';
      } else if (errorMessage.includes('invalid')) {
        userFriendlyMessage = 'Invalid data provided. Please check your input and try again.';
      }

      setError(`❌ ${userFriendlyMessage}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintBadge = async () => {
    if (!currentBadge || !selectedTemplate) return;

    setIsGenerating(true);
    setError(null);

    try {
      const pdfDataUrl = await enhancedBadgeService.generateBadgePDF(currentBadge, selectedTemplate);

      const printWindow = window.open(pdfDataUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      } else {
        // Fallback: download if popup blocked
        const link = document.createElement('a');
        link.href = pdfDataUrl;
        link.download = `${currentBadge.name.replace(/\s+/g, '_')}_badge.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setShowSuccess('✅ Badge sent to printer!');
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (err) {
      console.error('Error printing badge:', err);
      setError(err instanceof Error ? err.message : 'Failed to print badge');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadBadge = async (format: 'pdf' | 'png' = 'pdf') => {
    if (!currentBadge || !selectedTemplate) return;

    setIsGenerating(true);
    setError(null);

    try {
      if (format === 'pdf') {
        const pdfDataUrl = await enhancedBadgeService.generateBadgePDF(currentBadge, selectedTemplate);

        const link = document.createElement('a');
        link.href = pdfDataUrl;
        link.download = `${currentBadge.name.replace(/\s+/g, '_')}_badge.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setShowSuccess('✅ Badge PDF downloaded!');
      } else {
        // For PNG, we'd need to implement canvas-based generation
        throw new Error('PNG download not yet implemented');
      }

      setTimeout(() => setShowSuccess(null), 3000);
    } catch (err) {
      console.error('Error downloading badge:', err);
      setError(err instanceof Error ? err.message : 'Failed to download badge');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteBadge = async () => {
    if (!currentBadge) return;

    // Enhanced confirmation dialog with more details
    const confirmMessage = `Are you sure you want to delete the badge for "${currentBadge.name}"?\n\nThis action cannot be undone and will:\n• Delete the badge from the system\n• Remove all associated data\n• Clear the badge from user records`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log('🗑️ Attempting to delete badge:', currentBadge.id);

      const success = await enhancedBadgeService.deleteBadge(
        currentBadge.id,
        'current_user' // In real app, get from auth context
      );

      console.log('Delete operation result:', success);

      if (success) {
        console.log('✅ Badge deleted successfully');
        setCurrentBadge(null);
        onBadgeDeleted?.(currentBadge.id);
        setShowSuccess('✅ Badge deleted successfully!');

        // Auto-hide success message after 3 seconds
        setTimeout(() => setShowSuccess(null), 3000);
      } else {
        console.error('❌ Delete operation returned false');
        setError('❌ Failed to delete badge - service returned false. Please try again.');
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('❌ Error deleting badge:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete badge';

      // Provide more specific error messages based on error type
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('permission-denied')) {
        userFriendlyMessage = 'Permission denied. You may not have permission to delete this badge.';
      } else if (errorMessage.includes('not-found')) {
        userFriendlyMessage = 'Badge not found. It may have already been deleted.';
      } else if (errorMessage.includes('network')) {
        userFriendlyMessage = 'Network error. Please check your connection and try again.';
      }

      setError(`❌ ${userFriendlyMessage}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCleanupTestBadges = async () => {
    if (!confirm('Are you sure you want to delete all test badges? This action cannot be undone.')) {
      return;
    }

    setIsCleaningUp(true);
    setError(null);

    try {
      console.log('🧹 Starting test badge cleanup...');

      const result = await enhancedBadgeService.cleanupTestBadges();

      if (result.success > 0) {
        setShowSuccess(`✅ Cleaned up ${result.success} test badges successfully!`);
        setTimeout(() => setShowSuccess(null), 3000);
      } else {
        setShowSuccess('ℹ️ No test badges found to clean up.');
        setTimeout(() => setShowSuccess(null), 3000);
      }

      if (result.failed > 0) {
        setError(`❌ Failed to delete ${result.failed} test badges`);
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('❌ Error during cleanup:', err);
      setError(err instanceof Error ? err.message : 'Failed to cleanup test badges');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const getCategoryColor = (category: BadgeCategory): string => {
    const colors: Record<BadgeCategory, string> = {
      'Organizer': 'from-orange-400 to-red-500',
      'VIP': 'from-purple-400 to-pink-500',
      'Speaker': 'from-green-400 to-emerald-500',
      'Exhibitor': 'from-blue-400 to-cyan-500',
      'Media': 'from-yellow-400 to-orange-500',
      'Hosted Buyer': 'from-indigo-400 to-purple-500',
      'Agent': 'from-gray-400 to-slate-500',
      'Visitor': 'from-slate-400 to-gray-500',
    };
    return colors[category] || 'from-blue-400 to-blue-600';
  };

  const renderBadgePreview = () => {
    if (!currentBadge || !selectedTemplate) {
      return (
        <div className="bg-gray-100 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
          <div>
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No badge data available</p>
            <p className="text-sm text-gray-500 mt-2">Generate a badge to see preview</p>
          </div>
        </div>
      );
    }

    const qrValue = currentBadge.qrCode;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        className={`relative w-full max-w-sm mx-auto ${className}`}
        style={{
          // NO BACKGROUND - Make transparent to sit on A5 design
          background: 'transparent',
          color: selectedTemplate.textColor,
          fontFamily: selectedTemplate.fontFamily,
          minHeight: '400px'
          // NO BORDER RADIUS - Remove rounded corners
          // NO BOX SHADOW - Remove shadow
        }}
      >
        {/* Background Pattern */}
        {selectedTemplate.layout === 'modern' && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='${selectedTemplate.textColor}' fill-opacity='0.1'%3E%3Ccircle cx='20' cy='20' r='2'/%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
        )}

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          {/* Top left accent */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 opacity-30"
               style={{ borderColor: selectedTemplate.accentColor }}></div>
          {/* Top right accent */}
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 opacity-30"
               style={{ borderColor: selectedTemplate.accentColor }}></div>
          {/* Bottom left accent */}
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 opacity-30"
               style={{ borderColor: selectedTemplate.accentColor }}></div>
          {/* Bottom right accent */}
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 opacity-30"
               style={{ borderColor: selectedTemplate.accentColor }}></div>
        </div>

        {/* Header - Start from origin (0,0) */}
        <div className="text-center pt-0 pb-4 relative z-10">
          <div className="mb-2">
            <div className="w-16 h-0.5 mx-auto mb-3"
                 style={{ backgroundColor: selectedTemplate.accentColor }}></div>
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider opacity-90 mb-1"
              style={{ fontSize: '10px', letterSpacing: '0.15em' }}>
            QATAR TRAVEL MART 2025
          </h3>
          <p className="text-xs opacity-80 font-medium">
            DOHA, QATAR
          </p>
          <div className="w-16 h-0.5 mx-auto mt-3"
               style={{ backgroundColor: selectedTemplate.accentColor }}></div>
        </div>

        {/* Content - Start from origin (0,0) to match PDF layout */}
        <div className="relative z-10 flex flex-col items-center text-center flex-1 px-6" style={{ marginTop: '0px' }}>
          {/* Photo - Better positioned */}
          {selectedTemplate.includePhoto && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative mt-2 mb-3"
            >
              <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-xl ${
                currentBadge.photoUrl ? '' : 'bg-white/20'
              }`} style={{ borderColor: selectedTemplate.accentColor }}>
                {currentBadge.photoUrl ? (
                  <img
                    src={currentBadge.photoUrl}
                    alt={currentBadge.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span>👤</span>
                )}
              </div>
            </motion.div>
          )}

          {/* Name - Better sized and positioned */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-1.5 leading-tight"
            style={{
              fontSize: `${Math.max(selectedTemplate.fontSize.name - 2, 14)}px`,
              fontWeight: 'bold',
              maxWidth: '220px',
              wordWrap: 'break-word'
            }}
          >
            {currentBadge.name}
          </motion.div>

          {/* Role - Better positioned */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-1.5 opacity-90 leading-tight"
            style={{
              fontSize: `${Math.max(selectedTemplate.fontSize.role - 1, 10)}px`,
              maxWidth: '220px',
              wordWrap: 'break-word'
            }}
          >
            {currentBadge.role}
          </motion.div>

          {/* Company - Better positioned */}
          {currentBadge.company && (
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-2 opacity-80 leading-tight"
              style={{
                fontSize: `${Math.max(selectedTemplate.fontSize.company - 1, 9)}px`,
                maxWidth: '200px',
                wordWrap: 'break-word'
              }}
            >
              {currentBadge.company}
            </motion.div>
          )}

          {/* Category Badge - Better sized and positioned */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
            className={`px-3 py-1.5 rounded-full mb-4 text-white font-bold leading-none`}
            style={{
              backgroundColor: selectedTemplate.accentColor,
              fontSize: '10px',
              maxWidth: '180px',
              wordWrap: 'break-word'
            }}
          >
            {currentBadge.category}
          </motion.div>

          {/* QR Code - Better sized and positioned to match PDF */}
          {selectedTemplate.includeQR && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7, type: "spring", stiffness: 100 }}
              className="flex justify-center"
            >
              <div className={`p-2 rounded-lg ${
                selectedTemplate.backgroundColor === '#ffffff' ? 'bg-white' : 'bg-white/20'
              }`}>
                <QRCodeSVG
                  value={qrValue || `https://event-platform.com/badge/${currentBadge.id}`}
                  size={70} // Smaller to match PDF
                  level="M"
                  includeMargin={true}
                  bgColor="transparent"
                  fgColor={selectedTemplate.textColor}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-2 left-2 right-2 text-center text-xs opacity-60">
          Generated by Enhanced Badge System v2.0
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header Controls */}
      <div className="bg-white rounded-t-lg p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Enhanced Badge Generator</h2>
            <p className="text-gray-600 mt-1">Create, preview, and manage event badges with advanced features</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Cleanup Test Badges Button */}
            <button
              onClick={handleCleanupTestBadges}
              disabled={isCleaningUp}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isCleaningUp ? (
                <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
              )}
              Cleanup Tests
            </button>

            {/* Template Selector Toggle */}
            <button
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPalette} className="w-4 h-4" />
              Templates
            </button>

            {/* Generate/Update Button */}
            <button
              onClick={generateOrUpdateBadge}
              disabled={isGenerating || !attendee || !selectedTemplate}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isGenerating ? (
                <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={currentBadge ? faSave : faPlus} className="w-4 h-4" />
              )}
              {currentBadge ? 'Update Badge' : 'Generate Badge'}
            </button>
          </div>
        </div>

        {/* Attendee Info Display */}
        {attendee && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Attendee Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{attendee.fullName || attendee.email}</span>
              </div>
              <div>
                <span className="text-gray-600">Category:</span>
                <span className="ml-2 font-medium">{attendee.category || 'Visitor'}</span>
              </div>
              <div>
                <span className="text-gray-600">Company:</span>
                <span className="ml-2 font-medium">{attendee.company || 'Not specified'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3"
            >
              <FontAwesomeIcon icon={faCheck} className="w-5 h-5 text-green-500" />
              <span className="text-green-700">{showSuccess}</span>
              <button
                onClick={() => setShowSuccess(null)}
                className="ml-auto text-green-500 hover:text-green-700"
              >
                <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Template Selector */}
      <AnimatePresence>
        {showTemplateSelector && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 border-b border-gray-200 overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Badge Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                      <div className="text-center">
                        <FontAwesomeIcon icon={faPalette} className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-gray-500">{template.layout}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className={template.includeQR ? 'text-green-600' : 'text-gray-400'}>
                        {template.includeQR ? '✓ QR' : '✗ QR'}
                      </span>
                      <span className={template.includePhoto ? 'text-green-600' : 'text-gray-400'}>
                        {template.includePhoto ? '✓ Photo' : '✗ Photo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge Preview and Controls */}
      <div className="bg-gray-50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Badge Preview</h3>
            {selectedTemplate && (
              <div className="text-sm text-gray-600">
                Template: <span className="font-medium">{selectedTemplate.name}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {currentBadge && (
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintBadge}
                disabled={isGenerating}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faPrint} className="w-4 h-4" />
                Print
              </button>

              <button
                onClick={() => handleDownloadBadge('pdf')}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                Download PDF
              </button>

              <button
                onClick={handleDeleteBadge}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Badge Preview - Position at origin (0,0) */}
        <div className="bg-white rounded-lg p-0 min-h-[500px] flex items-center justify-center" style={{ padding: '0px', margin: '0px' }}>
          <div style={{ position: 'absolute', top: '0px', left: '0px', transform: 'none' }}>
            {renderBadgePreview()}
          </div>
        </div>

        {/* Badge Information */}
        {currentBadge && (
          <div className="mt-6 bg-white rounded-lg p-6 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4">Badge Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Badge ID:</span>
                <span className="ml-2 font-mono text-gray-900">{currentBadge.id.substring(0, 16)}...</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  currentBadge.status === 'printed' ? 'bg-green-100 text-green-800' :
                  currentBadge.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {currentBadge.status}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2 text-gray-900">{currentBadge.createdAt.toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-gray-600">Template:</span>
                <span className="ml-2 text-gray-900">{selectedTemplate?.name || 'Unknown'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedBadgeGenerator;
