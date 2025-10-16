"use client";
import React, { useState } from "react";
import GlassCard from "@/components/GlassCard";
// import { useRouter } from "next/navigation"; // for navigation after event activation

const SECTION_LIST = [
  { key: "agenda", label: "Agenda" },
  { key: "exhibitors", label: "Exhibitors" },
  { key: "hostedBuyers", label: "Hosted Buyers" },
  { key: "sponsors", label: "Sponsors" },
  { key: "floorplan", label: "Interactive Floorplan" },
];

const EventBuilder: React.FC = () => {
  // State for step navigation and data
  const [activeSection, setActiveSection] = useState<string>("agenda");
  const [isActivated, setIsActivated] = useState(false);

  // Placeholder states for the different event sections
  const [agenda, setAgenda] = useState<any[]>([]);
  const [exhibitors, setExhibitors] = useState<any[]>([]);
  const [hostedBuyers, setHostedBuyers] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [floorplan, setFloorplan] = useState<any>(null); // SVG/JSON

  // Switch rendering section
  const renderSection = () => {
    switch (activeSection) {
      case "agenda":
        return (
          <GlassCard>
            <h2 className="text-xl font-semibold mb-2">Agenda</h2>
            {/* Agenda form & list goes here */}
            <p className="text-sm text-gray-200">Add sessions, times, locations, and speakers.</p>
          </GlassCard>
        );
      case "exhibitors":
        return (
          <GlassCard>
            <h2 className="text-xl font-semibold mb-2">Exhibitors</h2>
            {/* Exhibitor add/list UI */}
            <p className="text-sm text-gray-200">Add exhibitors with company details and booth assignment.</p>
          </GlassCard>
        );
      case "hostedBuyers":
        return (
          <GlassCard>
            <h2 className="text-xl font-semibold mb-2">Hosted Buyers</h2>
            {/* Hosted Buyers add/list UI */}
            <p className="text-sm text-gray-200">Add hosted buyers and allocate benefits.</p>
          </GlassCard>
        );
      case "sponsors":
        return (
          <GlassCard>
            <h2 className="text-xl font-semibold mb-2">Sponsors</h2>
            {/* Sponsor add/list UI */}
            <p className="text-sm text-gray-200">Highlight and manage event sponsors.</p>
          </GlassCard>
        );
      case "floorplan":
        return (
          <GlassCard>
            <h2 className="text-xl font-semibold mb-2">Interactive Floorplan</h2>
            {/* Floorplan builder placeholder */}
            <p className="text-sm text-gray-200 mb-2">Upload, draw, or edit event floorplan. Assign booths to exhibitors interactively.</p>
            <div className="w-full h-48 flex items-center justify-center bg-glass rounded-lg border border-white/20">
              {/* Floorplan SVG upload/draw canvas placeholder */}
              <span className="opacity-60">[Floorplan Builder Coming Soon]</span>
            </div>
          </GlassCard>
        );
      default:
        return null;
    }
  };

  const handleActivateEvent = () => {
    // TODO: Implement submission to Firestore, validation, then activate event
    setIsActivated(true);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Event Website Builder</h1>
      {/* Sections navigation */}
      <nav className="flex gap-2 flex-wrap justify-center mb-6">
        {SECTION_LIST.map(({ key, label }) => (
          <button
            key={key}
            className={`px-4 py-2 rounded transition font-medium backdrop-blur-lg bg-gradient-to-tr from-white/20 to-white/5 border border-white/20 shadow-lg text-white/90 ${
              activeSection === key ? "ring-2 ring-cyan-400" : "hover:bg-white/10"
            }`}
            onClick={() => setActiveSection(key)}
            aria-current={activeSection === key ? "page" : undefined}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="mb-8">{renderSection()}</div>
      <div className="flex justify-end gap-4 mt-6">
        <button
          className="px-6 py-2 rounded-lg bg-gradient-to-t from-cyan-900 to-cyan-600 shadow-md text-white font-bold border border-white/10 hover:scale-105 transition"
          onClick={handleActivateEvent}
          disabled={isActivated}
        >
          {isActivated ? "Event Activated" : "Activate & Publish Event"}
        </button>
      </div>
    </div>
  );
};

export default EventBuilder;
