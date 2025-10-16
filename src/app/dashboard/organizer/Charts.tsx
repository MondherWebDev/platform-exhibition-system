"use client";
import React from "react";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface ChartData {
  id: string;
  category?: string;
  [key: string]: any;
}

interface AttendanceChartProps {
  data: Record<string, number>;
}

interface CategoryPieChartProps {
  attendees: any[];
}

interface EventAnalyticsProps {
  eventStats: {
    totalRegistrations: number;
    totalCheckIns: number;
    totalCheckOuts: number;
    totalLeads: number;
    currentAttendees: number;
  };
  dailyStats: Array<{
    date: string;
    registrations: number;
    checkIns: number;
    checkOuts: number;
    leads: number;
    currentAttendees: number;
  }>;
  leadsByExhibitor: Array<{
    exhibitorName: string;
    leadCount: number;
  }>;
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  const categories = Object.keys(data);
  const counts = Object.values(data);

  const chartData = {
    labels: categories,
    datasets: [
      {
        label: "Attendees",
        data: counts,
        backgroundColor: "rgba(13, 110, 253, 0.6)",
        borderColor: "rgba(13, 110, 253, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Attendance by Category",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#ffffff",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
      x: {
        ticks: {
          color: "#ffffff",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
  };

  return (
    <div className="bg-[#232b3e]/60 rounded-xl p-4 shadow mb-6 border border-white/10">
      <Bar data={chartData} options={options} />
    </div>
  );
}

export function CategoryPieChart({ attendees }: CategoryPieChartProps) {
  const categories = Array.from(new Set(attendees.map((a: any) => a.category).filter((cat): cat is string => Boolean(cat))));
  const counts = categories.map((cat: string) => attendees.filter((a: any) => a.category === cat).length);

  const chartData = {
    labels: categories,
    datasets: [
      {
        data: counts,
        backgroundColor: [
          "#0d6efd",
          "#fd7e14",
          "#198754",
          "#dc3545",
          "#ffc107",
          "#0dcaf0",
          "#6f42c1",
        ],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#ffffff",
          padding: 20,
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: "Category Distribution",
        color: "#ffffff",
      },
    },
  };

  return (
    <div className="bg-[#232b3e]/60 rounded-xl p-4 shadow mb-6 border border-white/10">
      <Pie data={chartData} options={options} />
    </div>
  );
}

export function EventAnalyticsChart({ eventStats, dailyStats, leadsByExhibitor }: EventAnalyticsProps) {
  // Daily attendance trend chart (Bar chart only)
  const dailyTrendData = {
    labels: dailyStats.map(stat => new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: "Registrations",
        data: dailyStats.map(stat => stat.registrations),
        backgroundColor: "rgba(13, 110, 253, 0.6)",
        borderColor: "rgba(13, 110, 253, 1)",
        borderWidth: 2,
      },
      {
        label: "Check-ins",
        data: dailyStats.map(stat => stat.checkIns),
        backgroundColor: "rgba(34, 197, 94, 0.6)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 2,
      },
      {
        label: "Check-outs",
        data: dailyStats.map(stat => stat.checkOuts),
        backgroundColor: "rgba(239, 68, 68, 0.6)",
        borderColor: "rgba(239, 68, 68, 1)",
        borderWidth: 2,
      },
    ],
  };

  const trendOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#ffffff",
          padding: 20,
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: "3-Day Event Analytics",
        color: "#ffffff",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#ffffff",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
      x: {
        ticks: {
          color: "#ffffff",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
  };

  // Leads by exhibitor chart
  const leadsData = {
    labels: leadsByExhibitor.map(item => item.exhibitorName),
    datasets: [
      {
        label: "Leads Generated",
        data: leadsByExhibitor.map(item => item.leadCount),
        backgroundColor: "rgba(245, 158, 11, 0.6)",
        borderColor: "rgba(245, 158, 11, 1)",
        borderWidth: 1,
      },
    ],
  };

  const leadsOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Leads by Exhibitor",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#ffffff",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
      x: {
        ticks: {
          color: "#ffffff",
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Daily Trend Chart */}
      <div className="bg-[#232b3e]/60 rounded-xl p-6 shadow border border-white/10">
        <Bar data={dailyTrendData} options={trendOptions} />
      </div>

      {/* Leads by Exhibitor Chart */}
      <div className="bg-[#232b3e]/60 rounded-xl p-6 shadow border border-white/10">
        <Bar data={leadsData} options={leadsOptions} />
      </div>
    </div>
  );
}

export function FootfallChart({ dailyStats }: { dailyStats: Array<{ date: string; currentAttendees: number; checkIns: number; checkOuts: number }> }) {
  const chartData = {
    labels: dailyStats.map(stat => new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: "Footfall (Check-ins - Check-outs)",
        data: dailyStats.map(stat => stat.currentAttendees),
        backgroundColor: "rgba(168, 85, 247, 0.6)",
        borderColor: "rgba(168, 85, 247, 1)",
        borderWidth: 2,
        fill: true,
      },
      {
        label: "Check-ins",
        data: dailyStats.map(stat => stat.checkIns),
        backgroundColor: "rgba(34, 197, 94, 0.4)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 2,
        type: 'line' as const,
      },
      {
        label: "Check-outs",
        data: dailyStats.map(stat => stat.checkOuts),
        backgroundColor: "rgba(239, 68, 68, 0.4)",
        borderColor: "rgba(239, 68, 68, 1)",
        borderWidth: 2,
        type: 'line' as const,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#ffffff",
          padding: 20,
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: "Footfall Analysis",
        color: "#ffffff",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#ffffff",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
      x: {
        ticks: {
          color: "#ffffff",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
  };

  return (
    <div className="bg-[#232b3e]/60 rounded-xl p-6 shadow border border-white/10">
      <Line data={chartData} options={options} />
    </div>
  );
}

export function LeadConversionChart({ leadsByExhibitor }: { leadsByExhibitor: Array<{ exhibitorName: string; leadCount: number }> }) {
  const chartData = {
    labels: leadsByExhibitor.map(item => item.exhibitorName),
    datasets: [
      {
        label: "Leads Generated",
        data: leadsByExhibitor.map(item => item.leadCount),
        backgroundColor: [
          "#f59e0b",
          "#10b981",
          "#8b5cf6",
          "#ef4444",
          "#06b6d4",
          "#84cc16",
          "#f97316",
        ],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#ffffff",
          padding: 20,
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: "Lead Generation by Exhibitor",
        color: "#ffffff",
      },
    },
  };

  return (
    <div className="bg-[#232b3e]/60 rounded-xl p-6 shadow border border-white/10">
      <Pie data={chartData} options={options} />
    </div>
  );
}
