"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobile, faTablet, faDesktop, faCheck, faDownload, faStar, faBell } from '@fortawesome/free-solid-svg-icons';
import GlassCard from './GlassCard';

interface MobileOptimizerProps {
  className?: string;
}

const MobileOptimizer: React.FC<MobileOptimizerProps> = ({ className = '' }) => {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isPWA, setIsPWA] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    // Detect device type
    const detectDevice = () => {
      const width = window.innerWidth;
      if (width <= 768) {
        setDeviceType('mobile');
      } else if (width <= 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    // Check if running as PWA
    const checkPWA = () => {
      setIsPWA(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://')
      );
    };

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    // Set viewport height for mobile
    const setVH = () => {
      setViewportHeight(window.innerHeight * 0.01);
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };

    detectDevice();
    checkPWA();
    setVH();

    window.addEventListener('resize', detectDevice);
    window.addEventListener('resize', setVH);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('resize', setVH);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      (installPrompt as any).prompt();
      const { outcome } = await (installPrompt as any).userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setInstallPrompt(null);
    }
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'mobile': return faMobile;
      case 'tablet': return faTablet;
      case 'desktop': return faDesktop;
    }
  };

  const getDeviceLabel = () => {
    switch (deviceType) {
      case 'mobile': return 'Mobile';
      case 'tablet': return 'Tablet';
      case 'desktop': return 'Desktop';
    }
  };

  const getOptimizationTips = () => {
    const tips = [];

    if (deviceType === 'mobile') {
      tips.push('Touch gestures are optimized for mobile');
      tips.push('QR scanner works best with rear camera');
      tips.push('Swipe navigation is enabled');
      tips.push('Reduced animations for better performance');
    } else if (deviceType === 'tablet') {
      tips.push('Touch and mouse interactions supported');
      tips.push('Responsive layout adapts to screen size');
      tips.push('Drag and drop works with touch');
    } else {
      tips.push('Full desktop experience enabled');
      tips.push('Hover effects are active');
      tips.push('Advanced features available');
    }

    if (isPWA) {
      tips.push('Running as Progressive Web App');
      tips.push('Offline mode available');
      tips.push('Push notifications enabled');
    } else {
      tips.push('Install as app for better experience');
      tips.push('Offline features limited');
    }

    return tips;
  };

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg">
              <FontAwesomeIcon icon={getDeviceIcon()} className="text-white text-lg" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Mobile Experience</h3>
              <p className="text-white/70 text-sm">Optimized for {getDeviceLabel()}</p>
            </div>
          </div>

          {isPWA && (
            <div className="flex items-center gap-2 text-green-400">
              <FontAwesomeIcon icon={faCheck} className="w-5 h-5" />
              <span className="text-sm font-medium">PWA Active</span>
            </div>
          )}
        </div>

        {/* Device Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{deviceType === 'mobile' ? '📱' : deviceType === 'tablet' ? '📱' : '💻'}</div>
            <div className="text-white text-sm mt-1">{getDeviceLabel()}</div>
          </div>

          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{isPWA ? '✅' : '📱'}</div>
            <div className="text-white text-sm mt-1">{isPWA ? 'Installed' : 'Browser'}</div>
          </div>

          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">⚡</div>
            <div className="text-white text-sm mt-1">Optimized</div>
          </div>

          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">🔔</div>
            <div className="text-white text-sm mt-1">Notifications</div>
          </div>
        </div>

        {/* Install Prompt */}
        {!isPWA && installPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faDownload} className="text-blue-400 text-lg" />
                <div>
                  <h4 className="text-white font-semibold">Install Event Platform</h4>
                  <p className="text-white/70 text-sm">Get the full app experience with offline support</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleInstall}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                Install
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Optimization Tips */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <FontAwesomeIcon icon={faStar} className="text-yellow-400 w-4 h-4" />
            Experience Features
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {getOptimizationTips().map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 text-white/80 text-sm p-2 bg-white/5 rounded-lg"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                <span>{tip}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile-Specific Features */}
        {deviceType === 'mobile' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <h4 className="text-white font-semibold">Mobile Features</h4>
            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <FontAwesomeIcon icon={faMobile} className="text-blue-400" />
                  </div>
                  <div>
                    <h5 className="text-white font-medium">QR Scanner</h5>
                    <p className="text-white/70 text-sm">Rear camera optimized for badge scanning</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <FontAwesomeIcon icon={faCheck} className="text-green-400" />
                  </div>
                  <div>
                    <h5 className="text-white font-medium">Touch Gestures</h5>
                    <p className="text-white/70 text-sm">Swipe to navigate, tap to interact</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <FontAwesomeIcon icon={faBell} className="text-purple-400" />
                  </div>
                  <div>
                    <h5 className="text-white font-medium">Push Notifications</h5>
                    <p className="text-white/70 text-sm">Real-time updates and alerts</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Performance Info */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <span className="text-white/80 text-sm">Performance</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm font-medium">Optimized</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

export default MobileOptimizer;
