"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouter } from 'next/navigation';
import {
  faChartBar,
  faIdBadge,
  faQrcode,
  faLightbulb,
  faLaptopCode,
  faUser,
  faCog,
  faHome,
  faUsers,
  faUserCheck,
  faUserTag,
  faStar,
  faCalendar,
  faGlobe,
  faBars,
  faTimes,
  faChevronLeft
} from '@fortawesome/free-solid-svg-icons';

interface SidebarProps {
  activeTab: string;
  setTab: (tab: string) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setTab, isMobileOpen = false, setIsMobileOpen }) => {
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const navigation = [
    { icon: faChartBar, label: 'Overview', tab: 'Overview', color: 'text-blue-400' },
    { icon: faLaptopCode, label: 'Events (CRUD)', tab: 'Events CRUD', color: 'text-emerald-400', href: '/dashboard/organizer/events' },
    { icon: faIdBadge, label: 'Badge Management', tab: 'Badge Management', color: 'text-orange-400' },
    { icon: faQrcode, label: 'Check-In System', tab: 'Check-In System', color: 'text-green-400' },
    { icon: faUsers, label: 'Exhibitors', tab: 'Exhibitors', color: 'text-cyan-400' },
    { icon: faUserCheck, label: 'Hosted Buyers', tab: 'Hosted Buyers', color: 'text-teal-400' },
    { icon: faUserTag, label: 'Speakers', tab: 'Speakers', color: 'text-pink-400' },
    { icon: faStar, label: 'Sponsors', tab: 'Sponsors', color: 'text-amber-400' },
    { icon: faUsers, label: 'Agents', tab: 'Agents', color: 'text-purple-400' },
    { icon: faCalendar, label: 'Agenda', tab: 'Agenda', color: 'text-violet-400' },
    { icon: faGlobe, label: 'Floorplan Designer', tab: 'Floorplan Designer', color: 'text-teal-400', href: '/dashboard/organizer/floorplan-designer' },
    { icon: faLightbulb, label: 'Lead Intelligence', tab: 'Lead Intelligence', color: 'text-yellow-400' },
    { icon: faUser, label: 'Profile', tab: 'Profile', color: 'text-indigo-400' },
    { icon: faCog, label: 'Settings', tab: 'Settings', color: 'text-gray-400' },
  ];

  // Mobile sidebar content
  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-[#0d6efd]/10 bg-[#1c2331]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#0d6efd] to-[#fd7e14] rounded-lg flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={faHome} className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white text-base sm:text-lg font-bold tracking-tight">Event Platform</h1>
              <p className="text-[#6c757d] text-xs font-medium">Organizer Dashboard</p>
            </div>
          </div>
          {isMobile && setIsMobileOpen && (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-2 text-[#6c757d] hover:text-white transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="w-full bg-[#0d6efd]/10 h-1 rounded-full">
          <div className="bg-[#0d6efd] h-1 rounded-full w-1/3" style={{transition: 'width 0.3s ease'}}></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {navigation.map(({ icon, label, tab, color, href }) => (
          <button
            key={tab}
            onClick={() => {
              if (href) {
                // Navigate to external page
                router.push(href);
                if (isMobile && setIsMobileOpen) {
                  setIsMobileOpen(false);
                }
              } else {
                // Handle internal tab change
                setTab(tab);
                if (isMobile && setIsMobileOpen) {
                  setIsMobileOpen(false);
                }
              }
            }}
            className={`
              w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group
              ${activeTab === tab
                ? 'bg-gradient-to-r from-[#0d6efd]/20 to-[#0d6efd]/10 text-white shadow-lg border border-[#0d6efd]/30 transform scale-[1.02]'
                : 'text-[#6c757d] hover:bg-[#232b3e]/50 hover:text-white hover:shadow-md border border-transparent'
              }
              hover:-translate-x-1
            `}
          >
            <div className={`w-3 h-3 rounded-full ${activeTab === tab ? 'bg-white' : 'bg-transparent group-hover:bg-white/50'}`}></div>
            <FontAwesomeIcon
              icon={icon}
              className={`w-5 h-5 flex-shrink-0 ${activeTab === tab ? color : 'group-hover:text-white/70'}`}
            />
            <span className="text-left font-medium flex-1">{label}</span>
            {activeTab === tab && (
              <div className="w-2 h-2 bg-[#0d6efd] rounded-full animate-pulse"></div>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-[#0d6efd]/10 bg-[#1c2331]/80 backdrop-blur-sm">
        <div className="space-y-3">
          <div className="text-[#6c757d] text-xs text-center">
            <p>Version 1.0.0</p>
            <p className="text-[10px]">© 2025 Event Platform</p>
          </div>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#0d6efd]/30 to-transparent"></div>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />

            {/* Mobile Sidebar */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-[#1c2331] to-[#0f1419] border-r border-[#0d6efd]/20 shadow-2xl z-50 flex flex-col"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="hidden md:flex w-72 bg-gradient-to-b from-[#1c2331] to-[#0f1419] border-r border-[#0d6efd]/20 shadow-2xl flex-col h-full">
      {sidebarContent}
    </div>
  );
};

export default Sidebar;
