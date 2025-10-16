"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { processQRCodeScan, QRScanResult } from '../utils/badgeService';

// EXHIBITION QR SCANNER - Simple and Working
// Built specifically for scanning multiple badges quickly
import jsQR from 'jsqr';

interface QRCodeScannerProps {
  userId: string;
  userCategory: string;
  onScanResult?: (result: QRScanResult) => void;
  onClose?: () => void;
  mode?: 'checkin' | 'checkout' | 'lead' | 'matchmaking' | 'auto';
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  userId,
  userCategory,
  onScanResult,
  onClose,
  mode = 'auto'
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('Ready');
  const [scanAttempts, setScanAttempts] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scanStartTimeRef = useRef<number>(0);
  const consecutiveFailuresRef = useRef<number>(0);
  const maxConsecutiveFailures = 100; // Increased to 100 for more patience
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScanningRef = useRef<boolean>(false); // Add ref to track scanning state

  useEffect(() => {
    return () => {
      // Only stop scanning if we're actually scanning
      if (isScanningRef.current) {
        stopScanning();
      }
    };
  }, []);

  const startCamera = async (): Promise<boolean> => {
    try {
      console.log('🎥 Starting camera initialization...');

      // Wait for video element to be available
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait

      while (attempts < maxAttempts) {
        if (videoRef.current) {
          console.log('✅ Video element found');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!videoRef.current) {
        console.error('❌ Video element not found after waiting');
        setError('Video element not found. Please refresh the page.');
        return false;
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ getUserMedia not available');
        setError('Camera API not supported in this browser. Please use a modern browser.');
        return false;
      }

      console.log('📷 Requesting camera access...');

      // Try multiple approaches to get camera access
      let stream: MediaStream;

      try {
        // First try with specific constraints
        console.log('🔄 Trying with specific camera constraints...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        console.log('✅ Camera stream obtained with specific constraints');
      } catch (firstError) {
        console.warn('⚠️ First attempt failed, trying with basic constraints:', firstError);
        try {
          // Fallback to basic video constraints
          console.log('🔄 Trying with basic video constraints...');
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
          console.log('✅ Camera stream obtained with basic constraints');
        } catch (secondError) {
          console.warn('⚠️ Second attempt failed, trying with minimal constraints:', secondError);
          try {
            // Final fallback to any video
            console.log('🔄 Trying with minimal constraints...');
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { max: 1280 },
                height: { max: 720 }
              }
            });
            console.log('✅ Camera stream obtained with minimal constraints');
          } catch (thirdError) {
            console.error('❌ All camera access attempts failed');
            throw firstError; // Throw the original error
          }
        }
      }

      console.log('✅ Camera stream obtained successfully:', {
        streamId: stream.id,
        trackCount: stream.getTracks().length,
        videoTrack: stream.getVideoTracks()[0]?.label || 'No video track',
        trackSettings: stream.getVideoTracks()[0]?.getSettings() || 'No settings'
      });

      if (videoRef.current) {
        console.log('🎥 Setting video srcObject...');
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        console.log('⏳ Waiting for video metadata...');
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element lost'));
            return;
          }

          const onLoadedMetadata = () => {
            console.log('✅ Video metadata loaded');
            videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
            resolve(true);
          };

          const onError = (e: any) => {
            console.error('❌ Video error during load:', e);
            videoRef.current?.removeEventListener('error', onError);
            reject(new Error('Video failed to load'));
          };

          videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
          videoRef.current.addEventListener('error', onError);

          // Timeout after 10 seconds
          setTimeout(() => {
            videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
            videoRef.current?.removeEventListener('error', onError);
            reject(new Error('Video load timeout'));
          }, 10000);
        });

        console.log('✅ Camera initialization complete');
        return true;
      }

      console.error('❌ Video element lost after stream');
      return false;
    } catch (error) {
      console.error('❌ Camera initialization error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });

        if (error.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access when prompted by your browser and try again.');
        } else if (error.name === 'NotFoundError') {
          setError('No camera found. Please ensure you have a camera connected.');
        } else if (error.name === 'NotReadableError') {
          setError('Camera is already in use by another application.');
        } else {
          setError(`Camera error: ${error.message}. Please check your camera settings and try again.`);
        }
      } else {
        setError('Failed to initialize camera. Please ensure you have a camera connected.');
      }
      return false;
    }
  };

  const scanQRCode = () => {
    // Safety check - stop if not scanning or already have result
    if (!isScanningRef.current || scanResult) {
      return;
    }

    // Also stop if we have an error
    if (error) {
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ Video or canvas element not available');
      setError('Scanner components not ready. Please try again.');
      setIsScanning(false);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Check video readiness
    if (video.readyState < video.HAVE_ENOUGH_DATA) {
      setTimeout(() => {
        if (isScanningRef.current && !scanResult) {
          scanQRCode();
        }
      }, 100);
      return;
    }

    // Check if video has dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setTimeout(() => {
        if (isScanningRef.current && !scanResult) {
          scanQRCode();
        }
      }, 100);
      return;
    }

    try {
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        console.error('❌ Canvas context not available');
        setError('Canvas error. Please refresh the page.');
        setIsScanning(false);
        return;
      }

      // Set canvas dimensions to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for QR code detection
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Update scan attempts counter
      const currentAttempt = consecutiveFailuresRef.current + 1;
      setScanAttempts(currentAttempt);

      console.log('🔍 Scanning for QR code...', {
        attempt: currentAttempt,
        videoSize: `${video.videoWidth}x${video.videoHeight}`,
        canvasSize: `${canvas.width}x${canvas.height}`
      });

      // Simplified QR detection - try center area first (most common placement)
      let code = null;
      const centerSize = Math.floor(Math.min(canvas.width, canvas.height) * 0.8);
      const centerX = Math.floor((canvas.width - centerSize) / 2);
      const centerY = Math.floor((canvas.height - centerSize) / 2);

      try {
        const centerImageData = context.getImageData(centerX, centerY, centerSize, centerSize);
        code = jsQR(centerImageData.data, centerImageData.width, centerImageData.height, {
          inversionAttempts: 'attemptBoth',
        });
      } catch (error) {
        console.warn('Center detection failed:', error);
      }

      // If not found in center, try full image
      if (!code) {
        try {
          code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
        } catch (error) {
          console.warn('Full image detection failed:', error);
        }
      }

      if (code) {
        console.log('✅ QR Code detected:', code.data);

        // Don't stop scanning immediately - let processing complete first
        // Reset consecutive failures counter on successful detection
        consecutiveFailuresRef.current = 0;
        setScanStatus('🔄 QR Code detected! Processing...');

        // QR code found, process it (but don't stop scanning yet)
        handleScanSuccess(code.data);
        return;
      }

      // Update consecutive failures counter
      consecutiveFailuresRef.current++;

      // Update status based on consecutive failures
      if (consecutiveFailuresRef.current > maxConsecutiveFailures) {
        console.error('❌ Too many consecutive scan failures, stopping scanner');
        setError('Unable to detect QR codes. Please ensure good lighting and try again.');
        setIsScanning(false);
        return;
      }

      // Update status messages with more patience
      if (consecutiveFailuresRef.current > 60) {
        setScanStatus('🔍 Still searching... Make sure QR code is well lit');
      } else if (consecutiveFailuresRef.current > 30) {
        setScanStatus('📷 Scanning... Position QR code in center');
      } else if (consecutiveFailuresRef.current > 15) {
        setScanStatus('🎯 Looking for QR code... Hold steady');
      } else {
        setScanStatus('🎯 Ready - Position QR code in center');
      }

      // Continue scanning with patient timing - slower for first 30 attempts
      // But don't continue scanning if we have an error
      if (!error) {
        const delay = consecutiveFailuresRef.current > 30 ? 250 : 300;
        scanTimeoutRef.current = setTimeout(() => {
          if (isScanningRef.current && !scanResult && !error) {
            scanQRCode();
          }
        }, delay);
      }

    } catch (error) {
      console.error('❌ Error during QR code scanning:', error);

      // Stop scanning for critical errors
      if (error instanceof DOMException && error.name === 'SecurityError') {
        setError('Camera access lost. Please refresh the page and try again.');
        setIsScanning(false);
      } else {
        // For other errors, log and continue scanning
        console.warn('⚠️ Minor scanning error, continuing...', error);
        setTimeout(() => {
          if (isScanningRef.current && !scanResult) {
            scanQRCode();
          }
        }, 100);
      }
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    setError('');

    try {
      // Don't stop scanning immediately - let it continue until processing is complete
      console.log('🔄 QR Code detected, processing...', decodedText);

      // Set a processing state
      setScanStatus('🔄 Processing QR code...');

      // Process the QR code scan with timeout
      const result = await Promise.race([
        processQRCodeScan(
          decodedText,
          userId,
          userCategory,
          mode === 'auto' ? undefined : mode
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Processing timeout')), 10000)
        )
      ]) as QRScanResult;

      console.log('✅ QR Code processed:', result);

      setScanResult(result);

      // Call the callback if provided
      if (onScanResult) {
        onScanResult(result);
      }

      // Auto-close camera after successful scan and show result briefly
      if (result.success) {
        console.log('✅ Scan successful, auto-closing camera in 2 seconds...');

        // Show result for 2 seconds, then close
        setTimeout(() => {
          console.log('⏰ Auto-closing scanner after successful scan');
          // Force close everything
          stopScanning();
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
              console.log('🛑 Force stopping track:', track.label);
              track.stop();
            });
            streamRef.current = null;
          }
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
          if (onClose) {
            console.log('🔒 Calling onClose callback');
            onClose();
          }
        }, 2000);
      } else {
        // For errors, don't auto-close, let user retry
        console.log('❌ Scan failed, keeping scanner open for retry');
        setScanStatus('❌ Scan failed - ready for retry');
      }
    } catch (error) {
      console.error('❌ Scan processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process QR code';

      // Provide more specific error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('User not found')) {
        userFriendlyMessage = 'Attendee not found in database. Please ensure they are registered.';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Processing took too long. Please try again.';
      } else if (errorMessage.includes('network') || errorMessage.includes('Database')) {
        userFriendlyMessage = 'Connection error. Please check your internet and try again.';
      }

      setError(userFriendlyMessage);
      setScanStatus('❌ Ready for retry');
    }
  };

  const stopScanning = () => {
    console.log('🛑 Stopping scanner...');

    // Clear any pending timeouts
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('🛑 Stopping track:', track.label);
        track.stop();
      });
      streamRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Reset state and ref
    setIsScanning(false);
    isScanningRef.current = false;
    consecutiveFailuresRef.current = 0;
    setScanStatus('Ready');

    console.log('✅ Scanner stopped successfully');
  };

  const handleStartScan = async () => {
    console.log('🚀 Starting scan process...');
    setIsScanning(true);
    isScanningRef.current = true; // Set ref immediately
    setScanResult(null);
    setError('');
    setIsWarmingUp(true);
    scanStartTimeRef.current = Date.now();

    const cameraStarted = await startCamera();
    if (cameraStarted) {
      console.log('⏳ Waiting for camera to stabilize...');

      // Wait for video to be fully ready
      const waitForVideoReady = () => {
        if (videoRef.current && videoRef.current.readyState >= videoRef.current.HAVE_ENOUGH_DATA) {
          console.log('🎯 Camera ready, starting scan loop...');
          setIsWarmingUp(false);

          // Start scanning immediately - use a more reliable approach
          console.log('🚀 Starting first scan...');
          console.log('📊 Current scanning state:', isScanning, 'Ref:', isScanningRef.current);

          // Use requestAnimationFrame for better timing instead of setTimeout
          requestAnimationFrame(() => {
            console.log('🎬 Animation frame executed');
            console.log('📊 Animation frame state:', { isScanning, scanResult: !!scanResult, ref: isScanningRef.current });

            if (isScanningRef.current && !scanResult) {
              console.log('🔄 Calling scanQRCode function...');
              scanQRCode();
            } else {
              console.log('❌ Animation frame conditions not met:', { isScanning, scanResult: !!scanResult, ref: isScanningRef.current });
            }
          });
        } else {
          console.log('⏳ Waiting for video ready state...', videoRef.current?.readyState);
          setTimeout(waitForVideoReady, 100);
        }
      };

      // Start checking immediately
      setTimeout(waitForVideoReady, 100);
    } else {
      setIsScanning(false);
      isScanningRef.current = false;
    }
  };

  const handleRetry = async () => {
    setError('');
    setScanResult(null);
    await handleStartScan();
  };

  const handleStopScan = () => {
    stopScanning();
  };

  const handleClose = () => {
    stopScanning();
    if (onClose) {
      onClose();
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'checkin':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'checkout':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'lead':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        );
      case 'matchmaking':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12l-3.5-3.5M12 12l3.5-3.5M12 12v8m0 0l-3.5-3.5M12 20l3.5-3.5" />
          </svg>
        );
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'checkin':
        return 'Check-in Scanner';
      case 'checkout':
        return 'Check-out Scanner';
      case 'lead':
        return 'Lead Capture Scanner';
      case 'matchmaking':
        return 'Matchmaking Scanner';
      default:
        return 'QR Code Scanner';
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'checkin':
        return 'Scan attendee badges to check them in';
      case 'checkout':
        return 'Scan attendee badges to check them out';
      case 'lead':
        return 'Scan visitor badges to capture leads';
      case 'matchmaking':
        return 'Scan exhibitor badges to find matches';
      default:
        return 'Scan QR codes for various actions';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3">
            {getModeIcon()}
            <div>
              <h2 className="text-xl font-bold">{getModeTitle()}</h2>
              <p className="text-blue-100 text-sm">{getModeDescription()}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {!isScanning && !scanResult && (
              <motion.div
                key="start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  {getModeIcon()}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Ready to Scan
                </h3>
                <p className="text-gray-600 mb-6">
                  Position a QR code within the camera view to scan it
                </p>
                <button
                  onClick={handleStartScan}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300"
                >
                  Start Scanning
                </button>
              </motion.div>
            )}

            {isScanning && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="mb-4 relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-w-sm mx-auto rounded-lg shadow-lg"
                    style={{
                      // Removed mirroring to fix QR code scanning
                      aspectRatio: '4/3',
                      objectFit: 'cover'
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  {/* QR Code overlay with animated scanning line */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-48 h-48">
                      {/* QR Code guide overlay */}
                      <div className="absolute inset-0 border-2 border-white/50 rounded-lg">
                        <div className="w-full h-full border-2 border-white/30 rounded-lg relative overflow-hidden">
                          {/* Corner markers for QR code positioning */}
                          <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-white/70 rounded-tl-lg"></div>
                          <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-white/70 rounded-tr-lg"></div>
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-white/70 rounded-bl-lg"></div>
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-white/70 rounded-br-lg"></div>

                          {/* Animated scanning line */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                              className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                              animate={{
                                top: ["0%", "100%", "0%"],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            />
                          </div>

                          {/* Center pulsing dot */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="w-3 h-3 bg-white/70 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>

                      {/* Transparent QR code guide */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <svg width="120" height="120" viewBox="0 0 120 120" className="text-white">
                          {/* QR Code pattern guide */}
                          <rect x="0" y="0" width="30" height="30" fill="currentColor"/>
                          <rect x="90" y="0" width="30" height="30" fill="currentColor"/>
                          <rect x="0" y="90" width="30" height="30" fill="currentColor"/>
                          <rect x="30" y="30" width="60" height="60" fill="currentColor"/>
                          <rect x="60" y="60" width="30" height="30" fill="currentColor"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Warm-up indicator */}
                  {isWarmingUp && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-blue-500/90 text-white px-4 py-2 rounded-full text-sm font-medium"
                      >
                        Getting ready... Position your QR code
                      </motion.div>
                    </div>
                  )}
                </div>

                {/* Status text */}
                <div className="mb-4">
                  {isWarmingUp ? (
                    <p className="text-blue-600 font-medium">
                      🎯 Preparing scanner... Please wait
                    </p>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-600 mb-2">
                        Position QR code in the center and hold steady
                      </p>
                      <p className="text-sm text-gray-500 mb-2">
                        💡 First scan = Check-in | Second scan = Check-out
                      </p>
                      {/* Scan counter to show activity */}
                      <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm">
                        <span className="text-gray-600">Scan Attempts: </span>
                        <span className="font-bold text-blue-600">{scanAttempts}</span>
                        <span className="text-gray-500 ml-2">
                          {scanAttempts > 0 ? '🔍 Scanning...' : '⏹️ Ready'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleStopScan}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Stop
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}

            {scanResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  scanResult.success
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {scanResult.success ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>

                <h3 className={`text-lg font-semibold mb-2 ${
                  scanResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {scanResult.success ? 'Success!' : 'Error'}
                </h3>

                <p className={`mb-4 ${
                  scanResult.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {scanResult.message}
                </p>

                {scanResult.data && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                    <h4 className="font-semibold text-gray-800 mb-2">Details:</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      {scanResult.data.userName && (
                        <p><span className="font-medium">Name:</span> {scanResult.data.userName}</p>
                      )}
                      {scanResult.data.userCompany && (
                        <p><span className="font-medium">Company:</span> {scanResult.data.userCompany}</p>
                      )}
                      {scanResult.data.checkInTime && (
                        <p><span className="font-medium">Check-in Time:</span> {new Date(scanResult.data.checkInTime).toLocaleTimeString()}</p>
                      )}
                      {scanResult.data.checkOutTime && (
                        <p><span className="font-medium">Check-out Time:</span> {new Date(scanResult.data.checkOutTime).toLocaleTimeString()}</p>
                      )}
                      {scanResult.data.leadScore && (
                        <p><span className="font-medium">Lead Score:</span> {scanResult.data.leadScore}</p>
                      )}
                      {scanResult.data.matchScore && (
                        <p><span className="font-medium">Match Score:</span> {scanResult.data.matchScore}%</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleRetry}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Scan Again
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="w-12 h-12 mx-auto mb-3 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-800 font-medium mb-2">Scan Error</p>
                <p className="text-red-600 text-sm mb-4">{error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRetry}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>User: {userCategory}</span>
            <span>Mode: {mode}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QRCodeScanner;
