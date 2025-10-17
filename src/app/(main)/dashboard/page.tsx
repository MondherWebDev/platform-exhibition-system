"use client";
import React, { useState, useEffect } from "react";
import { db, auth } from "../../../firebaseConfig";
import AuthForm from "../../../components/AuthForm";
import { collection, getDocs, doc, updateDoc, serverTimestamp, getDoc, setDoc, query, where, orderBy, limit, onSnapshot, addDoc, deleteDoc, increment } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { authService, UserProfile } from "../../../utils/authService";
import ClientOnly from '../../../components/ClientOnly';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrown,
  faBrain,
  faQrcode,
  faPrint,
  faUserCheck,
  faUsers,
  faBuilding,
  faHandshake,
  faChartLine,
  faChartBar,
  faTrophy,
  faStar,
  faLightbulb,
  faCalendar,
  faClock,
  faEye,
  faDownload,
  faCog,
  faBars,
  faSignOutAlt,
  faBell,
  faInfoCircle,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faArrowRight,
  faArrowLeft,
  faPlus,
  faEdit,
  faTrash,
  faRefresh,
  faPlay,
  faStop,
  faPause,
  faForward,
  faBackward,
  faSort,
  faSortUp,
  faSortDown,
  faFilter,
  faSearch,
  faDownload as faDownloadIcon,
  faCog as faCogIcon,
  faBars as faBarsIcon,
  faSignOutAlt as faSignOutAltIcon,
  faBell as faBellIcon,
  faInfoCircle as faInfoCircleIcon,
  faCrown as faCrownIcon,
  faBrain as faBrainIcon,
  faQrcode as faQrcodeIcon,
  faPrint as faPrintIcon,
  faUserCheck as faUserCheckIcon,
  faUsers as faUsersIcon,
  faBuilding as faBuildingIcon,
  faHandshake as faHandshakeIcon,
  faChartLine as faChartLineIcon,
  faChartBar as faChartBarIcon,
  faTrophy as faTrophyIcon,
  faStar as faStarIcon,
  faLightbulb as faLightbulbIcon,
  faCalendar as faCalendarIcon,
  faClock as faClockIcon,
  faEye as faEyeIcon,
  faDownload as faDownloadIconIcon,
  faCog as faCogIconIcon,
  faBars as faBarsIconIcon,
  faSignOutAlt as faSignOutAltIconIcon,
  faBell as faBellIconIcon,
  faInfoCircle as faInfoCircleIconIcon,
  faCheckCircle as faCheckCircleIcon,
  faTimesCircle as faTimesCircleIcon,
  faSpinner as faSpinnerIcon,
  faArrowRight as faArrowRightIcon,
  faArrowLeft as faArrowLeftIcon,
  faPlus as faPlusIcon,
  faEdit as faEditIcon,
  faTrash as faTrashIcon,
  faRefresh as faRefreshIcon,
  faPlay as faPlayIcon,
  faStop as faStopIcon,
  faPause as faPauseIcon,
  faForward as faForwardIcon,
  faBackward as faBackwardIcon,
  faSort as faSortIcon,
  faSortUp as faSortUpIcon,
  faSortDown as faSortDownIcon,
  faFilter as faFilterIcon,
  faSearch as faSearchIcon,
  faDownload as faDownloadIconIconIcon,
  faCog as faCogIconIconIcon,
  faBars as faBarsIconIconIcon,
  faSignOutAlt as faSignOutAltIconIconIcon,
  faBell as faBellIconIconIcon,
  faInfoCircle as faInfoCircleIconIconIcon,
  faCrown as faCrownIconIcon,
  faBrain as faBrainIconIcon,
  faQrcode as faQrcodeIconIcon,
  faPrint as faPrintIconIcon,
  faUserCheck as faUserCheckIconIcon,
  faUsers as faUsersIconIcon,
  faBuilding as faBuildingIconIcon,
  faHandshake as faHandshakeIconIcon,
  faChartLine as faChartLineIconIcon,
  faChartBar as faChartBarIconIcon,
  faTrophy as faTrophyIconIcon,
  faStar as faStarIconIcon,
  faLightbulb as faLightbulbIconIcon,
  faCalendar as faCalendarIconIcon,
  faClock as faClockIconIcon,
  faEye as faEyeIconIcon,
  faDownload as faDownloadIconIconIconIcon,
  faCog as faCogIconIconIconIcon,
  faBars as faBarsIconIconIconIcon,
  faSignOutAlt as faSignOutAltIconIconIconIcon,
  faBell as faBellIconIconIconIcon,
  faInfoCircle as faInfoCircleIconIconIconIcon,
  faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';

interface DashboardStats {
  // User Statistics
  totalUsers: number;
  totalAttendees: number;
  totalExhibitors: number;
  totalHostedBuyers: number;

  // Engagement Statistics
  totalCheckIns: number;
  todayCheckIns: number;
  totalLeads: number;
  totalMatches: number;

  // Performance Statistics
  averageMatchScore: number;
  conversionRate: number;
  badgesPrinted: number;
  printQueueSize: number;

  // System Health
  systemStatus: 'healthy' | 'warning' | 'error';
  lastUpdated: any;
}

export default function CentralDashboard() {
  const [user, setUser] = React.useState<any>(null);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<DashboardStats>({
    totalUsers: 0,
    totalAttendees: 0,
    totalExhibitors: 0,
    totalHostedBuyers: 0,
    totalCheckIns: 0,
    todayCheckIns: 0,
    totalLeads: 0,
    totalMatches: 0,
    averageMatchScore: 0,
    conversionRate: 0,
    badgesPrinted: 0,
    printQueueSize: 0,
    systemStatus: 'healthy',
    lastUpdated: null
  });

  const [recentActivity, setRecentActivity] = React.useState<any[]>([]);
  const [currentEventId, setCurrentEventId] = React.useState<string>('default');
  const [isClient, setIsClient] = React.useState(false);

  // Real-time data subscriptions
  const [users, setUsers] = React.useState<any[]>([]);
  const [hostedBuyers, setHostedBuyers] = React.useState<any[]>([]);
  const [exhibitors, setExhibitors] = React.useState<any[]>([]);
  const [leads, setLeads] = React.useState<any[]>([]);
  const [matches, setMatches] = React.useState<any[]>([]);
  const [checkIns, setCheckIns] = React.useState<any[]>([]);
  const [printJobs, setPrintJobs] = React.useState<any[]>([]);

  // Enhanced attendee tracking state
  const [dailyStats, setDailyStats] = React.useState<any[]>([]);
  const [currentDayStats, setCurrentDayStats] = React.useState<any>({
    date: new Date().toISOString().split('T')[0],
    checkIns: 0,
    checkOuts: 0,
    uniqueAttendees: 0,
    totalAttendees: 0
  });
  const [realTimeUpdates, setRealTimeUpdates] = React.useState<any[]>([]);
  const [newRegistrations, setNewRegistrations] = React.useState<any[]>([]);
  const [dailyCheckInData, setDailyCheckInData] = React.useState<any[]>([]);

  // Authentication check
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'Users', u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.category === 'Organizer' || data.category === 'Admin' || data.isAdmin) {
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

  // Load all data for comprehensive dashboard
  React.useEffect(() => {
    if (!currentEventId) return;

    // Load users
    const usersUnsub = onSnapshot(collection(db, 'Users'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(data);
    });

    // Load hosted buyers
    const buyersUnsub = onSnapshot(
      collection(db, 'Events', currentEventId, 'HostedBuyers'),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setHostedBuyers(data);
      }
    );

    // Load exhibitors
    const exhibitorsUnsub = onSnapshot(
      collection(db, 'Events', currentEventId, 'Exhibitors'),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setExhibitors(data);
      }
    );

    // Load leads
    const leadsUnsub = onSnapshot(collection(db, 'Leads'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeads(data);
    });

    // Load matches
    const matchesUnsub = onSnapshot(collection(db, 'MatchmakingRecommendations'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatches(data);
    });

    // Load check-ins
    const checkinsUnsub = onSnapshot(
      query(collection(db, 'CheckIns'), orderBy('at', 'desc'), limit(20)),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCheckIns(data);
      }
    );

    // Load print jobs
    const printJobsUnsub = onSnapshot(
      query(collection(db, 'PrintJobs'), orderBy('createdAt', 'desc'), limit(20)),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPrintJobs(data);
      }
    );

    return () => {
      usersUnsub();
      buyersUnsub();
      exhibitorsUnsub();
      leadsUnsub();
      matchesUnsub();
      checkinsUnsub();
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

  // Calculate comprehensive statistics
  React.useEffect(() => {
    const totalUsers = users.length;
    const totalAttendees = users.filter(u => u.category === 'Visitor').length;
    const totalExhibitors = exhibitors.length;
    const totalHostedBuyers = hostedBuyers.length;

    const today = new Date().toISOString().split('T')[0];
    const todayCheckIns = checkIns.filter(c => c.eventDay === today && c.type === 'in').length;
    const totalCheckIns = checkIns.length;

    const totalLeads = leads.length;
    const totalMatches = matches.length;
    const averageMatchScore = totalMatches > 0
      ? matches.reduce((sum, m) => sum + m.score, 0) / totalMatches
      : 0;

    const conversionRate = totalLeads > 0 ? Math.round((totalMatches / totalLeads) * 100) : 0;
    const badgesPrinted = printJobs.filter(job => job.status === 'completed').length;

    setStats({
      totalUsers,
      totalAttendees,
      totalExhibitors,
      totalHostedBuyers,
      totalCheckIns,
      todayCheckIns,
      totalLeads,
      totalMatches,
      averageMatchScore: Math.round(averageMatchScore * 100) / 100,
      conversionRate,
      badgesPrinted,
      printQueueSize: printJobs.filter(job => job.status === 'pending').length,
      systemStatus: 'healthy',
      lastUpdated: new Date()
    });
  }, [users, hostedBuyers, exhibitors, leads, matches, checkIns, printJobs]);

  // Enhanced attendee tracking calculations
  React.useEffect(() => {
    // Calculate daily statistics for attendee tracking
    const dailyData: any = {};
    const today = new Date().toISOString().split('T')[0];

    // Group check-ins by day
    checkIns.forEach(checkin => {
      const day = checkin.eventDay || today;
      if (!dailyData[day]) {
        dailyData[day] = {
          date: day,
          checkIns: 0,
          checkOuts: 0,
          uniqueAttendees: new Set(),
          totalAttendees: 0
        };
      }

      if (checkin.type === 'in') {
        dailyData[day].checkIns++;
        dailyData[day].uniqueAttendees.add(checkin.uid);
      } else {
        dailyData[day].checkOuts++;
      }
    });

    // Calculate unique attendees and total for each day
    Object.keys(dailyData).forEach(day => {
      dailyData[day].uniqueAttendees = dailyData[day].uniqueAttendees.size;
      dailyData[day].totalAttendees = dailyData[day].checkIns; // Total check-ins for the day
    });

    setDailyStats(Object.values(dailyData));

    // Set current day stats
    const currentDay = dailyData[today] || {
      date: today,
      checkIns: 0,
      checkOuts: 0,
      uniqueAttendees: 0,
      totalAttendees: 0
    };
    setCurrentDayStats(currentDay);

    // Calculate daily check-in data for charts
    const chartData = Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]: [string, any]) => ({
        date,
        checkIns: data.checkIns,
        checkOuts: data.checkOuts,
        uniqueAttendees: data.uniqueAttendees,
        totalAttendees: data.totalAttendees
      }));
    setDailyCheckInData(chartData);
  }, [checkIns, users]);

  // Track real-time updates for new registrations and check-ins
  React.useEffect(() => {
    const updates: any[] = [];

    // Track new user registrations (users created in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    users.forEach(user => {
      if (user.createdAt && user.createdAt.toDate && user.createdAt.toDate() > oneDayAgo) {
        updates.push({
          id: `new-user-${user.id}`,
          type: 'registration',
          icon: faUsers,
          color: 'green',
          title: `New Registration: ${user.fullName || user.email}`,
          subtitle: user.company || 'No company',
          timestamp: user.createdAt?.toDate ? user.createdAt.toDate().toLocaleString() : new Date().toLocaleString(),
          category: user.category || 'Visitor'
        });
      }
    });

    // Track recent check-ins (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    checkIns.forEach(checkin => {
      if (checkin.at && checkin.at.toDate && checkin.at.toDate() > twoHoursAgo) {
        const user = users.find(u => u.id === checkin.uid);
        updates.push({
          id: `realtime-checkin-${checkin.id}`,
          type: 'checkin',
          icon: faUserCheck,
          color: checkin.type === 'in' ? 'green' : 'red',
          title: `${checkin.type === 'in' ? 'Check-in' : 'Check-out'}: ${user?.fullName || 'Unknown User'}`,
          subtitle: user?.company || 'No company',
          timestamp: checkin.at?.toDate ? checkin.at.toDate().toLocaleString() : new Date().toLocaleString(),
          category: user?.category || 'Visitor'
        });
      }
    });

    // Sort by timestamp (most recent first) and limit to 15
    updates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRealTimeUpdates(updates.slice(0, 15));
  }, [users, checkIns]);

  // Generate recent activity feed
  React.useEffect(() => {
    const activities: any[] = [];

    // Add recent check-ins
    checkIns.slice(0, 5).forEach(checkin => {
      const user = users.find(u => u.id === checkin.uid);
      activities.push({
        id: `checkin-${checkin.id}`,
        type: 'checkin',
        icon: faUserCheck,
        color: checkin.type === 'in' ? 'green' : 'red',
        title: `${checkin.type === 'in' ? 'Check-in' : 'Check-out'}: ${user?.fullName || 'Unknown User'}`,
        subtitle: user?.company || 'No company',
        timestamp: checkin.at?.toDate ? checkin.at.toDate().toLocaleString() : new Date().toLocaleString(),
        category: user?.category || 'Visitor'
      });
    });

    // Add recent leads
    leads.slice(0, 3).forEach(lead => {
      activities.push({
        id: `lead-${lead.id}`,
        type: 'lead',
        icon: faHandshake,
        color: 'blue',
        title: `New Lead: ${lead.attendeeName}`,
        subtitle: `Captured by ${lead.exhibitorName}`,
        timestamp: lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleString() : new Date().toLocaleString(),
        category: 'Lead'
      });
    });

    // Add recent matches
    matches.slice(0, 3).forEach(match => {
      activities.push({
        id: `match-${match.id}`,
        type: 'match',
        icon: faBrain,
        color: 'purple',
        title: `AI Match: ${match.buyerName} ↔ ${match.exhibitorName}`,
        subtitle: `Score: ${(match.score * 100).toFixed(0)}%`,
        timestamp: match.createdAt?.toDate ? match.createdAt.toDate().toLocaleString() : new Date().toLocaleString(),
        category: 'Matchmaking'
      });
    });

    // Add recent print jobs
    printJobs.slice(0, 3).forEach(job => {
      activities.push({
        id: `print-${job.id}`,
        type: 'print',
        icon: faPrint,
        color: 'slate',
        title: `Badge Printed: ${job.attendeeName}`,
        subtitle: `Status: ${job.status}`,
        timestamp: job.createdAt?.toDate ? job.createdAt.toDate().toLocaleString() : new Date().toLocaleString(),
        category: 'Printing'
      });
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentActivity(activities.slice(0, 10));
  }, [checkIns, leads, matches, printJobs, users]);

  // Export comprehensive report as professional PDF
  const exportComprehensiveReport = async () => {
    try {
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default || jsPDFModule;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const timestamp = new Date().toISOString().split('T')[0];
      let yPosition = 20;
      const pageHeight = 297; // A4 height in mm
      const margin = 20;

      // Helper function to add new page if needed
      const checkPageBreak = (neededSpace: number) => {
        if (yPosition + neededSpace > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Title Page
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235); // Blue color
      doc.text('QATAR TRAVEL MART 2025', 105, yPosition, { align: 'center' });
      yPosition += 15;

      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('Event Analytics Report', 105, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, yPosition, { align: 'center' });
      yPosition += 20;

      // Executive Summary Section
      checkPageBreak(50);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('EXECUTIVE SUMMARY', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const summaryData = [
        ['Total Users', stats.totalUsers.toString()],
        ['Total Attendees', stats.totalAttendees.toString()],
        ['Total Exhibitors', stats.totalExhibitors.toString()],
        ['Total VIP Buyers', stats.totalHostedBuyers.toString()],
        ['Total Check-ins', stats.totalCheckIns.toString()],
        ['Today\'s Check-ins', stats.todayCheckIns.toString()],
        ['Total Leads', stats.totalLeads.toString()],
        ['Total AI Matches', stats.totalMatches.toString()],
        ['Average Match Score', stats.averageMatchScore.toString()],
        ['Lead Conversion Rate', `${stats.conversionRate}%`],
        ['Badges Printed', stats.badgesPrinted.toString()]
      ];

      summaryData.forEach(([label, value]) => {
        checkPageBreak(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(`${label}:`, margin, yPosition);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(37, 99, 235);
        doc.text(value, margin + 50, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Key Metrics Section
      checkPageBreak(60);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('KEY PERFORMANCE METRICS', margin, yPosition);
      yPosition += 15;

      // Draw a simple bar chart for key metrics
      const metrics = [
        { label: 'Users', value: stats.totalUsers, color: [59, 130, 246] },
        { label: 'Attendees', value: stats.totalAttendees, color: [34, 197, 94] },
        { label: 'Check-ins', value: stats.totalCheckIns, color: [168, 85, 247] },
        { label: 'Leads', value: stats.totalLeads, color: [249, 115, 22] },
        { label: 'Matches', value: stats.totalMatches, color: [236, 72, 153] }
      ];

      const maxValue = Math.max(...metrics.map(m => m.value));
      const chartWidth = 120;
      const chartHeight = 40;

      metrics.forEach((metric, index) => {
        checkPageBreak(15);
        const barWidth = (metric.value / maxValue) * chartWidth;
        const x = margin;
        const y = yPosition;

        // Draw bar background
        doc.setFillColor(240, 240, 240);
        doc.rect(x, y, chartWidth, 8, 'F');

        // Draw colored bar
        doc.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
        doc.rect(x, y, barWidth, 8, 'F');

        // Draw label and value
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(`${metric.label}: ${metric.value}`, x + chartWidth + 10, y + 6);

        yPosition += 12;
      });

      yPosition += 10;

      // Users Section
      if (users.length > 0) {
        checkPageBreak(50);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text(`REGISTERED USERS (${users.length})`, margin, yPosition);
        yPosition += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);

        // Table headers
        const userHeaders = ['Name', 'Email', 'Company', 'Category'];
        const colWidth = (210 - margin * 2) / userHeaders.length;

        userHeaders.forEach((header, i) => {
          doc.text(header, margin + i * colWidth, yPosition);
        });
        yPosition += 6;

        // Draw header line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, 210 - margin, yPosition);
        yPosition += 6;

        // User data (limit to prevent overflow)
        users.slice(0, 20).forEach((user, index) => {
          checkPageBreak(6);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(50, 50, 50);

          const userData = [
            user.fullName || 'N/A',
            user.email || 'N/A',
            user.company || 'N/A',
            user.category || 'N/A'
          ];

          userData.forEach((data, i) => {
            doc.text(data.substring(0, 20), margin + i * colWidth, yPosition);
          });
          yPosition += 5;
        });

        if (users.length > 20) {
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`... and ${users.length - 20} more users`, margin, yPosition);
          yPosition += 10;
        }
      }

      // Leads Section
      if (leads.length > 0) {
        checkPageBreak(50);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text(`LEADS CAPTURED (${leads.length})`, margin, yPosition);
        yPosition += 10;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);

        // Table headers
        const leadHeaders = ['Attendee', 'Company', 'Exhibitor', 'Score', 'Status'];
        const leadColWidth = (210 - margin * 2) / leadHeaders.length;

        leadHeaders.forEach((header, i) => {
          doc.text(header, margin + i * leadColWidth, yPosition);
        });
        yPosition += 6;

        // Draw header line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, 210 - margin, yPosition);
        yPosition += 6;

        // Lead data (limit to prevent overflow)
        leads.slice(0, 15).forEach((lead, index) => {
          checkPageBreak(6);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(50, 50, 50);

          const leadData = [
            lead.attendeeName || 'N/A',
            lead.attendeeCompany || 'N/A',
            lead.exhibitorName || 'N/A',
            lead.score?.toString() || 'N/A',
            lead.status || 'N/A'
          ];

          leadData.forEach((data, i) => {
            doc.text(data.substring(0, 15), margin + i * leadColWidth, yPosition);
          });
          yPosition += 5;
        });

        if (leads.length > 15) {
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`... and ${leads.length - 15} more leads`, margin, yPosition);
          yPosition += 10;
        }
      }

      // Check-ins Summary
      if (checkIns.length > 0) {
        checkPageBreak(40);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text(`ATTENDEE TRACKING (${checkIns.length} records)`, margin, yPosition);
        yPosition += 10;

        // Daily check-in summary
        const dailySummary: any = {};
        checkIns.forEach(checkin => {
          const day = checkin.eventDay || new Date().toISOString().split('T')[0];
          if (!dailySummary[day]) {
            dailySummary[day] = { checkIns: 0, checkOuts: 0 };
          }
          if (checkin.type === 'in') {
            dailySummary[day].checkIns++;
          } else {
            dailySummary[day].checkOuts++;
          }
        });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Daily Check-in Summary:', margin, yPosition);
        yPosition += 8;

        Object.entries(dailySummary).slice(0, 7).forEach(([date, data]: [string, any]) => {
          checkPageBreak(6);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(50, 50, 50);
          doc.text(`${new Date(date).toLocaleDateString()}: ${data.checkIns} in, ${data.checkOuts} out`, margin + 5, yPosition);
          yPosition += 5;
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Qatar Travel Mart 2025 - Analytics Report - Page ${i} of ${totalPages}`,
          105,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      doc.save(`event_analytics_report_${timestamp}.pdf`);

    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Error generating PDF report. Please try again.');
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
          <div className="text-white">Loading Central Dashboard...</div>
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

  if (!userProfile || (userProfile.category !== 'Organizer' && userProfile.category !== 'Admin')) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <FontAwesomeIcon icon={faTimesCircle} className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>Only organizers can access the central dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <header className="bg-blue-900/80 backdrop-blur-md border-b border-blue-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faChartBar} className="text-blue-400 text-2xl" />
            <div>
              <h1 className="text-xl font-bold text-white">Central Dashboard</h1>
              <p className="text-blue-200 text-sm">Comprehensive analytics and control center for all event applications</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <div className="text-gray-300">Last Updated</div>
              <div className="text-white font-medium">
                {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : 'Never'}
              </div>
            </div>
            <button
              onClick={() => {
                auth.signOut();
                window.location.href = '/signin';
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Key Metrics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-blue-600/20 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
              </div>
              <FontAwesomeIcon icon={faUsers} className="text-blue-400 text-2xl" />
            </div>
          </div>

          <div className="bg-green-600/20 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm">Attendees</p>
                <p className="text-2xl font-bold text-white">{stats.totalAttendees}</p>
              </div>
              <FontAwesomeIcon icon={faUsers} className="text-green-400 text-2xl" />
            </div>
          </div>

          <div className="bg-purple-600/20 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm">Exhibitors</p>
                <p className="text-2xl font-bold text-white">{stats.totalExhibitors}</p>
              </div>
              <FontAwesomeIcon icon={faBuilding} className="text-purple-400 text-2xl" />
            </div>
          </div>

          <div className="bg-yellow-600/20 rounded-xl p-4 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-300 text-sm">VIP Buyers</p>
                <p className="text-2xl font-bold text-white">{stats.totalHostedBuyers}</p>
              </div>
              <FontAwesomeIcon icon={faCrown} className="text-yellow-400 text-2xl" />
            </div>
          </div>

          <div className="bg-orange-600/20 rounded-xl p-4 border border-orange-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-300 text-sm">Total Leads</p>
                <p className="text-2xl font-bold text-white">{stats.totalLeads}</p>
              </div>
              <FontAwesomeIcon icon={faHandshake} className="text-orange-400 text-2xl" />
            </div>
          </div>

          <div className="bg-pink-600/20 rounded-xl p-4 border border-pink-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-300 text-sm">AI Matches</p>
                <p className="text-2xl font-bold text-white">{stats.totalMatches}</p>
              </div>
              <FontAwesomeIcon icon={faBrain} className="text-pink-400 text-2xl" />
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faChartLine} className="text-blue-400" />
              Performance Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Today's Check-ins</span>
                <span className="text-white font-bold">{stats.todayCheckIns}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Total Check-ins</span>
                <span className="text-white font-bold">{stats.totalCheckIns}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Badges Printed</span>
                <span className="text-white font-bold">{stats.badgesPrinted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Conversion Rate</span>
                <span className="text-green-400 font-bold">{stats.conversionRate}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faBrain} className="text-purple-400" />
              Matchmaking Analytics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Total Matches</span>
                <span className="text-white font-bold">{stats.totalMatches}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Average Score</span>
                <span className="text-purple-400 font-bold">{stats.averageMatchScore}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Match Success Rate</span>
                <span className="text-green-400 font-bold">
                  {stats.totalMatches > 0 ? Math.round((matches.filter(m => m.status === 'accepted').length / stats.totalMatches) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Scheduled Meetings</span>
                <span className="text-blue-400 font-bold">
                  {matches.filter(m => m.status === 'scheduled').length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faTrophy} className="text-yellow-400" />
              System Health
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">System Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  stats.systemStatus === 'healthy' ? 'bg-green-500/20 text-green-300' :
                  stats.systemStatus === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {stats.systemStatus.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Active Users</span>
                <span className="text-white font-bold">
                  {users.filter(u => u.lastActive && (new Date().getTime() - new Date(u.lastActive.toDate()).getTime()) < 300000).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Print Queue</span>
                <span className="text-white font-bold">{stats.printQueueSize}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Data Sync</span>
                <span className="text-green-400 font-bold">Real-time</span>
              </div>
            </div>
          </div>
        </div>

        {/* Application Access Grid */}
        <div className="bg-white/5 rounded-xl p-6 mb-8 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6">Application Management</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <a
              href="/hosted-buyers"
              className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-lg p-4 border border-yellow-500/30 hover:border-yellow-400/50 transition-colors text-center"
            >
              <FontAwesomeIcon icon={faCrown} className="text-yellow-400 text-2xl mb-2" />
              <h4 className="text-white font-semibold text-sm">VIP Buyers</h4>
              <p className="text-yellow-200 text-xs">{hostedBuyers.length} buyers</p>
            </a>

            <a
              href="/matchmaking"
              className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-lg p-4 border border-purple-500/30 hover:border-purple-400/50 transition-colors text-center"
            >
              <FontAwesomeIcon icon={faBrain} className="text-purple-400 text-2xl mb-2" />
              <h4 className="text-white font-semibold text-sm">AI Matchmaking</h4>
              <p className="text-purple-200 text-xs">{stats.totalMatches} matches</p>
            </a>

            <a
              href="/leads"
              className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-lg p-4 border border-blue-500/30 hover:border-blue-400/50 transition-colors text-center"
            >
              <FontAwesomeIcon icon={faQrcode} className="text-blue-400 text-2xl mb-2" />
              <h4 className="text-white font-semibold text-sm">Lead Scanner</h4>
              <p className="text-blue-200 text-xs">{stats.totalLeads} leads</p>
            </a>

            <button
              onClick={() => window.location.href = '/events'}
              className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-lg p-4 border border-blue-500/30 hover:border-blue-400/50 transition-colors text-center w-full"
            >
              <FontAwesomeIcon icon={faEdit} className="text-blue-400 text-2xl mb-2" />
              <h4 className="text-white font-semibold text-sm">Event Builder</h4>
              <p className="text-blue-200 text-xs">Create & manage events</p>
            </button>

            <button
              onClick={() => window.location.href = '/floorplan'}
              className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-lg p-4 border border-green-500/30 hover:border-green-400/50 transition-colors text-center w-full"
            >
              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-green-400 text-2xl mb-2" />
              <h4 className="text-white font-semibold text-sm">Floorplan Designer</h4>
              <p className="text-green-200 text-xs">Design event layout</p>
            </button>

            <a
              href="/checkin"
              className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 rounded-lg p-4 border border-emerald-500/30 hover:border-emerald-400/50 transition-colors text-center"
            >
              <FontAwesomeIcon icon={faUserCheck} className="text-emerald-400 text-2xl mb-2" />
              <h4 className="text-white font-semibold text-sm">Check-in System</h4>
              <p className="text-emerald-200 text-xs">{stats.todayCheckIns} today</p>
            </a>

            <a
              href="/print"
              className="bg-gradient-to-br from-slate-600/20 to-slate-800/20 rounded-lg p-4 border border-slate-500/30 hover:border-slate-400/50 transition-colors text-center"
            >
              <FontAwesomeIcon icon={faPrint} className="text-slate-400 text-2xl mb-2" />
              <h4 className="text-white font-semibold text-sm">Print Station</h4>
              <p className="text-slate-200 text-xs">{stats.badgesPrinted} printed</p>
            </a>
          </div>
        </div>

        {/* Enhanced Attendee Tracking Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Today's Statistics */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendar} className="text-orange-400" />
              Today's Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUserCheck} className="text-green-400" />
                  <span className="text-white font-medium">Check-ins Today</span>
                </div>
                <span className="text-green-400 font-bold">{currentDayStats.checkIns}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUserCheck} className="text-red-400" />
                  <span className="text-white font-medium">Check-outs Today</span>
                </div>
                <span className="text-red-400 font-bold">{currentDayStats.checkOuts}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} className="text-blue-400" />
                  <span className="text-white font-medium">Unique Attendees</span>
                </div>
                <span className="text-blue-400 font-bold">{currentDayStats.uniqueAttendees}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faTrophy} className="text-purple-400" />
                  <span className="text-white font-medium">Total for Today</span>
                </div>
                <span className="text-purple-400 font-bold">{currentDayStats.totalAttendees}</span>
              </div>
            </div>
          </div>

          {/* Daily Attendee Overview */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faChartBar} className="text-cyan-400" />
              Daily Attendee Counts
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {dailyStats.length > 0 ? (
                dailyStats.slice(0, 7).map((day: any) => (
                  <div key={day.date} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${day.date === currentDayStats.date ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      <span className="text-white text-sm">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{day.totalAttendees}</div>
                      <div className="text-gray-400 text-xs">{day.uniqueAttendees} unique</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <FontAwesomeIcon icon={faCalendar} className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No daily data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Updates */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faClock} className="text-green-400" />
              Real-time Updates
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {realTimeUpdates.length > 0 ? (
                realTimeUpdates.map((update: any) => (
                  <div key={update.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                    <div className={`w-2 h-2 rounded-full bg-${update.color}-400`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{update.title}</p>
                      <p className="text-gray-400 text-xs">{update.timestamp}</p>
                    </div>
                    <span className="text-xs bg-gray-600/50 text-gray-300 px-2 py-1 rounded-full">
                      {update.category}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <FontAwesomeIcon icon={faClock} className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent updates</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faClock} className="text-blue-400" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className={`w-3 h-3 rounded-full bg-${activity.color}-400`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{activity.title}</p>
                      <p className="text-gray-400 text-xs">{activity.subtitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-xs">{activity.timestamp}</p>
                      <span className="text-xs bg-gray-600/50 text-gray-300 px-2 py-1 rounded-full">
                        {activity.category}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <FontAwesomeIcon icon={faClock} className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* System Overview */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faChartBar} className="text-green-400" />
              System Overview
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} className="text-blue-400" />
                  <span className="text-white font-medium">User Engagement</span>
                </div>
                <span className="text-blue-400 font-bold">
                  {stats.totalUsers > 0 ? Math.round((stats.totalCheckIns / stats.totalUsers) * 100) : 0}%
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faBrain} className="text-purple-400" />
                  <span className="text-white font-medium">Match Quality</span>
                </div>
                <span className="text-purple-400 font-bold">{stats.averageMatchScore}/1.0</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faTrophy} className="text-green-400" />
                  <span className="text-white font-medium">Lead Conversion</span>
                </div>
                <span className="text-green-400 font-bold">{stats.conversionRate}%</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faPrint} className="text-yellow-400" />
                  <span className="text-white font-medium">Badge Efficiency</span>
                </div>
                <span className="text-yellow-400 font-bold">
                  {stats.totalAttendees > 0 ? Math.round((stats.badgesPrinted / stats.totalAttendees) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Export and Actions */}
        <div className="mt-6 bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Export & Reports</h3>
              <p className="text-gray-400 text-sm">Generate comprehensive reports and export data for analysis</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportComprehensiveReport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                Export Full Report
              </button>
              <button
                onClick={() => {
                  // Refresh all data
                  window.location.reload();
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faRefresh} className="w-4 h-4" />
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
