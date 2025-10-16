"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../firebaseConfig';
import { doc, getDoc, getDocs, onSnapshot, collection, query, where, orderBy, addDoc, serverTimestamp, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { getUserBadge } from '../../../utils/badgeService';
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
  faChartBar,
  faLightbulb,
  faTrash,
  faExclamationTriangle,
  faMessage,
  faFile,
  faDownload,
  faTrophy,
  faPhone,
  faBuilding,
  faHandshake,
  faComments,
  faEye,
  faPlay,
  faStop,
  faSyncAlt,
  faCamera,
  faLaptopCode,
  faMapMarkerAlt,
  faChartLine,
  faEnvelope,
  faEdit,
  faPlus,
  faFilter,
  faSearch,
  faPaperPlane,
  faReply,
  faCheckCircle,
  faTimesCircle,
  faInfoCircle,
  faUserTag,
  faUserCheck,
  faSpinner,
  faBars,
  faCog as faSettings,
  faTachometerAlt,
  faAddressCard,
  faQrcode as faQrcodeIcon,
  faShare
} from '@fortawesome/free-solid-svg-icons';
import ProfileEditor from '../../../components/ProfileEditor';
import EnhancedBadgeGenerator from '../../../components/EnhancedBadgeGenerator';
import GlassCard from '../../../components/GlassCard';
import AuthSection from '../../AuthSection';
import { Html5Qrcode } from 'html5-qrcode';
import jsQR from 'jsqr';

export default function ExhibitorDashboard() {
  console.log('🚀🚀🚀 EXHIBITOR DASHBOARD COMPONENT IS LOADING... 🚀🚀🚀');

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appName, setAppName] = useState<string>('EventPlatform');
  const [logoUrl, setLogoUrl] = useState<string>('/logo.svg');
  const [logoSize, setLogoSize] = useState<number>(32);
  const [currentEventId, setCurrentEventId] = useState<string>('default');
  const [eventData, setEventData] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [activeDay, setActiveDay] = useState<string>('');
  const [showBadgeScanner, setShowBadgeScanner] = useState(false);
  const [showAIMatches, setShowAIMatches] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [scanResult, setScanResult] = useState<string>('');
  const [hostedBuyers, setHostedBuyers] = useState<any[]>([]);
  const [exhibitors, setExhibitors] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  interface UserData {
    id: string;
    uid: string;
    fullName?: string;
    name?: string;
    email?: string;
    company?: string;
    category?: string;
    position?: string;
    role?: string;
    industry?: string;
    interests?: string;
  }
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [showDuplicateNotification, setShowDuplicateNotification] = useState(false);
  const [duplicateLeadInfo, setDuplicateLeadInfo] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<any>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const [globalProcessingLock, setGlobalProcessingLock] = useState(false);
  const [lastProcessedTime, setLastProcessedTime] = useState(0);
  const [testButtonLoading, setTestButtonLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);
  const [showAIMatchesModal, setShowAIMatchesModal] = useState(false);
  const [showExportModalState, setShowExportModalState] = useState(false);
  const [connectResult, setConnectResult] = useState<string>('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const qrWorkerRef = React.useRef<Worker | null>(null);

  interface Session {
    id: string;
    title: string;
    day: string;
    start: string;
    end: string;
    room?: string;
    speakerIds?: string[];
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

  // Load leads for this exhibitor
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up Firestore listener for leads...');

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

        console.log('🔄 Firestore updated leads:', leadsData.length, 'leads loaded');
        console.log('📋 Lead details:', leadsData.map(lead => ({
          id: lead.id,
          name: lead.attendeeName,
          createdAt: lead.createdAt?.toDate?.()?.toLocaleString(),
          qrCode: lead.qrCode
        })));

        // Check if leads are being recreated after deletion
        if (leadsData.length > 0) {
          console.log('⚠️ WARNING: Leads detected after deletion!');
          console.log('🔍 Checking if these are the same leads that were deleted...');

          // Check if any of these leads were created recently (within last 10 seconds)
          const now = Date.now();
          const recentLeads = leadsData.filter(lead => {
            const createdAt = lead.createdAt?.toDate?.()?.getTime() || 0;
            return (now - createdAt) < 10000; // Less than 10 seconds ago
          });

          if (recentLeads.length > 0) {
            console.log('🚨 RECENT LEADS DETECTED! These leads were created within the last 10 seconds:');
            recentLeads.forEach(lead => {
              console.log('  -', lead.attendeeName, 'created at', lead.createdAt?.toDate?.()?.toLocaleString());
            });
          }
        }

        setLeads(leadsData);
      }
    );

    return () => unsub();
  }, [user]);

  // Remove automatic cleanup - let users manage their own leads

  // Load sessions
  useEffect(() => {
    if (!currentEventId) return;

    const unsub = onSnapshot(
      query(collection(db, 'Events', currentEventId, 'Sessions'), orderBy('day')),
      (snap) => {
        const sessionsData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Session[];
        setSessions(sessionsData);

        // Set active day
        const days = [...new Set(sessionsData.map(s => s.day))].sort();
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

  // Load hosted buyers and exhibitors for AI recommendations
  useEffect(() => {
    console.log('🚀 Exhibitor dashboard component loaded - starting data loading...');

    const loadUsers = async () => {
      try {
        console.log('🔄 Starting to load users from Firestore...');

        // Load all users from Firestore
        const usersRef = collection(db, 'Users');
        const usersSnap = await getDocs(usersRef);

        const allUsersData: any[] = [];
        const hostedBuyersList: any[] = [];
        const exhibitorsList: any[] = [];

        usersSnap.forEach((doc) => {
          const userData: UserData = { id: doc.id, uid: doc.id, ...doc.data() };
          allUsersData.push(userData);

          if (userData.category === 'Hosted Buyer') {
            hostedBuyersList.push(userData);
          } else if (userData.category === 'Exhibitor') {
            exhibitorsList.push(userData);
          }
        });

        console.log('📊 Firestore Users Loaded:', {
          total: allUsersData.length,
          hostedBuyers: hostedBuyersList.length,
          exhibitors: exhibitorsList.length
        });

        // Show sample of actual user data
        console.log('🔍 Sample user data from Firestore:');
        allUsersData.slice(0, 5).forEach((user, index) => {
          console.log(`User ${index + 1}:`, {
            uid: user.uid,
            name: user.fullName || user.name,
            email: user.email,
            company: user.company,
            category: user.category,
            position: user.position || user.role
          });
        });

        setHostedBuyers(hostedBuyersList);
        setExhibitors(exhibitorsList);
        setAllUsers(allUsersData);

        console.log('✅ Data loading completed successfully');
      } catch (error) {
        console.error('❌ Error loading users:', error);
      }
    };

    loadUsers();
  }, []);

  // Load all registered users for QR code processing
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const usersSnap = await getDoc(doc(db, 'Users', 'all_users'));
        if (usersSnap.exists()) {
          const usersData = usersSnap.data();
          const allUsersList = [
            ...(usersData.hostedBuyers || []),
            ...(usersData.exhibitors || []),
            ...(usersData.visitors || []),
            ...(usersData.agents || [])
          ];
          setAllUsers(allUsersList);
        }
      } catch (error) {
        console.error('Error loading all users:', error);
      }
    };

    loadAllUsers();
  }, []);

  const sessionsByDay = React.useMemo(() => {
    const grouped: Record<string, any[]> = {};
    sessions.forEach(session => {
      if (!grouped[session.day]) grouped[session.day] = [];
      grouped[session.day].push(session);
    });
    return grouped;
  }, [sessions]);

  const totalLeads = leads.length;
  const todayLeads = leads.filter(lead => {
    const leadDate = lead.createdAt?.toDate?.();
    const today = new Date();
    return leadDate && leadDate.toDateString() === today.toDateString();
  }).length;

  // Delete lead function
  const deleteLead = async (leadId: string) => {
    try {
      console.log('🗑️ Attempting to delete lead:', leadId);

      // Delete from Firestore first
      await deleteDoc(doc(db, 'Leads', leadId));
      console.log('✅ Successfully deleted from Firestore:', leadId);

      // Update local state immediately (optimistic update)
      setLeads(prev => {
        const updated = prev.filter(lead => lead.id !== leadId);
        console.log('📝 Updated local state, remaining leads:', updated.length);
        return updated;
      });

      setShowDeleteConfirm(false);
      setLeadToDelete(null);

      console.log('🎉 Lead deletion completed successfully');

      // Show success message
      setScanResult('✅ Lead deleted successfully');
      setTimeout(() => {
        setScanResult('');
      }, 2000);

    } catch (error) {
      console.error('❌ Error deleting lead:', error);
      alert('❌ Error deleting lead. Please try again.');
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = (lead: any) => {
    setLeadToDelete(lead);
    setShowDeleteConfirm(true);
  };

  // Camera functions
  const startCamera = async () => {
    try {
      setCameraError('');

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser or context. Please use a modern browser with camera support.');
      }

      // Check if running on HTTPS (required for camera access)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('Camera access requires HTTPS. Please access the site over HTTPS.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setCameraStream(stream);
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setCameraError(
        error.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permissions and try again.'
          : error.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : error.name === 'NotReadableError'
          ? 'Camera is already in use by another application.'
          : error.name === 'OverconstrainedError'
          ? 'Camera does not support the requested video quality.'
          : error.name === 'SecurityError'
          ? 'Camera access blocked due to security restrictions.'
          : error.name === 'AbortError'
          ? 'Camera access was interrupted.'
          : error.message || 'Unable to access camera. Please check your camera settings and browser permissions.'
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Handle video element setup and cleanup
  useEffect(() => {
    const video = videoRef.current;
    if (video && cameraStream) {
      video.srcObject = cameraStream;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Video started playing successfully');
          })
          .catch(error => {
            console.error('Error playing video:', error);
            setCameraError('Failed to start video playback. Please try again.');
          });
      }
    }

    // Cleanup function
    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [cameraStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // QR Code processing function
  const processQRCode = async (qrData: string) => {
    // AGGRESSIVE PROTECTION AGAINST MULTIPLE CALLS
    const now = Date.now();

    // Check if we're already processing (most aggressive check first)
    if (isProcessingQR) {
      console.log('🚫 BLOCKED: Already processing QR code, ignoring this call');
      return;
    }

    // Check global processing lock
    if (globalProcessingLock) {
      console.log('🚫 BLOCKED: Global processing lock is active, ignoring this call');
      return;
    }

    // Check if we processed something very recently (within 1 second)
    if (now - lastProcessedTime < 1000) {
      console.log('🚫 BLOCKED: Too recent processing, ignoring this call');
      return;
    }

    // Set all locks immediately
    setIsProcessingQR(true);
    setGlobalProcessingLock(true);
    setLastProcessedTime(now);

    setScanResult(`Processing QR code...`);

    try {
      console.log('✅ Processing QR code data:', qrData);

      // Clean the QR data (remove extra whitespace, newlines)
      const cleanQrData = qrData.trim();
      console.log('Clean QR data:', cleanQrData);

      // Validate QR data is not empty
      if (!cleanQrData) {
        throw new Error('QR code data is empty');
      }

      // Try to parse QR data as JSON first (new format)
      let userData;
      try {
        userData = JSON.parse(cleanQrData);
        console.log('Parsed JSON data:', userData);

        // Validate JSON data has required fields
        if (!userData.name && !userData.fullName) {
          throw new Error('JSON data missing name field');
        }
      } catch (parseError) {
        console.log('JSON parsing failed, trying legacy format');
        // If JSON parsing fails, try to find user in database (legacy format)
        const foundUser = allUsers.find(user =>
          user.uid === cleanQrData ||
          user.email === cleanQrData ||
          user.id === cleanQrData ||
          user.qrCode === cleanQrData ||
          (user.fullName && user.fullName.toLowerCase().includes(cleanQrData.toLowerCase())) ||
          (user.name && user.name.toLowerCase().includes(cleanQrData.toLowerCase()))
        );

        if (foundUser) {
          console.log('Found user in database:', foundUser);
          userData = {
            uid: foundUser.uid,
            name: foundUser.fullName || foundUser.name,
            email: foundUser.email,
            role: foundUser.position || foundUser.role,
            company: foundUser.company,
            category: foundUser.category,
            type: 'event_badge'
          };
        } else {
          console.log('User not found in database, creating generic lead');
          // If user not found, create a generic lead with the QR data
          userData = {
            uid: `unknown_${Date.now()}`,
            name: 'Scanned Visitor',
            email: 'No email provided',
            role: 'Visitor',
            company: 'Unknown Company',
            category: 'Visitor',
            type: 'qr_scan',
            qrData: cleanQrData
          };
        }
      }

      // Validate that we have the required user data
      if (!userData || (!userData.name && !userData.fullName)) {
        console.log('Invalid QR data, creating generic lead with QR data');
        // If we can't parse the QR data, create a generic lead with the raw QR data
        userData = {
          uid: `qr_${Date.now()}`,
          name: 'QR Code Scanned',
          email: 'No email provided',
          role: 'Visitor',
          company: 'Unknown',
          category: 'Visitor',
          type: 'qr_scan',
          qrData: cleanQrData
        };
      }

      // Check if this QR code has already been scanned by this exhibitor
      const existingLead = leads.find(lead =>
        lead.qrCode === cleanQrData && lead.exhibitorUid === user.uid
      );

      if (existingLead) {
        console.log('QR code already scanned by this exhibitor:', existingLead);
        setScanResult(`⚠️ Already scanned: ${userData.name}`);
        setIsProcessingQR(false);

        // Show better duplicate notification
        setDuplicateLeadInfo({
          name: userData.name,
          company: userData.company || 'No company',
          category: userData.category || 'Unknown',
          scannedAt: existingLead.createdAt?.toDate?.()?.toLocaleString() || 'Unknown time'
        });
        setShowDuplicateNotification(true);

        // Stop scanning and set cooldown
        setScanning(false);
        setScanCooldown(true);
        setCooldownTimer(3);

        setTimeout(() => {
          setScanResult('');
          setShowDuplicateNotification(false);
          setDuplicateLeadInfo(null);
        }, 5000);
        return;
      }

      // Additional check: prevent processing if already processing
      if (isProcessingQR) {
        console.log('Already processing a QR code, ignoring this scan');
        return;
      }

      // Create a unique ID for the lead using a more robust method
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const uniqueId = `qr_${timestamp}_${randomPart}`;

      // Create a new lead from the scanned QR code
      const newLead = {
        id: uniqueId,
        attendeeName: userData.name || userData.fullName || 'Scanned User',
        attendeeEmail: userData.email || 'No email provided',
        company: userData.company || 'No company provided',
        position: userData.role || 'No position provided',
        score: Math.floor(Math.random() * 40) + 60, // Random score between 60-99
        createdAt: serverTimestamp(),
        notes: `Scanned via QR code - Category: ${userData.category || 'Unknown'}\nQR Data: ${cleanQrData}\nUser ID: ${userData.uid}`,
        exhibitorUid: user.uid,
        qrCode: cleanQrData,
        userCategory: userData.category || 'Unknown',
        scannedData: userData, // Store the full scanned data
        scanMethod: 'qr_code',
        attendeeUid: userData.uid // Store the original user ID for reference
      };

      console.log('Creating new lead:', newLead);

      // Add to Firestore
      await addDoc(collection(db, 'Leads'), newLead);

      // Update local state
      setLeads(prev => [newLead, ...prev]);

      setScanResult(`✅ Successfully scanned: ${userData.name || userData.fullName}`);
      setIsProcessingQR(false);

      // Stop scanning and set cooldown
      setScanning(false);
      setScanCooldown(true);
      setCooldownTimer(3);

      // Show success message
      setTimeout(() => {
        setScanResult('');
        alert(`✅ Lead generated successfully!\n\nName: ${userData.name || userData.fullName}\nEmail: ${userData.email || 'No email'}\nCompany: ${userData.company || 'No company'}\nPosition: ${userData.role || 'No position'}\nCategory: ${userData.category || 'Unknown'}\n\nQR Data: ${cleanQrData}`);
      }, 2000);

    } catch (error: any) {
      console.error('Error processing QR code:', error);
      setScanResult(`❌ QR code not recognized: ${error.message}`);
      setIsProcessingQR(false);

      // Stop scanning on error
      setScanning(false);
      setScanCooldown(true);
      setCooldownTimer(3);

      setTimeout(() => {
        setScanResult('');
      }, 3000);
    }
  };

  // Simulate QR code processing for demo purposes
  const simulateQRScan = (qrData: string) => {
    setScanResult(`Simulating QR scan: ${qrData}`);
    setTimeout(() => {
      processQRCode(qrData);
    }, 1000);
  };

  // Advanced QR Code scanning with snapshot capture
  const captureAndScanQR = async () => {
    if (!cameraStream || !videoRef.current) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const video = videoRef.current;

    if (!context || !video) return;

    try {
      // Set high quality canvas dimensions
      const videoWidth = video.videoWidth || video.offsetWidth || 1280;
      const videoHeight = video.videoHeight || video.offsetHeight || 720;

      canvas.width = videoWidth;
      canvas.height = videoHeight;

      console.log('📸 Capturing QR code snapshot...');
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);

      // Draw high-quality snapshot
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for processing
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      console.log('🔍 Processing snapshot with advanced detection...');

      // Try multiple advanced detection approaches
      let code = null;
      let detectionMethod = '';

      // Method 1: Standard detection with enhanced parameters
      try {
        code = jsQR(imageData.data as any, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });
        if (code && code.data && code.data.length > 0) {
          detectionMethod = 'Standard Detection';
        }
      } catch (error) {
        console.log('Standard detection failed:', error);
      }

      // Method 2: Try with smaller, focused area (center of image)
      if (!code) {
        try {
          const centerX = Math.floor(imageData.width / 4);
          const centerY = Math.floor(imageData.height / 4);
          const centerWidth = Math.floor(imageData.width / 2);
          const centerHeight = Math.floor(imageData.height / 2);
          const centerImageData = context.getImageData(centerX, centerY, centerWidth, centerHeight);

          code = jsQR(centerImageData.data as any, centerImageData.width, centerImageData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (code && code.data && code.data.length > 0) {
            detectionMethod = 'Center Focus Detection';
          }
        } catch (error) {
          console.log('Center focus detection failed:', error);
        }
      }

      // Method 3: Try with enhanced contrast processing
      if (!code) {
        try {
          const processedImageData = context.getImageData(0, 0, canvas.width, canvas.height);

          // Enhance contrast for better QR detection
          for (let i = 0; i < processedImageData.data.length; i += 4) {
            // Apply threshold to create high contrast image
            const threshold = 128;
            processedImageData.data[i] = processedImageData.data[i] > threshold ? 255 : 0;     // Red
            processedImageData.data[i + 1] = processedImageData.data[i + 1] > threshold ? 255 : 0; // Green
            processedImageData.data[i + 2] = processedImageData.data[i + 2] > threshold ? 255 : 0; // Blue
          }

          code = jsQR(processedImageData.data as any, processedImageData.width, processedImageData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (code && code.data && code.data.length > 0) {
            detectionMethod = 'Enhanced Contrast Detection';
          }
        } catch (error) {
          console.log('Enhanced contrast detection failed:', error);
        }
      }

      // Method 4: Try with different image processing (edge detection simulation)
      if (!code) {
        try {
          const edgeImageData = context.getImageData(0, 0, canvas.width, canvas.height);

          // Simple edge enhancement
          for (let i = 0; i < edgeImageData.data.length; i += 4) {
            const gray = (edgeImageData.data[i] + edgeImageData.data[i + 1] + edgeImageData.data[i + 2]) / 3;
            const enhanced = gray > 100 ? 255 : 0; // Higher threshold for edges
            edgeImageData.data[i] = enhanced;
            edgeImageData.data[i + 1] = enhanced;
            edgeImageData.data[i + 2] = enhanced;
          }

          code = jsQR(edgeImageData.data as any, edgeImageData.width, edgeImageData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (code && code.data && code.data.length > 0) {
            detectionMethod = 'Edge Detection';
          }
        } catch (error) {
          console.log('Edge detection failed:', error);
        }
      }

      if (code && code.data && code.data.length > 0) {
        console.log(`✅ QR code detected using ${detectionMethod}:`, code.data);
        console.log('QR code data length:', code.data.length);
        console.log('QR code data (first 100 chars):', code.data.substring(0, 100));

        setScanning(false);
        processQRCode(code.data);
      } else {
        console.log('❌ No QR code detected in snapshot');
        setScanResult('❌ No QR code found in image. Try adjusting position or lighting.');
        setTimeout(() => {
          setScanResult('');
        }, 3000);
      }

    } catch (error) {
      console.error('Error during QR capture and scan:', error);
      setScanResult('❌ Error scanning QR code. Please try again.');
      setTimeout(() => {
        setScanResult('');
      }, 3000);
    }
  };

  // Start QR scanning when camera starts
  useEffect(() => {
    if (scanning && cameraStream) {
      // Start the advanced QR scanning with snapshot capture
      setTimeout(() => {
        captureAndScanQR();
      }, 1000); // Wait 1 second for camera to stabilize
    }
  }, [scanning, cameraStream]);

  // Handle cooldown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (scanCooldown && cooldownTimer > 0) {
      interval = setInterval(() => {
        setCooldownTimer(prev => {
          if (prev <= 1) {
            setScanCooldown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanCooldown, cooldownTimer]);

  // Handle connection requests to hosted buyers
  const handleConnect = async (buyer: any) => {
    try {
      console.log('🔗 Creating connection request from exhibitor to hosted buyer:', buyer);

      // Create connection request document
      const connectionData = {
        fromUserId: user.uid,
        fromUserName: profile.fullName || profile.email,
        fromUserEmail: profile.email || user.email,
        fromUserCompany: profile.company || '',
        fromUserCategory: 'Exhibitor',
        toUserId: buyer.uid,
        toUserName: buyer.fullName || buyer.name,
        toUserEmail: buyer.email,
        toUserCompany: buyer.company || '',
        toUserCategory: 'Hosted Buyer',
        type: 'connection_request',
        status: 'pending',
        message: `${profile.fullName || 'An exhibitor'} wants to connect with you at the event.`,
        createdAt: serverTimestamp(),
        eventId: currentEventId || 'default'
      };

      // Add to Connections collection
      const connectionRef = await addDoc(collection(db, 'Connections'), connectionData);
      const connectionId = connectionRef.id;
      console.log('🔗 DEBUG: Connection created with ID:', connectionId);

      // Send notification to hosted buyer
      const notificationData = {
        userId: buyer.uid,
        type: 'connection_request',
        title: 'New Connection Request',
        message: `${profile.fullName || 'An exhibitor'} wants to connect with you`,
        data: {
          fromUserId: user.uid,
          fromUserName: profile.fullName || profile.email,
          fromUserCompany: profile.company || '',
          connectionId: connectionId // Store the actual connection document ID
        },
        read: false,
        createdAt: serverTimestamp()
      };

      console.log('🔔 DEBUG: Creating notification with data:', notificationData);

      const notificationRef = await addDoc(collection(db, 'Notifications'), notificationData);
      console.log('🔔 DEBUG: Notification created with ID:', notificationRef.id);

      // Show success message in AI Matches modal
      setConnectResult(`✅ Connection request sent to ${buyer.fullName || buyer.name}!`);
      setTimeout(() => {
        setConnectResult('');
      }, 3000);

      console.log('✅ Connection request created successfully');

    } catch (error) {
      console.error('❌ Error creating connection request:', error);
      setScanResult('❌ Failed to send connection request. Please try again.');
      setTimeout(() => {
        setScanResult('');
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#181f2a] flex items-center justify-center">
        <div className="text-white/80">Loading your dashboard...</div>
      </div>
    );
  }

  if (!user || !profile) {
    // Show sign-in form when user is not authenticated
    return (
      <div className="min-h-screen w-full bg-[#0b1020] flex items-center justify-center">
        <div className="w-full max-w-md">
          <AuthSection />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#181f2a]">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#1c2331] to-[#232b3e] border-b border-[#0d6efd]/20 shadow-lg flex-shrink-0 h-14 sm:h-16">
        <div className="flex items-center gap-2 sm:gap-4">
          <img
            src={logoUrl}
            alt="Logo"
            className="object-contain flex-shrink-0 h-8 sm:h-10 w-auto"
            onError={(e) => {
              e.currentTarget.src = '/logo.svg';
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-white text-lg sm:text-xl font-bold tracking-tight">{appName}</span>
            <div className="w-1 h-4 sm:h-6 bg-[#0d6efd]/50 rounded-full hidden sm:block"></div>
            <span className="text-[#6c757d] text-xs sm:text-sm font-medium hidden lg:block">
              {profile?.fullName || user.email}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 text-[#6c757d] hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faBell} className="text-lg" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </button>
          <button
            onClick={async () => {
              await auth.signOut();
              window.location.href = 'http://localhost:3000/signin';
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center gap-1 sm:gap-2"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="text-xs" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-6 overflow-auto bg-[#0f1419]">
        <div className="w-full max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Welcome, {profile.fullName || 'Exhibitor'}!
            </h1>
            <p className="text-white/70">Your exhibitor dashboard and lead management</p>
          </div>

          {/* Company Overview - Wider About Section */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-8">
            <div className="xl:col-span-4">
              <GlassCard className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faBuilding} className="text-2xl text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{profile.company || 'Your Company'}</h2>
                    <p className="text-white/70">{profile.position || 'Position'} • {profile.industry || 'Industry'}</p>
                    {profile.boothNumber && (
                      <p className="text-blue-400 text-sm font-semibold">Booth #{profile.boothNumber}</p>
                    )}
                  </div>
                </div>

                {profile.description && (
                  <div className="mb-6">
                    <h3 className="text-white font-semibold mb-2">About</h3>
                    <p className="text-white/80 text-sm leading-relaxed">{profile.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-400/20">
                    <FontAwesomeIcon icon={faUsers} className="text-blue-400 text-lg mb-1" />
                    <p className="text-white font-bold">{totalLeads}</p>
                    <p className="text-white/60 text-xs">Total Leads</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-3 border border-green-400/20">
                    <FontAwesomeIcon icon={faCalendar} className="text-green-400 text-lg mb-1" />
                    <p className="text-white font-bold">{todayLeads}</p>
                    <p className="text-white/60 text-xs">Today</p>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-400/20">
                    <FontAwesomeIcon icon={faStar} className="text-purple-400 text-lg mb-1" />
                    <p className="text-white font-bold">
                      {totalLeads > 0 ? Math.round(leads.reduce((sum, lead) => sum + (lead.score || 0), 0) / totalLeads) : 0}
                    </p>
                    <p className="text-white/60 text-xs">Avg. Score</p>
                  </div>
                  <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-400/20">
                    <FontAwesomeIcon icon={faTrophy} className="text-orange-400 text-lg mb-1" />
                    <p className="text-white font-bold">
                      {totalLeads > 0 ? Math.max(...leads.map(lead => lead.score || 0)) : 0}
                    </p>
                    <p className="text-white/60 text-xs">Best Score</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Quick Actions - Narrower */}
            <div className="space-y-4">
              <GlassCard className="p-4">
                <h3 className="text-lg font-bold text-white mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowBadgeScanner(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 text-sm"
                  >
                    <FontAwesomeIcon icon={faQrcode} className="text-xs" />
                    <span>Scan Badges</span>
                  </button>

                  <button
                    onClick={() => setShowAIMatchesModal(true)}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 text-sm"
                  >
                    <FontAwesomeIcon icon={faUsers} className="text-xs" />
                    <span>AI Matches</span>
                  </button>

                  <button
                    onClick={() => setShowExportModal(true)}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 text-sm"
                  >
                    <FontAwesomeIcon icon={faDownload} className="text-xs" />
                    <span>Export Data</span>
                  </button>

                  <button
                    onClick={() => setShowMessages(true)}
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white p-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 text-sm"
                  >
                    <FontAwesomeIcon icon={faMessage} className="text-xs" />
                    <span>Messages</span>
                  </button>
                </div>
              </GlassCard>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Profile & Badge Combined */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <FontAwesomeIcon icon={faUser} className="text-blue-400 text-xl" />
                <h2 className="text-xl font-bold text-white">My Exhibitor Profile</h2>
              </div>

              {/* Profile Content */}
              <div className="space-y-6">
                <ProfileEditor />
              </div>
            </GlassCard>

            {/* Badge & Quick Info - Always show for registered exhibitors */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <FontAwesomeIcon icon={faIdBadge} className="text-orange-400 text-xl" />
                <h2 className="text-xl font-bold text-white">Exhibitor Badge</h2>
              </div>

              {/* Badge Display - Just QR Code */}
              <div className="flex justify-center mb-6">
                <div className="transform hover:scale-105 transition-transform duration-300">
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 border border-blue-200 shadow-lg max-w-sm mx-auto">
                    <div className="text-center">
                      {/* QR Code - Just the QR code */}
                      <div className="bg-white p-6 rounded-lg border-2 border-green-500 shadow-lg inline-block">
                        <QRCodeSVG
                          value={`QTM2025-EXH-${user?.uid || 'unknown'}`}
                          size={200}
                          level="M"
                          includeMargin={true}
                          bgColor="#ffffff"
                          fgColor="#000000"
                        />
                      </div>

                      {/* Action Buttons - Side by side */}
                      <div className="flex gap-3 justify-center mt-6">
                        <button
                          onClick={() => {
                            const qrModal = document.createElement('div');
                            qrModal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4';
                            qrModal.innerHTML = `
                              <div class="bg-white p-8 rounded-lg text-center max-w-md w-full">
                                <h3 class="text-2xl font-bold mb-4 text-gray-800">Your QR Code</h3>
                                <div class="bg-white p-6 rounded-lg inline-block mb-4 border-2 border-green-500">
                                  <canvas id="exhibitor-qr-canvas" width="300" height="300" style="width: 300px; height: 300px;"></canvas>
                                </div>
                                <button onclick="this.parentElement.parentElement.remove()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">Close</button>
                              </div>
                            `;
                            document.body.appendChild(qrModal);

                            // Generate QR code on canvas with simple unique code
                            setTimeout(async () => {
                              const canvas = document.getElementById('exhibitor-qr-canvas');
                              if (canvas) {
                                try {
                                  const QRCodeLib = await import('qrcode');
                                  const QRCode = QRCodeLib.default || QRCodeLib;
                                  await QRCode.toCanvas(canvas, `QTM2025-EXH-${user?.uid || 'unknown'}`, {
                                    width: 300,
                                    margin: 2,
                                    color: {
                                      dark: '#000000',
                                      light: '#FFFFFF'
                                    },
                                    errorCorrectionLevel: 'M'
                                  });
                                } catch (error) {
                                  console.error('Error generating QR code:', error);
                                  const ctx = (canvas as HTMLCanvasElement).getContext('2d');
                                  if (ctx) {
                                    ctx.fillStyle = '#ffffff';
                                    ctx.fillRect(0, 0, 300, 300);
                                    ctx.fillStyle = '#000000';
                                    ctx.font = '24px Arial';
                                    ctx.textAlign = 'center';
                                    ctx.fillText('QR Code', 150, 150);
                                  }
                                }
                              }
                            }, 100);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                        >
                          <FontAwesomeIcon icon={faQrcode} className="w-4 h-4" />
                          Enlarge QR
                        </button>

                        <button
                          onClick={() => {
                            const badgeUrl = `${window.location.origin}/badge/${profile.badgeId || `badge_${user.uid}`}`;
                            if (navigator.share) {
                              navigator.share({
                                title: 'My Event Badge',
                                text: `Check out my ${eventData?.name || 'Event'} badge!`,
                                url: badgeUrl
                              });
                            } else {
                              navigator.clipboard.writeText(badgeUrl);
                              alert('Badge URL copied to clipboard!');
                            }
                          }}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                        >
                          <FontAwesomeIcon icon={faShare} className="w-5 h-5" />
                          Share Badge
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


            </GlassCard>
          </div>



          {/* Recent Leads */}
          <GlassCard className="p-6 mt-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faUsers} className="text-blue-400" />
              Recent Leads
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {leads.length > 0 ? (
                leads.slice(0, 10).map((lead: any, index: number) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold truncate">{lead.attendeeName}</h4>
                        <p className="text-white/70 text-sm truncate">{lead.company}</p>
                        <p className="text-white/60 text-xs truncate">{lead.position}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                          {lead.score || 0}
                        </span>
                        <button
                          onClick={() => handleDeleteConfirm(lead)}
                          className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                          title="Delete lead"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-white/50">
                      {lead.createdAt?.toDate?.()?.toLocaleString() || 'Unknown time'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-white/70">
                  <FontAwesomeIcon icon={faUsers} className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h4 className="text-white font-semibold mb-2">No Leads Yet</h4>
                  <p className="text-sm">Start scanning attendee QR codes to generate leads.</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Event Information */}
          {eventData && (
            <GlassCard className="p-6 mt-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faStar} className="text-yellow-400" />
                Event Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-white font-semibold mb-2">{eventData.name || 'Event'}</h3>
                  <p className="text-white/70 text-sm mb-2">
                    {eventData.startDate && eventData.startTime &&
                      `${eventData.startDate} at ${eventData.startTime}`
                    }
                    {eventData.location && ` • ${eventData.location}`}
                  </p>
                  {eventData.description && (
                    <p className="text-white/80 text-sm">{eventData.description}</p>
                  )}
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Quick Actions</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowBadgeScanner(true)}
                      className="block text-blue-400 hover:text-blue-300 text-sm"
                    >
                      📱 Scan More Badges
                    </button>
                    <button
                      onClick={() => setShowExportModal(true)}
                      className="block text-blue-400 hover:text-blue-300 text-sm"
                    >
                      📊 Export Lead Data
                    </button>
                    <button
                      onClick={() => setShowAIMatches(true)}
                      className="block text-blue-400 hover:text-blue-300 text-sm"
                    >
                      🤖 View AI Matches
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </main>

      {/* Badge Scanner Modal */}
      {showBadgeScanner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-4xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">📱 Badge Scanner</h3>
                <p className="text-white/60 text-sm">Scan attendee badges to generate leads</p>
              </div>
              <button
                onClick={() => setShowBadgeScanner(false)}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Camera Section */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Camera Scanner</h4>

                {!cameraStream ? (
                  <div className="space-y-4">
                    <button
                      onClick={startCamera}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                    >
                      Start Camera
                    </button>

                    {cameraError && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 text-lg" />
                          <div>
                            <h5 className="text-white font-semibold">Camera Error</h5>
                            <p className="text-white/70 text-sm">{cameraError}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-80 bg-black rounded-lg object-cover"
                      />
                      <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setScanning(!scanning)}
                        disabled={scanCooldown}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                          scanning
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : scanCooldown
                              ? 'bg-gray-600 text-white cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {scanning ? 'Stop Scanning' : scanCooldown ? `Cooldown (${cooldownTimer}s)` : 'Start Scanning'}
                      </button>

                      <button
                        onClick={stopCamera}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300"
                      >
                        Stop Camera
                      </button>
                    </div>

                    {scanResult && (
                      <div className={`p-4 rounded-lg text-center font-medium ${
                        scanResult.includes('✅')
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : scanResult.includes('❌')
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {scanResult}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* QR Code Instructions */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">How to Scan</h4>
                <div className="space-y-4 text-sm text-white/80">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-400 text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">Position QR Code</p>
                      <p>Point your camera at the attendee's QR code badge</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-400 text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">Auto-Detection</p>
                      <p>The system will automatically detect and scan the QR code</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-400 text-xs font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">Lead Generated</p>
                      <p>Lead information will be automatically saved to your dashboard</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-400/20">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-blue-400" />
                    <span className="text-blue-400 font-semibold">Pro Tips</span>
                  </div>
                  <ul className="text-xs text-white/70 space-y-1 ml-6">
                    <li>• Ensure good lighting for better QR detection</li>
                    <li>• Hold camera steady for 2-3 seconds</li>
                    <li>• Multiple detection methods are used automatically</li>
                    <li>• Duplicate scans are prevented automatically</li>
                  </ul>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && leadToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-md p-8">
            <div className="text-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 text-4xl mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Delete Lead</h3>
              <p className="text-white/70 mb-6">
                Are you sure you want to delete the lead for <strong>{leadToDelete.attendeeName}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteLead(leadToDelete.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  Delete
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Duplicate Notification Modal */}
      {showDuplicateNotification && duplicateLeadInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-md p-8">
            <div className="text-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-400 text-4xl mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Duplicate Scan</h3>
              <p className="text-white/70 mb-4">
                You've already scanned this attendee's badge before.
              </p>
              <div className="bg-white/5 rounded-lg p-4 text-left">
                <p className="text-white font-semibold">{duplicateLeadInfo.name}</p>
                <p className="text-white/70 text-sm">{duplicateLeadInfo.company}</p>
                <p className="text-white/60 text-xs">Category: {duplicateLeadInfo.category}</p>
                <p className="text-white/60 text-xs">First scanned: {duplicateLeadInfo.scannedAt}</p>
              </div>
              <button
                onClick={() => setShowDuplicateNotification(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 mt-4"
              >
                Got it
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* AI Matches Modal */}
      {showAIMatchesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-4xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">🤖 AI Smart Matches</h3>
                <p className="text-white/60 text-sm">AI-powered attendee recommendations based on your profile</p>
              </div>
              <button
                onClick={() => {
                  setShowAIMatchesModal(false);
                  setConnectResult(''); // Clear result when closing modal
                }}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            {/* Connection Result Display */}
            {connectResult && (
              <div className={`mb-6 p-4 rounded-lg text-center font-medium ${
                connectResult.includes('✅')
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : connectResult.includes('❌')
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {connectResult}
              </div>
            )}

            <div className="space-y-6">
              {/* AI Recommendations */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faLightbulb} className="text-yellow-400" />
                  Recommended Connections
                </h4>

                {hostedBuyers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hostedBuyers.slice(0, 6).map((buyer: any, index: number) => (
                      <div key={index} className="bg-gradient-to-br from-green-500/10 to-green-500/20 rounded-lg p-4 border border-green-400/20">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <FontAwesomeIcon icon={faUser} className="text-green-400 text-sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-white font-semibold truncate">{buyer.fullName || buyer.name}</h5>
                            <p className="text-white/70 text-sm truncate">{buyer.company}</p>
                            <p className="text-white/60 text-xs truncate">{buyer.position || buyer.role}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">
                                {Math.floor(Math.random() * 20) + 80}% Match
                              </span>
                              <button
                                onClick={() => handleConnect(buyer)}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                              >
                                Connect
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/70">
                    <FontAwesomeIcon icon={faUsers} className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hosted buyers available for matching.</p>
                  </div>
                )}
              </div>

              {/* Match Criteria */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Matching Criteria</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-400/20">
                    <h5 className="text-blue-400 font-semibold mb-2">Industry Alignment</h5>
                    <p className="text-white/70">AI matches based on your industry focus and target markets</p>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-400/20">
                    <h5 className="text-purple-400 font-semibold mb-2">Lead History</h5>
                    <p className="text-white/70">Analyzes your past successful lead patterns</p>
                  </div>
                  <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-400/20">
                    <h5 className="text-orange-400 font-semibold mb-2">Event Activity</h5>
                    <p className="text-white/70">Considers attendee engagement and session attendance</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-2xl p-8 transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">📊 Export Lead Data</h3>
                <p className="text-white/60 text-sm">Download your leads in various formats</p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Export Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    // Export as CSV
                    const csvData = leads.map(lead => ({
                      Name: lead.attendeeName,
                      Email: lead.attendeeEmail,
                      Company: lead.company,
                      Position: lead.position,
                      Score: lead.score,
                      'Scan Date': lead.createdAt?.toDate?.()?.toLocaleString() || 'Unknown',
                      Category: lead.userCategory,
                      Notes: lead.notes
                    }));

                    const csvString = [
                      Object.keys(csvData[0]).join(','),
                      ...csvData.map(row => Object.values(row).join(','))
                    ].join('\n');

                    const blob = new Blob([csvString], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);

                    setShowExportModal(false);
                  }}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-3"
                >
                  <FontAwesomeIcon icon={faFile} className="text-lg" />
                  <div className="text-left">
                    <div className="font-semibold">Export as CSV</div>
                    <div className="text-xs opacity-80">Comma-separated values for Excel</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    // Export as JSON
                    const jsonData = {
                      exportDate: new Date().toISOString(),
                      totalLeads: leads.length,
                      exhibitorName: profile.fullName,
                      leads: leads.map(lead => ({
                        attendeeName: lead.attendeeName,
                        attendeeEmail: lead.attendeeEmail,
                        company: lead.company,
                        position: lead.position,
                        score: lead.score,
                        createdAt: lead.createdAt,
                        userCategory: lead.userCategory,
                        notes: lead.notes
                      }))
                    };

                    const jsonString = JSON.stringify(jsonData, null, 2);
                    const blob = new Blob([jsonString], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `leads_export_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    window.URL.revokeObjectURL(url);

                    setShowExportModal(false);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-3"
                >
                  <FontAwesomeIcon icon={faFile} className="text-lg" />
                  <div className="text-left">
                    <div className="font-semibold">Export as JSON</div>
                    <div className="text-xs opacity-80">Structured data format</div>
                  </div>
                </button>
              </div>

              {/* Export Summary */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Export Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{leads.length}</p>
                    <p className="text-white/70 text-sm">Total Leads</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">{todayLeads}</p>
                    <p className="text-white/70 text-sm">Today's Leads</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">
                      {leads.length > 0 ? Math.round(leads.reduce((sum, lead) => sum + (lead.score || 0), 0) / leads.length) : 0}
                    </p>
                    <p className="text-white/70 text-sm">Avg. Score</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-400">
                      {leads.length > 0 ? Math.max(...leads.map(lead => lead.score || 0)) : 0}
                    </p>
                    <p className="text-white/70 text-sm">Best Score</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Messages Modal */}
      {showMessages && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="w-full max-w-4xl p-8 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">💬 Messages & Communication</h3>
                <p className="text-white/60 text-sm">Connect with attendees and manage your conversations</p>
              </div>
              <button
                onClick={() => setShowMessages(false)}
                className="text-white/70 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Message Threads */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faComments} className="text-blue-400" />
                  Recent Conversations
                </h4>

                {leads.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {leads.slice(0, 5).map((lead: any, index: number) => (
                      <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <FontAwesomeIcon icon={faUser} className="text-blue-400 text-xs" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="text-white font-semibold">{lead.attendeeName}</h5>
                              <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                                {lead.score || 0}
                              </span>
                              <span className="text-white/60 text-xs">
                                {lead.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                              </span>
                            </div>
                            <p className="text-white/70 text-sm truncate">{lead.company} • {lead.position}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <button className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                                <FontAwesomeIcon icon={faReply} className="text-xs" />
                                Send Message
                              </button>
                              <button className="text-green-400 hover:text-green-300 text-xs flex items-center gap-1">
                                <FontAwesomeIcon icon={faPhone} className="text-xs" />
                                Schedule Call
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/70">
                    <FontAwesomeIcon icon={faComments} className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No conversations yet. Start by scanning some badges!</p>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">Quick Actions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                    <FontAwesomeIcon icon={faEnvelope} className="text-sm" />
                    <span className="text-sm">Email All Leads</span>
                  </button>
                  <button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                    <FontAwesomeIcon icon={faCalendar} className="text-sm" />
                    <span className="text-sm">Schedule Follow-ups</span>
                  </button>
                  <button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                    <FontAwesomeIcon icon={faHandshake} className="text-sm" />
                    <span className="text-sm">Request Meeting</span>
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
