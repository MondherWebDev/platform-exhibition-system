"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faBellSlash, faCheck, faTimes, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import GlassCard from './GlassCard';

interface PushNotificationsProps {
  className?: string;
}

const PushNotifications: React.FC<PushNotificationsProps> = ({ className = '' }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    title: string;
    body: string;
    icon?: string;
    timestamp: Date;
  } | null>(null);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);

      // Listen for permission changes
      const handlePermissionChange = () => {
        setPermission(Notification.permission);
      };

      // Listen for incoming notifications
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NOTIFICATION') {
          showNotification(event.data.payload);
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  const requestPermission = async () => {
    if (!supported) return;

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        // Register service worker for push notifications
        await registerServiceWorker();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');

        // Check if push messaging is supported
        if ('PushManager' in window) {
          // This would typically be done with a server that can send push notifications
          // For demo purposes, we'll just show a success message
          console.log('Push notifications ready');
        }
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  };

  const showNotification = (payload: { title: string; body: string; icon?: string }) => {
    setNotification({
      ...payload,
      timestamp: new Date()
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const testNotification = () => {
    if (permission === 'granted') {
      const testPayload = {
        title: 'Event Platform',
        body: 'This is a test notification from the Smart Event Management Platform!',
        icon: '/icon-192x192.png'
      };

      showNotification(testPayload);

      // Also show browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(testPayload.title, {
          body: testPayload.body,
          icon: testPayload.icon,
          badge: '/icon-192x192.png'
        });
      }
    }
  };

  const getStatusInfo = () => {
    switch (permission) {
      case 'granted':
        return {
          icon: faCheck,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          title: 'Notifications Enabled',
          description: 'You will receive notifications about events, check-ins, and updates.'
        };
      case 'denied':
        return {
          icon: faBellSlash,
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/30',
          title: 'Notifications Blocked',
          description: 'Enable notifications in your browser settings to receive updates.'
        };
      default:
        return {
          icon: faBell,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          title: 'Enable Notifications',
          description: 'Get notified about important events, check-ins, and updates.'
        };
    }
  };

  const statusInfo = getStatusInfo();

  if (!supported) {
    return (
      <GlassCard className={`p-4 ${className}`}>
        <div className="flex items-center gap-3 text-white/60">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-400" />
          <span className="text-sm">Push notifications are not supported in this browser.</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex flex-col gap-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
                <FontAwesomeIcon icon={statusInfo.icon} className={`${statusInfo.color} text-lg`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{statusInfo.title}</h3>
                <p className="text-white/70 text-sm">{statusInfo.description}</p>
              </div>
            </div>

            {permission === 'default' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={requestPermission}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
                )}
                Enable
              </motion.button>
            )}
          </div>

          {/* Test Notification Button */}
          {permission === 'granted' && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={testNotification}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-4 rounded-lg border border-white/10 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
              Send Test Notification
            </motion.button>
          )}

          {/* Notification Types */}
          {permission === 'granted' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <h4 className="text-white font-semibold text-sm">You'll receive notifications for:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-white/80">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span>Event check-ins and check-outs</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span>AI matchmaking suggestions</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span>Lead generation alerts</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span>System updates and announcements</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </GlassCard>

      {/* In-app notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm"
          >
            <GlassCard className="p-4 border-l-4 border-blue-400">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FontAwesomeIcon icon={faBell} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold text-sm">{notification.title}</h4>
                  <p className="text-white/80 text-sm mt-1">{notification.body}</p>
                  <p className="text-white/60 text-xs mt-2">
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PushNotifications;
