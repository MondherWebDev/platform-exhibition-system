"use client";
import React, { useState, useEffect } from "react";
import { db, auth } from "../../../firebaseConfig";
import AuthForm from "../../../components/AuthForm";
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc, setDoc, query, where, orderBy, limit, onSnapshot, addDoc, deleteDoc, increment } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { authService, UserProfile } from "../../../utils/authService";
import ClientOnly from '../../../components/ClientOnly';
import { generateQRCodeData } from "../../../utils/badgeService";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPrint,
  faSearch,
  faFilter,
  faDownload,
  faCog,
  faBars,
  faSignOutAlt,
  faBell,
  faInfoCircle,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
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
  faCog as faCogIcon,
  faBars as faBarsIcon,
  faSignOutAlt as faSignOutAltIcon,
  faBell as faBellIcon,
  faInfoCircle as faInfoCircleIcon,
  faPrint as faPrintIcon,
  faSearch as faSearchIconIcon,
  faFilter as faFilterIconIcon,
  faDownload as faDownloadIconIcon,
  faCog as faCogIconIcon,
  faBars as faBarsIconIcon,
  faSignOutAlt as faSignOutAltIconIcon,
  faBell as faBellIconIcon,
  faInfoCircle as faInfoCircleIconIcon,
  faCheckCircle as faCheckCircleIcon,
  faTimesCircle as faTimesCircleIcon,
  faSpinner as faSpinnerIcon,
  faEye as faEyeIcon,
  faEdit as faEditIcon,
  faTrash as faTrashIcon,
  faPlus as faPlusIcon,
  faRefresh as faRefreshIcon,
  faPlay as faPlayIcon,
  faStop as faStopIcon,
  faPause as faPauseIcon,
  faForward as faForwardIcon,
  faBackward as faBackwardIcon,
  faSort as faSortIcon,
  faSortUp as faSortUpIcon,
  faSortDown as faSortDownIcon,
  faUser,
  faBuilding,
  faEnvelope,
  faPhone,
  faGlobe,
  faMapMarkerAlt,
  faIndustry,
  faUsers,
  faCrown,
  faStar,
  faLightbulb,
  faHandshake,
  faCalendar,
  faClock,
  faEye as faEyeIconIcon,
  faEyeSlash,
  faLock,
  faUnlock,
  faExclamationTriangle,
  faCheck,
  faArrowRight,
  faArrowLeft,
  faIdBadge,
  faMagic,
  faBrain,
  faTrophy,
  faMedal,
  faAward,
  faThumbsUp,
  faThumbsDown,
  faQrcode,
  faCamera,
  faDesktop,
  faLaptop,
  faTablet,
  faMobile,
  faWifi,
  faChartBar,
  faPrint as faPrintIconIcon,
  faCopy,
  faScissors,
  faPaste,
  faUndo,
  faRedo,
  faBold,
  faItalic,
  faUnderline,
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faListUl,
  faListOl,
  faQuoteLeft,
  faCode,
  faLink,
  faImage,
  faVideo,
  faMusic,
  faFile,
  faFolder,
  faFolderOpen,
  faSave,
  faShare,
  faCloud,
  faCloudUpload,
  faCloudDownload,
  faDatabase,
  faServer,
  faShield,
  faLock as faLockIcon,
  faUnlock as faUnlockIcon,
  faKey,
  faUserSecret,
  faUserShield,
  faUserLock,
  faBan,
  faFlag,
  faWarning,
  faExclamation,
  faQuestion,
  faInfo,
  faBug,
  faWrench,
  faTools,
  faHammer,
  faScrewdriver,
  faWrench as faWrenchIcon,
  faTools as faToolsIcon,
  faHammer as faHammerIcon,
  faScrewdriver as faScrewdriverIcon
} from '@fortawesome/free-solid-svg-icons';

interface Attendee {
  id: string;
  fullName: string;
  email: string;
  company: string;
  position: string;
  category: string;
  badgeStatus?: string;
  badgeId?: string;
  photoUrl?: string;
  phone?: string;
  industry?: string;
  linkedin?: string;
}

interface PrintJob {
  id: string;
  attendeeId: string;
  attendeeName: string;
  badgeData: any;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  createdAt: any;
  printedAt?: any;
  printerName?: string;
  errorMessage?: string;
}

export default function BadgePrintingStation() {
  const [user, setUser] = React.useState<any>(null);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [attendees, setAttendees] = React.useState<Attendee[]>([]);
  const [printJobs, setPrintJobs] = React.useState<PrintJob[]>([]);
  const [currentEventId, setCurrentEventId] = React.useState<string>('default');
  const [isClient, setIsClient] = React.useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('All');
  const [badgeStatusFilter, setBadgeStatusFilter] = React.useState('All');

  // Print queue state
  const [printQueue, setPrintQueue] = React.useState<Set<string>>(new Set());
  const [selectedAttendees, setSelectedAttendees] = React.useState<Set<string>>(new Set());
  const [printing, setPrinting] = React.useState(false);
  const [printStatus, setPrintStatus] = React.useState('');

  // Print preview state
  const [showPrintPreview, setShowPrintPreview] = React.useState(false);
  const [selectedAttendeeForPreview, setSelectedAttendeeForPreview] = React.useState<Attendee | null>(null);
  const [previewQRCode, setPreviewQRCode] = React.useState<string>('');

  // Printer settings
  const [printerSettings, setPrinterSettings] = React.useState({
    printerName: 'Default Printer',
    paperSize: 'A5',
    orientation: 'landscape',
    quality: 'normal',
    copies: 1,
    autoCut: true,
    badgeTemplate: 'default'
  });

  // Statistics
  const [stats, setStats] = React.useState({
    totalAttendees: 0,
    pendingBadges: 0,
    printedToday: 0,
    printQueueSize: 0
  });

  // Authentication check
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'Users', u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          // Allow registration staff and organizers to access printing
          if (data.category === 'Organizer' || data.category === 'Admin' || data.category === 'Agent') {
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

    // Load all attendees
    const attendeesUnsub = onSnapshot(
      collection(db, 'Users'),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Attendee));
        setAttendees(data);
      }
    );

    // Load print jobs
    const printJobsUnsub = onSnapshot(
      query(collection(db, 'PrintJobs'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as PrintJob));
        setPrintJobs(data);
      }
    );

    return () => {
      attendeesUnsub();
      printJobsUnsub();
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



  // Generate QR code when preview modal opens
  React.useEffect(() => {
    if (showPrintPreview && selectedAttendeeForPreview) {
      generateQRCodeForPreview();
    }
  }, [showPrintPreview, selectedAttendeeForPreview]);

  // Generate QR code for preview
  const generateQRCodeForPreview = async () => {
    if (!selectedAttendeeForPreview) return;

    try {
      // Generate QR code data using the attendee's information
      const qrData = generateQRCodeData(
        selectedAttendeeForPreview.id,
        selectedAttendeeForPreview.category,
        currentEventId
      );

      // Generate QR code image using the qrcode library
      const QRCodeLib = await import('qrcode');
      const QRCode = QRCodeLib.default || QRCodeLib;

      const qrCodeImage = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      setPreviewQRCode(qrCodeImage);
    } catch (error) {
      console.error('Error generating QR code for preview:', error);
      // Fallback to a simple placeholder
      setPreviewQRCode('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjEyOCIgeT0iMTM2IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiMwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlFSPC90ZXh0Pjwvc3ZnPg==');
    }
  };

  // Calculate statistics
  React.useEffect(() => {
    const totalAttendees = attendees.length;
    const pendingBadges = attendees.filter(a => a.badgeStatus !== 'printed').length;
    const today = new Date().toISOString().split('T')[0];
    const printedToday = printJobs.filter(job => {
      const jobDate = job.createdAt?.toDate?.()?.toISOString().split('T')[0];
      return jobDate === today && job.status === 'completed';
    }).length;
    const printQueueSize = printQueue.size;

    setStats({
      totalAttendees,
      pendingBadges,
      printedToday,
      printQueueSize
    });
  }, [attendees, printJobs, printQueue]);

  // Filter attendees
  const filteredAttendees = React.useMemo(() => {
    return attendees.filter((attendee) => {
      const matchesSearch = !searchQuery ||
        attendee.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.company.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'All' || attendee.category === categoryFilter;
      const matchesBadgeStatus = badgeStatusFilter === 'All' ||
        (badgeStatusFilter === 'pending' && attendee.badgeStatus !== 'printed') ||
        (badgeStatusFilter === 'printed' && attendee.badgeStatus === 'printed');

      return matchesSearch && matchesCategory && matchesBadgeStatus;
    });
  }, [attendees, searchQuery, categoryFilter, badgeStatusFilter]);

  // Print individual badge
  const printIndividualBadge = async (attendee: Attendee) => {
    try {
      setPrinting(true);
      setPrintStatus(`Preparing badge for ${attendee.fullName}...`);

      // Add to print queue
      setPrintQueue(prev => new Set([...prev, attendee.id]));

      // Create print job
      const printJobData: Omit<PrintJob, 'id'> = {
        attendeeId: attendee.id,
        attendeeName: attendee.fullName,
        badgeData: {
          name: attendee.fullName || '',
          role: attendee.position || '',
          company: attendee.company || '',
          category: attendee.category || '',
          qrCode: attendee.id || ''
        },
        status: 'pending',
        createdAt: serverTimestamp()
      };

      const printJobRef = await addDoc(collection(db, 'PrintJobs'), printJobData);

      // Simulate printing process
      setPrintStatus(`Printing badge for ${attendee.fullName}...`);

      // Update print job status
      await updateDoc(printJobRef, {
        status: 'printing',
        printerName: printerSettings.printerName
      });

      // Simulate printing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Complete print job
      await updateDoc(printJobRef, {
        status: 'completed',
        printedAt: serverTimestamp()
      });

      // Update attendee badge status
      await updateDoc(doc(db, 'Users', attendee.id), {
        badgeStatus: 'printed',
        badgePrintedAt: serverTimestamp()
      });

      // Remove from print queue
      setPrintQueue(prev => {
        const newQueue = new Set(prev);
        newQueue.delete(attendee.id);
        return newQueue;
      });

      setPrintStatus(`✅ Badge printed successfully for ${attendee.fullName}`);
      setTimeout(() => setPrintStatus(''), 3000);

    } catch (error) {
      console.error('Error printing badge:', error);
      setPrintStatus('❌ Error printing badge');
      setTimeout(() => setPrintStatus(''), 3000);
    } finally {
      setPrinting(false);
    }
  };

  // Print selected badges
  const printSelectedBadges = async () => {
    if (selectedAttendees.size === 0) {
      setPrintStatus('❌ Please select attendees first');
      setTimeout(() => setPrintStatus(''), 3000);
      return;
    }

    setPrinting(true);
    try {
      const selectedAttendeeList = attendees.filter(a => selectedAttendees.has(a.id));

      for (const attendee of selectedAttendeeList) {
        await printIndividualBadge(attendee);
        // Small delay between prints
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Error printing selected badges:', error);
      setPrintStatus('❌ Error printing badges');
      setTimeout(() => setPrintStatus(''), 3000);
    } finally {
      setPrinting(false);
      setSelectedAttendees(new Set());
    }
  };

  // Print all pending badges
  const printAllPending = async () => {
    const pendingAttendees = attendees.filter(a => a.badgeStatus !== 'printed');
    if (pendingAttendees.length === 0) {
      setPrintStatus('❌ No pending badges to print');
      setTimeout(() => setPrintStatus(''), 3000);
      return;
    }

    setSelectedAttendees(new Set(pendingAttendees.map(a => a.id)));
    await printSelectedBadges();
  };

  // Test printer connection
  const testPrinter = async () => {
    setPrintStatus('Testing printer connection...');
    try {
      // Simulate printer test
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPrintStatus('✅ Printer test successful');
      setTimeout(() => setPrintStatus(''), 3000);
    } catch (error) {
      setPrintStatus('❌ Printer test failed');
      setTimeout(() => setPrintStatus(''), 3000);
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
          <div className="text-white">Loading Printing Station...</div>
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

  if (!userProfile || (userProfile.category !== 'Organizer' && userProfile.category !== 'Admin' && userProfile.category !== 'Agent')) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <FontAwesomeIcon icon={faTimesCircle} className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>Only organizers and registration staff can access the printing station.</p>
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
            <FontAwesomeIcon icon={faPrint} className="text-slate-400 text-3xl" />
            <div>
              <h1 className="text-xl font-bold text-white">Badge Printing Station</h1>
              <p className="text-slate-200 text-sm">Print attendee badges for event registration</p>
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
          <div className="bg-slate-600/20 rounded-xl p-4 border border-slate-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Total Attendees</p>
                <p className="text-2xl font-bold text-white">{stats.totalAttendees}</p>
              </div>
              <FontAwesomeIcon icon={faUsers} className="text-slate-400 text-2xl" />
            </div>
          </div>

          <div className="bg-yellow-600/20 rounded-xl p-4 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-300 text-sm">Pending Badges</p>
                <p className="text-2xl font-bold text-white">{stats.pendingBadges}</p>
              </div>
              <FontAwesomeIcon icon={faClock} className="text-yellow-400 text-2xl" />
            </div>
          </div>

          <div className="bg-green-600/20 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm">Printed Today</p>
                <p className="text-2xl font-bold text-white">{stats.printedToday}</p>
              </div>
              <FontAwesomeIcon icon={faCheckCircle} className="text-green-400 text-2xl" />
            </div>
          </div>

          <div className="bg-purple-600/20 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm">Print Queue</p>
                <p className="text-2xl font-bold text-white">{stats.printQueueSize}</p>
              </div>
              <FontAwesomeIcon icon={faListOl} className="text-purple-400 text-2xl" />
            </div>
          </div>
        </div>

        {/* Print Controls */}
        <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Print Controls</h3>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${printing ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
              <span className="text-sm text-gray-300">
                {printing ? 'Printing...' : 'Ready'}
              </span>
            </div>
          </div>

          {/* Printer Status */}
          {printStatus && (
            <div className={`p-4 rounded-lg border mb-4 ${printStatus.includes('✅') ? 'bg-green-500/10 border-green-500/20 text-green-300' : printStatus.includes('❌') ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={printStatus.includes('✅') ? faCheckCircle : printStatus.includes('❌') ? faTimesCircle : faInfoCircle} className="w-5 h-5" />
                <span>{printStatus}</span>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <button
              onClick={printAllPending}
              disabled={printing || stats.pendingBadges === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPrint} className="w-4 h-4" />
              Print All Pending ({stats.pendingBadges})
            </button>
            <button
              onClick={printSelectedBadges}
              disabled={printing || selectedAttendees.size === 0}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPrint} className="w-4 h-4" />
              Print Selected ({selectedAttendees.size})
            </button>
            <button
              onClick={testPrinter}
              disabled={printing}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
              Test Printer
            </button>
            <button
              onClick={() => setSelectedAttendees(new Set())}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faTimesCircle} className="w-4 h-4" />
              Clear Selection
            </button>
          </div>

          {/* Printer Settings */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Printer Settings</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Printer</label>
                <select
                  value={printerSettings.printerName}
                  onChange={(e) => setPrinterSettings({...printerSettings, printerName: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="Default Printer">Default Printer</option>
                  <option value="Registration Printer 1">Registration Printer 1</option>
                  <option value="Registration Printer 2">Registration Printer 2</option>
                  <option value="Badge Printer">Badge Printer</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Paper Size</label>
                <select
                  value={printerSettings.paperSize}
                  onChange={(e) => setPrinterSettings({...printerSettings, paperSize: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Orientation</label>
                <select
                  value={printerSettings.orientation}
                  onChange={(e) => setPrinterSettings({...printerSettings, orientation: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Copies</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={printerSettings.copies}
                  onChange={(e) => setPrinterSettings({...printerSettings, copies: parseInt(e.target.value) || 1})}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Attendee Search and Selection */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Attendee Management</h3>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Export attendee data
                  const csvData = filteredAttendees.map(a => ({
                    'Name': a.fullName,
                    'Email': a.email,
                    'Company': a.company,
                    'Position': a.position,
                    'Category': a.category,
                    'Badge Status': a.badgeStatus || 'pending',
                    'Phone': a.phone || '',
                    'Industry': a.industry || ''
                  }));

                  const csvContent = [
                    Object.keys(csvData[0]).join(','),
                    ...csvData.map(row => Object.values(row).join(','))
                  ].join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `attendees_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Search attendees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Categories</option>
                <option value="Visitor">Visitor</option>
                <option value="Exhibitor">Exhibitor</option>
                <option value="Organizer">Organizer</option>
                <option value="Speaker">Speaker</option>
                <option value="Media">Media</option>
                <option value="Hosted Buyer">Hosted Buyer</option>
                <option value="VIP">VIP</option>
                <option value="Agent">Agent</option>
              </select>
              <select
                value={badgeStatusFilter}
                onChange={(e) => setBadgeStatusFilter(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Status</option>
                <option value="pending">Pending</option>
                <option value="printed">Printed</option>
              </select>
            </div>
          </div>

          {/* Attendee Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAttendees.map((attendee) => (
              <div key={attendee.id} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedAttendees.has(attendee.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedAttendees);
                      if (e.target.checked) {
                        newSelected.add(attendee.id);
                      } else {
                        newSelected.delete(attendee.id);
                      }
                      setSelectedAttendees(newSelected);
                    }}
                    className="mt-1 w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold truncate">{attendee.fullName}</h4>
                    <p className="text-blue-300 text-sm truncate">{attendee.company}</p>
                    <p className="text-gray-400 text-xs truncate">{attendee.position}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setSelectedAttendeeForPreview(attendee);
                        setShowPrintPreview(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 p-2 rounded transition-colors"
                      title="Preview and print badge"
                    >
                      <FontAwesomeIcon icon={faPrint} className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Category:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      attendee.category === 'Organizer' ? 'bg-orange-500/20 text-orange-300' :
                      attendee.category === 'VIP' ? 'bg-purple-500/20 text-purple-300' :
                      attendee.category === 'Speaker' ? 'bg-green-500/20 text-green-300' :
                      attendee.category === 'Exhibitor' ? 'bg-blue-500/20 text-blue-300' :
                      attendee.category === 'Hosted Buyer' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {attendee.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Badge Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      attendee.badgeStatus === 'printed' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {attendee.badgeStatus === 'printed' ? 'Printed' : 'Pending'}
                    </span>
                  </div>

                  {printQueue.has(attendee.id) && (
                    <div className="flex items-center gap-2 text-blue-300 text-sm">
                      <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin" />
                      <span>Printing...</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faEnvelope} className="w-3 h-3" />
                    <span className="truncate">{attendee.email}</span>
                  </div>
                  {attendee.phone && (
                    <div className="flex items-center gap-2 mt-1">
                      <FontAwesomeIcon icon={faPhone} className="w-3 h-3" />
                      <span>{attendee.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredAttendees.length === 0 && (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faUsers} className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Attendees Found</h3>
              <p className="text-gray-400">
                {attendees.length === 0
                  ? 'No attendees registered yet'
                  : 'No attendees match your current search and filter criteria'
                }
              </p>
            </div>
          )}
        </div>

        {/* Print Queue Status */}
        {printQueue.size > 0 && (
          <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faPrint} className="w-5 h-5 text-blue-400" />
                <span className="text-white font-semibold">Print Queue</span>
                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-sm">
                  {printQueue.size} item{printQueue.size > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-blue-300 text-sm">Processing...</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
            <FontAwesomeIcon icon={faPrint} className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Batch Printing</h3>
            <p className="text-gray-300 text-sm mb-4">
              Print multiple badges efficiently with queue management and status tracking.
            </p>
            <div className="text-xs text-gray-400">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FontAwesomeIcon icon={faListOl} className="w-3 h-3" />
                <span>Queue Management</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                <span>Status Tracking</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
            <FontAwesomeIcon icon={faCog} className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Printer Control</h3>
            <p className="text-gray-300 text-sm mb-4">
              Configure printer settings, test connections, and manage print quality options.
            </p>
            <div className="text-xs text-gray-400">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FontAwesomeIcon icon={faWifi} className="w-3 h-3" />
                <span>Network Printers</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faCog} className="w-3 h-3" />
                <span>Settings Control</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
            <FontAwesomeIcon icon={faChartBar} className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Print Analytics</h3>
            <p className="text-gray-300 text-sm mb-4">
              Track printing statistics, monitor badge distribution, and generate reports.
            </p>
            <div className="text-xs text-gray-400">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FontAwesomeIcon icon={faChartBar} className="w-3 h-3" />
                <span>Usage Statistics</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
                <span>Report Export</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && selectedAttendeeForPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-600 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Print Preview</h3>
                <button
                  onClick={() => {
                    setShowPrintPreview(false);
                    setSelectedAttendeeForPreview(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FontAwesomeIcon icon={faTimesCircle} className="w-6 h-6" />
                </button>
              </div>

              {/* Badge Preview */}
              <div className="bg-white rounded-lg p-6 mb-6 text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="font-bold text-xl text-gray-900">{selectedAttendeeForPreview.fullName}</div>
                      <div className="text-base text-gray-700 font-medium">{selectedAttendeeForPreview.position}</div>
                      <div className="text-sm text-gray-600">{selectedAttendeeForPreview.company}</div>
                    </div>
                    <div className="pt-4">
                      {previewQRCode ? (
                        <img
                          src={previewQRCode}
                          alt="QR Code"
                          className="w-36 h-36 mx-auto border border-gray-300 rounded"
                        />
                      ) : (
                        <div className="w-36 h-36 bg-gray-200 rounded mx-auto flex items-center justify-center">
                          <FontAwesomeIcon icon={faQrcode} className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendee Details */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{selectedAttendeeForPreview.email}</span>
                </div>
                {selectedAttendeeForPreview.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <FontAwesomeIcon icon={faPhone} className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{selectedAttendeeForPreview.phone}</span>
                  </div>
                )}
                {selectedAttendeeForPreview.industry && (
                  <div className="flex items-center gap-3 text-sm">
                    <FontAwesomeIcon icon={faIndustry} className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{selectedAttendeeForPreview.industry}</span>
                  </div>
                )}
              </div>

              {/* Print Settings Preview */}
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <h4 className="text-white font-medium mb-3">Print Settings</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Printer:</span>
                    <div className="text-white">{printerSettings.printerName}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Paper Size:</span>
                    <div className="text-white">{printerSettings.paperSize}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Orientation:</span>
                    <div className="text-white capitalize">{printerSettings.orientation}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Copies:</span>
                    <div className="text-white">{printerSettings.copies}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPrintPreview(false);
                    setSelectedAttendeeForPreview(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowPrintPreview(false);
                    await printIndividualBadge(selectedAttendeeForPreview);
                    setSelectedAttendeeForPreview(null);
                  }}
                  disabled={printing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faPrint} className="w-4 h-4" />
                  {printing ? 'Printing...' : 'Print Badge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
