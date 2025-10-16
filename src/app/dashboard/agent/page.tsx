"use client";
import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../../firebaseConfig';
import { collection, getDocs, doc, updateDoc, serverTimestamp, increment, getDoc, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQrcode,
  faUserCheck,
  faStop,
  faSyncAlt,
  faUsers,
  faUserTag,
  faCamera,
  faPlay,
  faHome,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import AuthSection from '../../AuthSection';

export default function AgentDashboard() {
  const [scanner, setScanner] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [appName, setAppName] = useState<string>('EventPlatform');
  const [logoUrl, setLogoUrl] = useState<string>('/logo.svg');
  const [logoSize, setLogoSize] = useState<number>(32);
  const [currentEventId, setCurrentEventId] = useState<string>('default');
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [scannerResult, setScannerResult] = useState('');
  const [user, setUser] = useState<any>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const qrReaderRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
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
          console.warn('Failed to load global settings for agent', e);
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 5;
    
    const initScanner = () => {
      if (qrReaderRef.current && !scanner) {
        attempts++;
        console.log(`Scanner init attempt ${attempts}`);
        
        try {
          const html5QrCode = new Html5Qrcode(qrReaderRef.current.id);
          setScanner(html5QrCode);
          setScannerReady(true);
          console.log('Scanner initialized successfully');
        } catch (error) {
          console.error('Scanner init error:', error);
          if (attempts < maxAttempts) {
            setTimeout(initScanner, 1000);
          } else {
            console.error('Max scanner init attempts reached');
            setScannerResult('Scanner initialization failed. Please refresh.');
            setTimeout(() => setScannerResult(''), 5000);
          }
        }
      } else if (scanner) {
        setScannerReady(true);
      }
    };

    // Initial attempt
    initScanner();

    // Retry if not ready after 2 seconds
    const timer = setTimeout(() => {
      if (!scannerReady) {
        initScanner();
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, []); // Initialize once on mount

  const startScanning = async () => {
    if (!scannerReady) {
      setScannerResult('Scanner not ready. Initializing...');
      return;
    }

    if (!scanner) {
      setScannerResult('Scanner not initialized. Please refresh.');
      return;
    }

    if (!qrReaderRef.current) {
      setScannerResult('Scanner container not found. Please refresh.');
      return;
    }

    setScanning(true);
    setScannerResult('Starting camera... Please grant permission.');

    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.');
      }

      // Check if running on HTTPS or localhost
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('Camera access requires HTTPS. Please access the site via HTTPS.');
      }

      // Request camera permission first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Stop the stream immediately as we'll use Html5Qrcode
      stream.getTracks().forEach(track => track.stop());

      setScannerResult('Requesting camera permission...');

      // Start scanner with proper types
      await scanner.start(
        { facingMode: "environment" },
        async (decodedText: string, decodedResult: any) => {
          console.log('QR Code scanned:', decodedText);
          const parseUid = (text: string): string | null => {
            const m = text.match(/checkin\/([A-Za-z0-9_-]+)/);
            if (m) return m[1];
            try { const obj = JSON.parse(text); if (obj && obj.uid) return String(obj.uid); } catch {}
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
          const uid = parseUid(decodedText);
          if (uid) {
            await toggleCheckIn(uid);
            setScannerResult(`✅ Scanned: ${uid.substring(0, 8)}...`);
            setTimeout(() => setScannerResult('Scan successful! Ready for next.'), 3000);
            await stopScanning();
          } else {
            setScannerResult('❌ Invalid QR code. Please scan an event badge.');
            setTimeout(() => setScannerResult('Ready for next scan.'), 2000);
          }
        },
        (error: any) => {
          console.log(`Scan error: ${error}`);
        }
      );

      setScannerResult('✅ Scanner active. Point at QR code.');
    } catch (err: any) {
      console.error('Scanner error:', err);
      setScanning(false);

      let errorMessage = 'Scanner failed to start';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please check your device or use a different browser.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (err.message.includes('HTTPS') || err.message.includes('secure')) {
        errorMessage = 'Camera requires HTTPS. Use https://localhost:3000 or deploy to test.';
      } else if (err.message.includes('container')) {
        errorMessage = 'Scanner container error. Please refresh the page.';
      } else if (err.message.includes('not supported')) {
        errorMessage = 'Camera not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.';
      } else {
        errorMessage = `Scanner error: ${err.message}`;
      }

      setScannerResult(`❌ ${errorMessage}`);
      setTimeout(() => setScannerResult('Ready to try again'), 5000);
    }
  };

  const stopScanning = async () => {
    setScanning(false);
    if (scanner) {
      try {
        await scanner.stop();
        console.log('Scanner stopped successfully');
        setScannerResult('Scanner stopped.');
        setTimeout(() => setScannerResult(''), 2000);
      } catch (err: any) {
        console.error('Stop scanner error:', err);
      }
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
        setScannerResult(`✅ Checked in: ${uid.substring(0, 8)}...`);
      } else {
        await updateDoc(userRef, {
          lastCheckOut: serverTimestamp(),
          lastStatus: 'out',
        });
        setScannerResult(`✅ Checked out: ${uid.substring(0, 8)}...`);
      }

      // Update recent list display
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as any;
        setRecentCheckIns(prev => [
          {
            uid,
            fullName: userData.fullName || userData.email || 'Unknown User',
            category: userData.category || 'Visitor',
            timestamp: now.toLocaleString(),
          },
          ...prev.slice(0, 9)
        ]);
      }
    } catch (error) {
      console.error('Check-in/out error:', error);
      setScannerResult('Check-in/out failed. Please try again.');
      setTimeout(() => setScannerResult(''), 3000);
    }
  };

  const fetchRecentCheckIns = async () => {
    try {
      const qRef = query(collection(db, 'CheckIns'), orderBy('at', 'desc'), limit(10));
      const snap = await getDocs(qRef);
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

  useEffect(() => {
    if (user) {
      fetchRecentCheckIns();
      const interval = setInterval(fetchRecentCheckIns, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) {
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
    <div className="min-h-screen bg-[#181f2a] flex flex-col">
      {/* Mobile Header */}
      <header className="bg-[#1c2331] border-b border-[#232b3e]/40 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain" style={{ height: `${logoSize}px`, width: `${logoSize}px` }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.svg'; }} />
          <span className="text-white font-bold">{appName}</span>
        </div>
        <button
          onClick={async () => {
            await auth.signOut();
            window.location.href = 'http://localhost:3000/signin';
          }}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Sign Out
        </button>
      </header>

      <div className="flex-1 flex flex-col p-4">
        {/* Scanner Section */}
        <div className="bg-[#232b3e]/60 rounded-2xl p-6 mb-6 border border-[#232b3e]/40">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faQrcode} className="text-2xl text-[#0d6efd]" />
            QR Scanner
          </h2>
          <div 
            ref={qrReaderRef}
            id="qr-reader" 
            className="w-full h-80 rounded-lg overflow-hidden border-2 border-dashed border-[#0d6efd]/30 bg-gray-900"
            style={{ minHeight: '320px' }}
          >
            {scanning ? (
              <div className="h-full relative flex items-center justify-center bg-black">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3/4 max-w-md border-2 border-[#0d6efd] rounded-lg p-2 animate-pulse"></div>
                </div>
                <div className="text-center text-white z-10 relative">
                  <FontAwesomeIcon icon={faCamera} className="w-12 h-12 text-[#0d6efd] mb-2" />
                  <p className="text-sm">Scanning active...</p>
                </div>
              </div>
            ) : (
              <div className="h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center rounded-lg">
                <FontAwesomeIcon icon={faCamera} className="w-16 h-16 text-[#6c757d] opacity-50" />
              </div>
            )}
          </div>
          {scannerResult && (
            <div className={`p-4 rounded-lg text-center font-medium mt-4 ${
              scannerResult.includes('✅') 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : scannerResult.includes('❌') 
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}>
              {scannerResult}
            </div>
          )}
          <div className="flex gap-3 mt-4">
            {!scanning ? (
              <button 
                onClick={startScanning}
                className="flex-1 bg-gradient-to-r from-[#0d6efd] to-[#0d6efd]/80 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!scannerReady}
              >
                <FontAwesomeIcon icon={faPlay} className="w-4 h-4" />
                Start Scan
              </button>
            ) : (
              <button 
                onClick={stopScanning}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faStop} className="w-4 h-4" />
                Stop Scan
              </button>
            )}
            <button 
              onClick={fetchRecentCheckIns}
              className="bg-[#6c757d] text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              disabled={scanning}
            >
              <FontAwesomeIcon icon={faSyncAlt} className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
            <h4 className="text-white font-semibold mb-2">Quick Tips</h4>
            <ul className="text-[#6c757d] text-sm space-y-1">
              <li>• Grant camera permission when prompted</li>
              <li>• Use good lighting and steady hand</li>
              <li>• Point at QR code on attendee's badge</li>
              <li>• Works on mobile and desktop</li>
            </ul>
          </div>
        </div>

        {/* Recent Check-Ins */}
        <div className="bg-[#232b3e]/60 rounded-2xl p-6 border border-[#232b3e]/40">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <FontAwesomeIcon icon={faUsers} className="text-[#0d6efd]" />
            Recent Check-Ins
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentCheckIns.length > 0 ? (
              recentCheckIns.map((checkIn, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        checkIn.category === 'Organizer' ? 'bg-orange-400' :
                        checkIn.category === 'VIP' ? 'bg-purple-400' :
                        checkIn.category === 'Speaker' ? 'bg-green-400' : 'bg-blue-400'
                      }`}></div>
                      <span className="text-white font-semibold truncate">{checkIn.fullName}</span>
                    </div>
                    <span className="text-[#6c757d] text-sm whitespace-nowrap ml-2">{checkIn.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#6c757d] text-sm -mt-1">
                    <FontAwesomeIcon icon={faUserTag} className="w-3 h-3 text-gray-400" />
                    <span className="capitalize">{checkIn.category}</span>
                    <span className="ml-auto text-xs bg-white/10 px-2 py-1 rounded-full">
                      {checkIn.uid.substring(0, 8)}...
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-[#6c757d]">
                <FontAwesomeIcon icon={faUserCheck} className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h4 className="text-white font-semibold mb-2">No Check-Ins Yet</h4>
                <p className="text-sm">Start scanning attendee QR codes to log their attendance.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
